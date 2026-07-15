export interface VideoGenerationSubmitResult {
  operationName: string;
}

export interface VideoGenerationStatusResult {
  done: boolean;
  videoUri?: string;
  errorMessage?: string;
}

export async function submitVideoGeneration(params: {
  model: string;
  prompt: string;
}): Promise<VideoGenerationSubmitResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('Clé API manquante pour le fournisseur "google"');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:predictLongRunning?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: params.prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`[google-video] Erreur soumission (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const operationName = data?.name;
  if (!operationName) throw new Error("[google-video] Réponse inattendue : nom d'opération manquant");

  return { operationName };
}

export async function checkVideoGenerationStatus(operationName: string): Promise<VideoGenerationStatusResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('Clé API manquante pour le fournisseur "google"');

  const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`[google-video] Erreur vérification statut (${res.status}): ${errText}`);
  }

  const data = await res.json();

  if (data.error) {
    return { done: true, errorMessage: data.error.message ?? "Erreur inconnue côté fournisseur" };
  }

  if (!data.done) {
    return { done: false };
  }

  const videoUri = data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!videoUri) {
    return { done: true, errorMessage: "Opération terminée mais aucune vidéo trouvée dans la réponse" };
  }

  return { done: true, videoUri };
}

export async function downloadGeneratedVideo(videoUri: string): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  const separator = videoUri.includes("?") ? "&" : "?";
  const res = await fetch(`${videoUri}${separator}key=${apiKey}`);
  if (!res.ok) throw new Error(`[google-video] Échec du téléchargement de la vidéo (${res.status})`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}