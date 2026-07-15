import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { hashApiKey, isValidKeyFormat } from "@/lib/apikey";
import { advanceVideoJob } from "@/lib/videoJobs";
import type { ApiKeyRecord } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function authenticate(req: NextRequest): Promise<{ uid: string } | NextResponse> {
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

  return { uid: keyDoc.uid };
}

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const job = await advanceVideoJob(params.jobId, authResult.uid);
    return NextResponse.json({
      job_id: job.id,
      status: job.status,
      video_url: job.videoUrl ?? null,
      duration_seconds: job.durationSeconds ?? null,
      credits_charged: job.creditsCharged ?? null,
      error: job.errorMessage ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Job introuvable" } },
      { status: 404 }
    );
  }
}