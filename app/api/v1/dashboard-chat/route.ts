/**
 * Endpoint de chat pour l'interface du dashboard (/dashboard/chat).
 * Authentifie via le cookie de session (utilisateur connecté), pas via une clé API vzr_sk_.
 * Réutilise la même logique de résolution de modèle, débit de crédits et journalisation
 * que /api/v1/chat/completions, mais sans exiger que l'utilisateur génère/colle une clé.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getProviderAdapter } from "@/lib/providers";
import { computeCreditsCharged, debitCredits } from "@/lib/credits";
import type { AiModel, PlatformSettings } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function resolveModel(modelId: string): Promise<AiModel | null> {
  const snap = await adminDb.collection("models").where("id", "==", modelId).limit(1).get();
  if (snap.empty) return null;
  const model = snap.docs[0].data() as AiModel;
  if (!model.enabled) return null;
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
  const { model: modelId, messages } = body;

  if (!modelId || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Les champs 'model' et 'messages' sont requis" }, { status: 400 });
  }

  const payloadSize = JSON.stringify(messages).length;
  const MAX_PAYLOAD_BYTES = 15 * 1024 * 1024;
  if (payloadSize > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: "Le(s) fichier(s) joint(s) sont trop volumineux. Réduis la taille ou le nombre de fichiers." },
      { status: 413 }
    );
  }

  const model = await resolveModel(modelId);
  if (!model) {
    return NextResponse.json({ error: `Modèle inconnu ou désactivé: ${modelId}` }, { status: 400 });
  }

  const userSnap = await adminDb.collection("users").doc(uid).get();
  const balance = userSnap.data()?.creditsBalance ?? 0;
  if (balance <= 0) {
    return NextResponse.json({ error: "Solde de crédits insuffisant", type: "insufficient_credits" }, { status: 402 });
  }

  const settings = await getPlatformSettings();
  const adapter = getProviderAdapter(model.provider);
  const startedAt = Date.now();

  try {
    const result = await adapter.chat({
      model: modelId,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const creditsCharged = computeCreditsCharged({
      model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      creditToUsdRate: settings.creditToUsdRate,
    });

    try {
      await debitCredits(uid, creditsCharged, `Chat dashboard — ${model.displayName}`);
    } catch (e) {
      if (e instanceof Error && e.message === "INSUFFICIENT_CREDITS") {
        return NextResponse.json({ error: "Solde de crédits insuffisant", type: "insufficient_credits" }, { status: 402 });
      }
      throw e;
    }

    await adminDb.collection("usageLogs").add({
      uid,
      apiKeyId: "dashboard-chat",
      model: modelId,
      provider: model.provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      creditsCharged,
      status: "success",
      createdAt: Date.now(),
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      content: result.content,
      creditsCharged,
      usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
    });
  } catch (error) {
    await adminDb.collection("usageLogs").add({
      uid,
      apiKeyId: "dashboard-chat",
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