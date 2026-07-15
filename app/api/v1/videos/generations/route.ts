import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { hashApiKey, isValidKeyFormat } from "@/lib/apikey";
import { resolveVideoModel, createVideoJob } from "@/lib/videoJobs";
import type { ApiKeyRecord } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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
    return NextResponse.json({ error: { message: "Clé API invalide", type: "authentication_error" } }, { status: 401 });
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

export async function POST(req: NextRequest) {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) return authResult;
  const { uid, apiKeyId } = authResult;

  let body: { model?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: "Corps JSON invalide" } }, { status: 400 });
  }

  if (!body.model || !body.prompt) {
    return NextResponse.json({ error: { message: "Les champs 'model' et 'prompt' sont requis" } }, { status: 400 });
  }

  const model = await resolveVideoModel(body.model);
  if (!model) {
    return NextResponse.json(
      { error: { message: `Modèle de génération vidéo inconnu ou désactivé: ${body.model}` } },
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

  const job = await createVideoJob({ uid, apiKeyId, model, modelId: body.model, prompt: body.prompt });

  if (job.status === "failed") {
    return NextResponse.json(
      { error: { message: job.errorMessage ?? "Échec de la soumission", type: "provider_error" } },
      { status: 502 }
    );
  }

  return NextResponse.json({ job_id: job.id, status: job.status });
}