import { adminDb } from "@/lib/firebase/admin";
import { submitVideoGeneration, checkVideoGenerationStatus, downloadGeneratedVideo } from "@/lib/providers/video-generation";
import { uploadVideoToR2 } from "@/lib/storage/r2";
import { computeVideoCreditsCharged, debitCredits } from "@/lib/credits";
import type { AiModel, PlatformSettings, VideoJob } from "@/types";

const NOMINAL_VIDEO_DURATION_SECONDS = 8;

export async function resolveVideoModel(modelId: string): Promise<AiModel | null> {
  const snap = await adminDb.collection("models").where("id", "==", modelId).limit(1).get();
  if (snap.empty) return null;
  const model = snap.docs[0].data() as AiModel;
  if (!model.enabled || model.modality !== "video") return null;
  return model;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
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

export async function createVideoJob(params: {
  uid: string;
  apiKeyId: string;
  model: AiModel;
  modelId: string;
  prompt: string;
}): Promise<VideoJob> {
  const ref = adminDb.collection("videoJobs").doc();
  const now = Date.now();

  const baseJob: VideoJob = {
    id: ref.id,
    uid: params.uid,
    apiKeyId: params.apiKeyId,
    model: params.modelId,
    provider: params.model.provider,
    prompt: params.prompt,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(baseJob);

  try {
    const { operationName } = await submitVideoGeneration({ model: params.modelId, prompt: params.prompt });
    await ref.update({ status: "processing", providerOperationId: operationName, updatedAt: Date.now() });
    return { ...baseJob, status: "processing", providerOperationId: operationName };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de la soumission";
    await ref.update({ status: "failed", errorMessage, updatedAt: Date.now() });
    return { ...baseJob, status: "failed", errorMessage };
  }
}

export async function advanceVideoJob(jobId: string, uid: string): Promise<VideoJob> {
  const ref = adminDb.collection("videoJobs").doc(jobId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Job introuvable");
  const job = snap.data() as VideoJob;

  if (job.uid !== uid) throw new Error("Accès refusé à ce job");
  if (job.status === "ready" || job.status === "failed") return job;
  if (!job.providerOperationId) return job;

  const statusResult = await checkVideoGenerationStatus(job.providerOperationId);

  if (!statusResult.done) {
    await ref.update({ updatedAt: Date.now() });
    return job;
  }

  if (statusResult.errorMessage || !statusResult.videoUri) {
    const errorMessage = statusResult.errorMessage ?? "Échec de la génération vidéo";
    await ref.update({ status: "failed", errorMessage, updatedAt: Date.now() });
    return { ...job, status: "failed", errorMessage };
  }

  const videoBuffer = await downloadGeneratedVideo(statusResult.videoUri);
  const r2Key = `videos/${uid}/${jobId}.mp4`;
  const videoUrl = await uploadVideoToR2({ buffer: videoBuffer, contentType: "video/mp4", key: r2Key });

  const model = await resolveVideoModel(job.model);
  const settings = await getPlatformSettings();
  const durationSeconds = NOMINAL_VIDEO_DURATION_SECONDS;
  const creditsCharged = model
    ? computeVideoCreditsCharged({ model, durationSeconds, creditToUsdRate: settings.creditToUsdRate })
    : 0;

  if (creditsCharged > 0) {
    await debitCredits(uid, creditsCharged, `Génération vidéo — ${job.model}`);
  }

  await adminDb.collection("usageLogs").add({
    uid,
    apiKeyId: job.apiKeyId,
    model: job.model,
    provider: job.provider,
    inputTokens: 0,
    outputTokens: 0,
    creditsCharged,
    status: "success",
    createdAt: Date.now(),
    latencyMs: Date.now() - job.createdAt,
  });

  await ref.update({
    status: "ready",
    videoUrl,
    durationSeconds,
    creditsCharged,
    updatedAt: Date.now(),
  });

  return { ...job, status: "ready", videoUrl, durationSeconds, creditsCharged };
}