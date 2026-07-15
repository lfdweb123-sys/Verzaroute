/**
 * Endpoint proxy principal — LE CŒUR DU ROUTEUR IA.
 * Compatible avec le format OpenAI "/chat/completions", ce qui permet à un utilisateur
 * de brancher n'importe quel SDK/outil déjà compatible OpenAI en changeant juste
 * la base URL (https://verzaroute.com/api/v1) et la clé API (vzr_sk_...).
 *
 * Flux :
 * 1. Authentifie la clé API (header Authorization: Bearer vzr_sk_...)
 * 2. Résout le modèle demandé -> fournisseur IA correspondant
 * 3. Vérifie que l'utilisateur a un solde de crédits suffisant (estimation)
 * 4. Appelle le fournisseur (stream ou non)
 * 5. Débite les crédits réellement consommés et journalise l'appel
 */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { hashApiKey, isValidKeyFormat } from "@/lib/apikey";
import { getProviderAdapter } from "@/lib/providers";
import { computeCreditsCharged, debitCredits } from "@/lib/credits";
import type { AiModel, ApiKeyRecord, PlatformSettings } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // Mise à jour asynchrone du dernier usage (non bloquant)
  snap.docs[0].ref.update({ lastUsedAt: Date.now() }).catch(() => {});

  return { uid: keyDoc.uid, apiKeyId: keyDoc.id };
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
    // valeurs par défaut si l'admin n'a pas encore configuré
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

  let body: { model?: string; messages?: unknown; stream?: boolean; temperature?: number; max_tokens?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: "Corps JSON invalide" } }, { status: 400 });
  }

  if (!body.model || !Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: { message: "Les champs 'model' et 'messages' sont requis" } },
      { status: 400 }
    );
  }

  const model = await resolveModel(body.model);
  if (!model) {
    return NextResponse.json(
      { error: { message: `Modèle inconnu ou désactivé: ${body.model}` } },
      { status: 400 }
    );
  }

  // Vérification rapide du solde (estimation optimiste avant appel réel)
  const userSnap = await adminDb.collection("users").doc(uid).get();
  const balance = userSnap.data()?.creditsBalance ?? 0;
  if (balance <= 0) {
    return NextResponse.json(
      { error: { message: "Solde de crédits insuffisant", type: "insufficient_credits" } },
      { status: 402 }
    );
  }

  const settings = await getPlatformSettings();
  const adapter = getProviderAdapter(model.provider);
  const startedAt = Date.now();

  try {
    if (body.stream) {
      // Mode streaming : on relaie le flux tel quel au client (le débit précis se fait après coup
      // via un endpoint de callback, ou en estimant les tokens de sortie côté proxy si besoin).
      const stream = await adapter.chatStream({
        model: body.model,
        messages: body.messages as never,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        stream: true,
      });
      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const result = await adapter.chat({
      model: body.model,
      messages: body.messages as never,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
    });

    const creditsCharged = computeCreditsCharged({
      model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      creditToUsdRate: settings.creditToUsdRate,
    });

    try {
      await debitCredits(uid, creditsCharged, `Appel ${model.displayName} (${body.model})`);
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
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      creditsCharged,
      status: "success",
      createdAt: Date.now(),
      latencyMs: Date.now() - startedAt,
    });

    // Réponse au format compatible OpenAI
    return NextResponse.json({
      id: `chatcmpl_${apiKeyId}_${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: result.content },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: result.inputTokens,
        completion_tokens: result.outputTokens,
        total_tokens: result.inputTokens + result.outputTokens,
      },
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
