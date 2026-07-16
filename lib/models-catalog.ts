/**
 * Catalogue de référence des modèles IA proposés par VerzaRoute.
 * Ces données sont utilisées pour SEEDER Firestore (collection `models`) au premier lancement,
 * et affichées sur la page d'accueil. La marge et l'activation sont ensuite pilotables
 * depuis le dashboard admin (/admin/dashboard/models), Firestore reste la source de vérité en prod.
 *
 * IMPORTANT : `apiModelId` est l'identifiant EXACT envoyé à l'API du fournisseur — il est
 * DIFFÉRENT de `id` (qui est un simple slug généré depuis displayName pour servir de clé
 * de document Firestore, ex: "Gemini 2.5 Flash" → "gemini-2-5-flash" avec des tirets).
 * Sans ce champ séparé, le slug était envoyé tel quel au fournisseur, ce qui cassait
 * systématiquement les appels (ex: "gemini-2-5-flash" au lieu de "gemini-2.5-flash").
 * Ces identifiants ont été vérifiés par recherche web (juillet 2026).
 */
import type { AiModel } from "@/types";

export const MODELS_CATALOG: Omit<AiModel, "id">[] = [
  {
    provider: "openai",
    displayName: "GPT-5",
    apiModelId: "gpt-5",
    description: "Le modèle phare d'OpenAI : raisonnement avancé, code, multimodal.",
    contextWindow: 256000,
    inputPricePerMTokUsd: 3,
    outputPricePerMTokUsd: 12,
    marginPercent: 20,
    enabled: true,
    tags: ["raisonnement", "code", "multimodal"],
  },
  {
    provider: "openai",
    displayName: "GPT-5 mini",
    apiModelId: "gpt-5-mini",
    description: "Version rapide et économique de GPT-5 pour un usage quotidien.",
    contextWindow: 128000,
    inputPricePerMTokUsd: 0.4,
    outputPricePerMTokUsd: 1.6,
    marginPercent: 20,
    enabled: true,
    tags: ["rapide", "économique"],
  },
  {
    provider: "anthropic",
    displayName: "Claude Sonnet 5",
    apiModelId: "claude-sonnet-4-6",
    description: "Excellent équilibre qualité/vitesse d'Anthropic, très fort en code et rédaction.",
    contextWindow: 200000,
    inputPricePerMTokUsd: 3,
    outputPricePerMTokUsd: 15,
    marginPercent: 20,
    enabled: true,
    tags: ["code", "rédaction", "raisonnement"],
  },
  {
    provider: "anthropic",
    displayName: "Claude Haiku 4.5",
    apiModelId: "claude-haiku-4-5-20251001",
    description: "Modèle Anthropic rapide et peu coûteux pour les tâches simples à grande échelle.",
    contextWindow: 200000,
    inputPricePerMTokUsd: 0.8,
    outputPricePerMTokUsd: 4,
    marginPercent: 20,
    enabled: true,
    tags: ["rapide", "économique"],
  },
  {
    // gemini-2.5-pro a un quota gratuit nul sur de nombreux projets (429, limit:0) et sera
    // déprécié le 16/10/2026. Remplacement officiel confirmé par Google : gemini-3.1-pro-preview.
    provider: "google",
    displayName: "Gemini 3.1 Pro",
    apiModelId: "gemini-3.1-pro-preview",
    description: "Modèle multimodal de Google, très grande fenêtre de contexte.",
    contextWindow: 1000000,
    inputPricePerMTokUsd: 1.25,
    outputPricePerMTokUsd: 5,
    marginPercent: 20,
    enabled: true,
    tags: ["multimodal", "long-contexte"],
  },
  {
    // gemini-2.5-flash n'est plus accessible aux nouveaux comptes/projets (confirmé sur le
    // forum officiel Google AI Developers, juillet 2026 — dépréciation anticipée avant la
    // date de fin de vie annoncée). Remplacement : gemini-2.5-flash-lite (accès non restreint).
    provider: "google",
    displayName: "Gemini 2.5 Flash Lite",
    apiModelId: "gemini-2.5-flash-lite",
    description: "Version rapide de Gemini, idéale pour les applications temps réel.",
    contextWindow: 1000000,
    inputPricePerMTokUsd: 0.1,
    outputPricePerMTokUsd: 0.4,
    marginPercent: 20,
    enabled: true,
    tags: ["rapide", "économique"],
  },
  {
    provider: "xai",
    displayName: "Grok 4",
    apiModelId: "grok-4",
    description: "Modèle de xAI, orienté raisonnement et actualité en temps réel.",
    contextWindow: 128000,
    inputPricePerMTokUsd: 3,
    outputPricePerMTokUsd: 15,
    marginPercent: 20,
    enabled: true,
    tags: ["raisonnement", "actualité"],
  },
  {
    provider: "deepseek",
    displayName: "DeepSeek V3",
    apiModelId: "deepseek-chat",
    description: "Modèle chinois open-weight très performant en code et mathématiques, coût réduit.",
    contextWindow: 128000,
    inputPricePerMTokUsd: 0.27,
    outputPricePerMTokUsd: 1.1,
    marginPercent: 25,
    enabled: true,
    tags: ["code", "mathématiques", "économique"],
  },
  {
    // Identifiant réel confirmé par recherche : "mistral-large-latest" (alias auto-mis à jour)
    provider: "mistral",
    displayName: "Mistral Large",
    apiModelId: "mistral-large-latest",
    description: "Modèle européen (France) performant en multilingue et raisonnement.",
    contextWindow: 128000,
    inputPricePerMTokUsd: 2,
    outputPricePerMTokUsd: 6,
    marginPercent: 20,
    enabled: true,
    tags: ["multilingue", "raisonnement"],
  },
  {
    // Identifiant réel confirmé par recherche : "kimi-k2.6"
    provider: "moonshot",
    displayName: "Kimi K2.6",
    apiModelId: "kimi-k2.6",
    description: "Modèle de Moonshot AI, très bon en agents et longues conversations.",
    contextWindow: 256000,
    inputPricePerMTokUsd: 0.6,
    outputPricePerMTokUsd: 2.5,
    marginPercent: 25,
    enabled: true,
    tags: ["agents", "long-contexte"],
  },
  {
    // Identifiant réel confirmé par recherche : "MiniMax-M2" (casse exacte importante)
    provider: "minimax",
    displayName: "MiniMax M2",
    apiModelId: "MiniMax-M2",
    description: "Modèle chinois polyvalent, bon rapport qualité/prix.",
    contextWindow: 204800,
    inputPricePerMTokUsd: 0.3,
    outputPricePerMTokUsd: 1.2,
    marginPercent: 25,
    enabled: true,
    tags: ["économique", "polyvalent"],
  },
  {
    // "glm-4.6" confirmé valide en théorie, mais retourne "Unknown Model" (1211) selon
    // le plan/compte Z.ai utilisé (confirmé : ce code peut être limité par le tier du
    // compte, pas juste par l'orthographe). On utilise le modèle FLASH, confirmé
    // accessible gratuitement/largement sur tous les comptes.
    provider: "zai",
    displayName: "GLM-4.5 Flash",
    apiModelId: "glm-4.5-flash",
    description: "Modèle Z.ai (Zhipu), rapide et économique, fort en code et en usage agentique.",
    contextWindow: 128000,
    inputPricePerMTokUsd: 0.1,
    outputPricePerMTokUsd: 0.3,
    marginPercent: 25,
    enabled: true,
    tags: ["code", "agents", "économique"],
  },
  {
    provider: "stepfun",
    displayName: "Step 2",
    apiModelId: "step-2-16k",
    description: "Modèle StepFun, performant en raisonnement multimodal.",
    contextWindow: 128000,
    inputPricePerMTokUsd: 0.5,
    outputPricePerMTokUsd: 2,
    marginPercent: 25,
    enabled: true,
    tags: ["multimodal", "raisonnement"],
  },

  // --- Modèles de génération d'image ---
  {
    provider: "openai",
    displayName: "GPT Image 1",
    apiModelId: "gpt-image-1",
    description: "Modèle de génération d'image d'OpenAI, haute fidélité et bonne compréhension des prompts détaillés.",
    contextWindow: 0,
    inputPricePerMTokUsd: 0,
    outputPricePerMTokUsd: 0,
    marginPercent: 25,
    enabled: true,
    tags: ["image", "génération"],
    modality: "image",
    pricePerImageUsd: 0.04,
  },
  {
    provider: "google",
    displayName: "Imagen 4",
    apiModelId: "imagen-4.0-generate-001",
    description: "Modèle de génération d'image de Google, excellent rendu photoréaliste.",
    contextWindow: 0,
    inputPricePerMTokUsd: 0,
    outputPricePerMTokUsd: 0,
    marginPercent: 25,
    enabled: true,
    tags: ["image", "génération", "photoréaliste"],
    modality: "image",
    pricePerImageUsd: 0.03,
  },
  {
    provider: "xai",
    displayName: "Grok Image",
    apiModelId: "grok-2-image",
    description: "Modèle de génération d'image de xAI, style créatif et réactif.",
    contextWindow: 0,
    inputPricePerMTokUsd: 0,
    outputPricePerMTokUsd: 0,
    marginPercent: 25,
    enabled: true,
    tags: ["image", "génération", "créatif"],
    modality: "image",
    pricePerImageUsd: 0.02,
  },

  // --- Modèle de génération vidéo ---
  {
    // Identifiant réel confirmé par recherche : "veo-3.1-generate-preview"
    provider: "google",
    displayName: "Veo 3.1",
    apiModelId: "veo-3.1-generate-preview",
    description: "Modèle de génération vidéo de Google, à partir d'un simple prompt texte. Génération asynchrone (30s à quelques minutes).",
    contextWindow: 0,
    inputPricePerMTokUsd: 0,
    outputPricePerMTokUsd: 0,
    marginPercent: 25,
    enabled: true,
    tags: ["vidéo", "génération", "asynchrone"],
    modality: "video",
    pricePerVideoSecondUsd: 0.35,
  },
];