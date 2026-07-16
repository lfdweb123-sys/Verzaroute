/**
 * Registre central des fournisseurs IA.
 * Ajouter un nouveau fournisseur = ajouter une entrée ici (+ le modèle dans Firestore `models`).
 */
import type { AiProviderAdapter } from "./types";
import type { ProviderId } from "@/types";
import { createOpenAiCompatibleAdapter } from "./openai-compatible";
import { createAnthropicAdapter } from "./anthropic";
import { createGoogleAdapter } from "./google";

export * from "./types";

let cache: Partial<Record<ProviderId, AiProviderAdapter>> | null = null;

function buildRegistry(): Record<ProviderId, AiProviderAdapter> {
  return {
    openai: createOpenAiCompatibleAdapter({
      id: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
    }),
    anthropic: createAnthropicAdapter(process.env.ANTHROPIC_API_KEY),
    google: createGoogleAdapter(process.env.GOOGLE_AI_API_KEY),
    xai: createOpenAiCompatibleAdapter({
      id: "xai",
      baseUrl: "https://api.x.ai/v1",
      apiKey: process.env.XAI_API_KEY,
    }),
    deepseek: createOpenAiCompatibleAdapter({
      id: "deepseek",
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: process.env.DEEPSEEK_API_KEY,
    }),
    mistral: createOpenAiCompatibleAdapter({
      id: "mistral",
      baseUrl: "https://api.mistral.ai/v1",
      apiKey: process.env.MISTRAL_API_KEY,
    }),
    moonshot: createOpenAiCompatibleAdapter({
      id: "moonshot",
      baseUrl: "https://api.moonshot.ai/v1", // Kimi (Moonshot AI) — .ai est le domaine actuel, .cn est obsolète
      apiKey: process.env.MOONSHOT_API_KEY,
    }),
    minimax: createOpenAiCompatibleAdapter({
      id: "minimax",
      baseUrl: "https://api.minimax.chat/v1",
      apiKey: process.env.MINIMAX_API_KEY,
    }),
    zai: createOpenAiCompatibleAdapter({
      id: "zai",
      baseUrl: "https://api.z.ai/api/paas/v4", // Z.ai (GLM)
      apiKey: process.env.ZAI_API_KEY,
    }),
    stepfun: createOpenAiCompatibleAdapter({
      id: "stepfun",
      baseUrl: "https://api.stepfun.com/v1",
      apiKey: process.env.STEPFUN_API_KEY,
    }),
    // Meta ne propose pas d'API publique officielle pour Llama — on passe par Together AI,
    // hébergeur tiers compatible OpenAI, largement utilisé pour servir les modèles Llama.
    meta: createOpenAiCompatibleAdapter({
      id: "meta",
      baseUrl: "https://api.together.xyz/v1",
      apiKey: process.env.META_API_KEY,
    }),
  };
}

export function getProviderAdapter(provider: ProviderId): AiProviderAdapter {
  if (!cache) cache = buildRegistry();
  const adapter = cache[provider];
  if (!adapter) throw new Error(`Fournisseur inconnu ou non configuré: ${provider}`);
  return adapter;
}