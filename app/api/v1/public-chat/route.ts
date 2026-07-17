/**
 * Endpoint de chat PUBLIC, sans authentification — utilisé par /essai-gratuit.
 * N'accepte QUE les modèles marqués isFreeTier: true dans Firestore (ex: Mistral
 * Large, MiniMax M2). Aucun débit de crédits (gratuit par définition), mais une
 * limite anti-abus par IP est appliquée puisque cet endpoint est ouvert à tous
 * sans compte, sinon rien n'empêcherait un usage massif automatisé.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getProviderAdapter } from "@/lib/providers";
import type { AiModel } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUESTS_PER_IP_PER_DAY = 20;

async function resolveFreeModel(modelId: string): Promise<AiModel | null> {
  const snap = await adminDb.collection("models").where("id", "==", modelId).limit(1).get();
  if (snap.empty) return null;
  const model = snap.docs[0].data() as AiModel;
  if (!model.enabled || !model.isFreeTier) return null;
  return model;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

/** Vérifie et incrémente le compteur de requêtes de cette IP pour la journée en cours. */
async function checkAndIncrementRateLimit(ip: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10); // ex: "2026-07-17"
  const ref = adminDb.collection("publicChatRateLimits").doc(`${ip}_${today}`);

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? (snap.data()?.count ?? 0) : 0;
    if (count >= MAX_REQUESTS_PER_IP_PER_DAY) return false;
    tx.set(ref, { ip, date: today, count: count + 1, updatedAt: Date.now() }, { merge: true });
    return true;
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { model: modelId, messages } = body;

  if (!modelId || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Les champs 'model' et 'messages' sont requis" }, { status: 400 });
  }

  // Limite de taille raisonnable pour l'essai gratuit — relevée pour permettre les
  // pièces jointes (image/document en base64), qui dépassent très vite quelques
  // dizaines de Ko même pour un seul fichier compressé.
  const payloadSize = JSON.stringify(messages).length;
  if (payloadSize > 6_000_000) {
    return NextResponse.json(
      { error: "Message ou pièce jointe trop volumineux pour l'essai gratuit. Crée un compte pour un usage complet." },
      { status: 413 }
    );
  }

  const model = await resolveFreeModel(modelId);
  if (!model) {
    return NextResponse.json(
      {
        error: "Ce modèle n'est pas disponible en essai gratuit. Crée un compte pour y accéder.",
        type: "requires_account",
      },
      { status: 403 }
    );
  }

  const ip = getClientIp(req);
  const allowed = await checkAndIncrementRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      {
        error: `Limite quotidienne d'essai gratuit atteinte (${MAX_REQUESTS_PER_IP_PER_DAY} messages/jour). Crée un compte pour continuer sans limite.`,
        type: "rate_limited",
      },
      { status: 429 }
    );
  }

  const adapter = getProviderAdapter(model.provider);
  const startedAt = Date.now();

  try {
    const result = await adapter.chat({
      model: model.apiModelId ?? modelId,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    await adminDb.collection("usageLogs").add({
      uid: "anonymous",
      apiKeyId: "public-essai-gratuit",
      model: modelId,
      provider: model.provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      creditsCharged: 0,
      status: "success",
      createdAt: Date.now(),
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json({ content: result.content });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur du fournisseur IA" },
      { status: 502 }
    );
  }
}