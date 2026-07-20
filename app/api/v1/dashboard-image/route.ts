/**
 * Endpoint de génération d'image pour le dashboard (/dashboard/images).
 * Authentifie via le cookie de session, débite les crédits au forfait par image
 * (pas au token, contrairement au chat), et journalise l'appel.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { generateImage } from "@/lib/providers/image-generation";
import { computeImageCreditsCharged, debitCredits } from "@/lib/credits";
import type { AiModel, PlatformSettings } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function getCurrentUid(): Promise<string | null> {
  const session = cookies().get("session")?.value;
  if (!session) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

async function resolveImageModel(modelId: string): Promise<AiModel | null> {
  const snap = await adminDb.collection("models").where("id", "==", modelId).limit(1).get();
  if (snap.empty) return null;
  const model = snap.docs[0].data() as AiModel;
  if (!model.enabled || model.modality !== "image") return null;
  return model;
}

async function getPlatformSettings(): Promise<PlatformSettings> {
  const snap = await adminDb.collection("settings").doc("platform").get();
  if (!snap.exists) {
    return {
      creditToUsdRate: 0.001,
      fcfaToUsdRate: 610,
      minPurchaseFcfa: 1000,
      theme: {
        primaryColor: "#D4AF37",
        primaryColorDark: "#C9A227",
        backgroundColor: "#0a0a0a",
        surfaceColor: "#121212",
        accentColor: "#F0D878",
        updatedAt: Date.now(),
        updatedBy: "system",
      },
    };
  }
  return snap.data() as PlatformSettings;
}

export async function POST(req: NextRequest) {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { model: modelId, prompt, size } = body;

  if (!modelId || !prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Les champs 'model' et 'prompt' sont requis" }, { status: 400 });
  }

  const model = await resolveImageModel(modelId);
  if (!model) {
    return NextResponse.json({ error: `Modèle de génération d'image inconnu ou désactivé: ${modelId}` }, { status: 400 });
  }

  const userSnap = await adminDb.collection("users").doc(uid).get();
  const balance = userSnap.data()?.creditsBalance ?? 0;
  if (balance <= 0) {
    return NextResponse.json({ error: "Solde de crédits insuffisant", type: "insufficient_credits" }, { status: 402 });
  }

  const settings = await getPlatformSettings();
  const startedAt = Date.now();

  try {
    const result = await generateImage(model.provider, { model: model.apiModelId ?? modelId, prompt, size });

    const creditsCharged = computeImageCreditsCharged({ model, creditToUsdRate: settings.creditToUsdRate });

    try {
      await debitCredits(uid, creditsCharged, `Génération d'image — ${model.displayName}`);
    } catch (e) {
      if (e instanceof Error && e.message === "INSUFFICIENT_CREDITS") {
        return NextResponse.json({ error: "Solde de crédits insuffisant", type: "insufficient_credits" }, { status: 402 });
      }
      throw e;
    }

    await adminDb.collection("usageLogs").add({
      uid,
      apiKeyId: "dashboard-image",
      model: modelId,
      provider: model.provider,
      inputTokens: 0,
      outputTokens: 0,
      creditsCharged,
      status: "success",
      createdAt: Date.now(),
      latencyMs: Date.now() - startedAt,
    });

    const imageDocRef = await adminDb.collection("imageGenerations").add({
      uid,
      model: modelId,
      prompt,
      base64: result.base64,
      mimeType: result.mimeType,
      size: size ?? "1024x1024",
      creditsCharged,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      imageId: imageDocRef.id,
      base64: result.base64,
      mimeType: result.mimeType,
      creditsCharged,
    });
  } catch (error) {
    await adminDb.collection("usageLogs").add({
      uid,
      apiKeyId: "dashboard-image",
      model: modelId,
      provider: model.provider,
      inputTokens: 0,
      outputTokens: 0,
      creditsCharged: 0,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Erreur inconnue",
      createdAt: Date.now(),
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur du fournisseur IA" },
      { status: 502 }
    );
  }
}