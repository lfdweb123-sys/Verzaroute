import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { hashApiKey, isValidKeyFormat } from "@/lib/apikey";
import { generateImage } from "@/lib/providers/image-generation";
import { computeImageCreditsCharged, debitCredits } from "@/lib/credits";
import type { AiModel, ApiKeyRecord, PlatformSettings } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function authenticate(req: NextRequest): Promise<{ uid: string; apiKeyId: string } | NextResponse> {
  const authHeader = req.headers.get("authorization");
  const key = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!key || !isValidKeyFormat(key)) {
    return NextResponse.json(
      { error: { message: "Clé API manquante ou invalide", type: "authentication_error" } },
      { status: 401 }
    );
  }

  const hash = hashApiKey(key);
  const snap = await adminDb.collection("apiKeys").where("hash", "==", hash).limit(1).get();
  if (snap.empty) {
    return NextResponse.json(
      { error: { message: "Clé API invalide", type: "authentication_error" } },
      { status: 401 }
    );
  }

  const keyDoc = snap.docs[0].data() as ApiKeyRecord;
  if (keyDoc.revoked) {
    return NextResponse.json(
      { error: { message: "Cette clé API a été révoquée", type: "authentication_error" } },
      { status: 401 }
    );
  }

  snap.docs[0].ref.update({ lastUsedAt: Date.now() }).catch(() => {});

  return { uid: keyDoc.uid, apiKeyId: keyDoc.id };
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
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, apiKeyId } = authResult;

  let body: { model?: string; prompt?: string; size?: "1024x1024" | "1024x1792" | "1792x1024" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: "Corps JSON invalide" } }, { status: 400 });
  }

  if (!body.model || !body.prompt) {
    return NextResponse.json(
      { error: { message: "Les champs 'model' et 'prompt' sont requis" } },
      { status: 400 }
    );
  }

  const model = await resolveImageModel(body.model);
  if (!model) {
    return NextResponse.json(
      { error: { message: `Modèle de génération d'image inconnu ou désactivé: ${body.model}` } },
      { status: 400 }
    );
  }

  const userSnap = await adminDb.collection("users").doc(uid).get();
  const balance = userSnap.data()?.creditsBalance ?? 0;
  if (balance <= 0) {
    return NextResponse.json(
      { error: { message: "Solde de crédits insuffisant", type: "insufficient_credits" } },
      { status: 402 }
    );
  }

  const settings = await getPlatformSettings();
  const startedAt = Date.now();

  try {
const result = await generateImage(model.provider, {
      model: model.apiModelId ?? body.model,
      prompt: body.prompt,
      size: body.size,
    });

    const creditsCharged = computeImageCreditsCharged({ model, creditToUsdRate: settings.creditToUsdRate });

    try {
      await debitCredits(uid, creditsCharged, `Génération d'image API (${body.model})`);
    } catch (e) {
      if (e instanceof Error && e.message === "INSUFFICIENT_CREDITS") {
        return NextResponse.json(
          { error: { message: "Solde de crédits insuffisant", type: "insufficient_credits" } },
          { status: 402 }
        );
      }
      throw e;
    }

    await adminDb.collection("usageLogs").add({
      uid,
      apiKeyId,
      model: body.model,
      provider: model.provider,
      inputTokens: 0,
      outputTokens: 0,
      creditsCharged,
      status: "success",
      createdAt: Date.now(),
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      created: Math.floor(Date.now() / 1000),
      data: [{ b64_json: result.base64 }],
      verzaroute: { credits_charged: creditsCharged },
    });
  } catch (error) {
    await adminDb.collection("usageLogs").add({
      uid,
      apiKeyId,
      model: body.model,
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
      { error: { message: error instanceof Error ? error.message : "Erreur interne", type: "provider_error" } },
      { status: 502 }
    );
  }
}