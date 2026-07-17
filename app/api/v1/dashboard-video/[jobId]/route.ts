/**
 * Vérification/avancement d'un job vidéo depuis le dashboard (session cookie).
 * Appelé en polling par le front toutes les quelques secondes jusqu'à status "ready"/"failed".
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { advanceVideoJob } from "@/lib/videoJobs";

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

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const job = await advanceVideoJob(params.jobId, uid);
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la vérification du job" },
      { status: 500 }
    );
  }
}

/** Supprime un job vidéo précis de l'historique. */
export async function DELETE(req: NextRequest, { params }: { params: { jobId: string } }) {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ref = adminDb.collection("videoJobs").doc(params.jobId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== uid) {
    return NextResponse.json({ error: "Job introuvable" }, { status: 404 });
  }

  await ref.delete();
  return NextResponse.json({ success: true });
}