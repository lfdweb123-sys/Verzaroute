/**
 * Création d'un job de génération vidéo depuis le dashboard (session cookie).
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { resolveVideoModel, createVideoJob } from "@/lib/videoJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

export async function POST(req: NextRequest) {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { model: modelId, prompt } = body;

  if (!modelId || !prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Les champs 'model' et 'prompt' sont requis" }, { status: 400 });
  }

  const model = await resolveVideoModel(modelId);
  if (!model) {
    return NextResponse.json({ error: `Modèle de génération vidéo inconnu ou désactivé: ${modelId}` }, { status: 400 });
  }

  const userSnap = await adminDb.collection("users").doc(uid).get();
  const balance = userSnap.data()?.creditsBalance ?? 0;
  if (balance <= 0) {
    return NextResponse.json({ error: "Solde de crédits insuffisant", type: "insufficient_credits" }, { status: 402 });
  }

  const job = await createVideoJob({ uid, apiKeyId: "dashboard-video", model, modelId, prompt });

  if (job.status === "failed") {
    return NextResponse.json({ error: job.errorMessage ?? "Échec de la soumission" }, { status: 502 });
  }

  return NextResponse.json({ job });
}

export async function GET() {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const snap = await adminDb
    .collection("videoJobs")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  return NextResponse.json({ jobs: snap.docs.map((d) => d.data()) });
}

/** Supprime TOUS les jobs vidéo de l'utilisateur. */
export async function DELETE() {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const snap = await adminDb.collection("videoJobs").where("uid", "==", uid).get();
  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  return NextResponse.json({ success: true, deleted: snap.size });
}