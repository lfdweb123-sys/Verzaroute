import type { ProviderId } from "@/types";

export interface ImageGenerationRequest {
  model: string;
  prompt: string;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
}

export interface ImageGenerationResult {
  base64: string;
  mimeType: string;
}

async function generateWithOpenAi(req: ImageGenerationRequest, apiKey: string | undefined): Promise<ImageGenerationResult> {
  if (!apiKey) throw new Error('Clé API manquante pour le fournisseur "openai"');
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      prompt: req.prompt,
      size: req.size ?? "1024x1024",
      n: 1,
      response_format: "b64_json",
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`[openai-image] Erreur API (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("[openai-image] Réponse inattendue : image manquante");
  return { base64: b64, mimeType: "image/png" };
}

async function generateWithGoogle(req: ImageGenerationRequest, apiKey: string | undefined): Promise<ImageGenerationResult> {
  if (!apiKey) throw new Error('Clé API manquante pour le fournisseur "google"');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:predict?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: req.prompt }],
      parameters: { sampleCount: 1 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`[google-image] Erreur API (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("[google-image] Réponse inattendue : image manquante");
  return { base64: b64, mimeType: "image/png" };
}

async function generateWithXai(req: ImageGenerationRequest, apiKey: string | undefined): Promise<ImageGenerationResult> {
  if (!apiKey) throw new Error('Clé API manquante pour le fournisseur "xai"');
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      prompt: req.prompt,
      n: 1,
      response_format: "b64_json",
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`[xai-image] Erreur API (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("[xai-image] Réponse inattendue : image manquante");
  return { base64: b64, mimeType: "image/png" };
}

export async function generateImage(provider: ProviderId, req: ImageGenerationRequest): Promise<ImageGenerationResult> {
  switch (provider) {
    case "openai":
      return generateWithOpenAi(req, process.env.OPENAI_API_KEY);
    case "google":
      return generateWithGoogle(req, process.env.GOOGLE_AI_API_KEY);
    case "xai":
      return generateWithXai(req, process.env.XAI_API_KEY);
    default:
      throw new Error(`La génération d'image n'est pas supportée pour le fournisseur "${provider}"`);
  }
}