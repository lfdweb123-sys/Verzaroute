export type Role = "user" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role;
  creditsBalance: number;
  createdAt: number;
  updatedAt: number;
  disabled?: boolean;
  phoneNumber?: string;
}

export interface ApiKeyRecord {
  id: string;
  uid: string;
  hash: string;
  prefix: string;
  label: string;
  createdAt: number;
  lastUsedAt?: number;
  revoked: boolean;
}

export interface AiModel {
  id: string;
  provider: ProviderId;
  displayName: string;
  description: string;
  contextWindow: number;
  inputPricePerMTokUsd: number;
  outputPricePerMTokUsd: number;
  marginPercent: number;
  enabled: boolean;
  tags: string[];
  logo?: string;
  modality?: "text" | "image" | "video";
  pricePerImageUsd?: number;
  pricePerVideoSecondUsd?: number;
  /**
   * Identifiant EXACT attendu par l'API du fournisseur (ex: "gemini-2.5-flash",
   * "mistral-large-latest"). DIFFÉRENT de `id`, qui est un slug utilisé comme clé
   * de document Firestore et généré en remplaçant tout caractère non-alphanumérique
   * par un tiret (donc "Gemini 2.5 Flash" → id "gemini-2-5-flash", ce qui casserait
   * l'appel réel à l'API si on l'utilisait tel quel). Si absent, on retombe sur `id`
   * par compatibilité, mais tout nouveau modèle doit définir ce champ explicitement.
   */
  apiModelId?: string;
}

export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "deepseek"
  | "mistral"
  | "moonshot"
  | "minimax"
  | "zai"
  | "stepfun"
  | "meta";

export interface UsageLog {
  id: string;
  uid: string;
  apiKeyId: string;
  model: string;
  provider: ProviderId;
  inputTokens: number;
  outputTokens: number;
  creditsCharged: number;
  status: "success" | "error";
  errorMessage?: string;
  createdAt: number;
  latencyMs: number;
}

export interface Transaction {
  id: string;
  uid: string;
  type: "purchase" | "usage" | "refund" | "adjustment";
  amountCredits: number;
  amountFcfa?: number;
  verzapayPaymentId?: string;
  status: "pending" | "completed" | "failed";
  createdAt: number;
  description: string;
}

export interface Payout {
  id: string;
  amountFcfa: number;
  status: "pending" | "processing" | "completed" | "failed";
  requestedBy: string;
  createdAt: number;
  completedAt?: number;
  note?: string;
}

export interface PlatformTheme {
  primaryColor: string;
  primaryColorDark: string;
  backgroundColor: string;
  surfaceColor: string;
  accentColor: string;
  logoUrl?: string;
  updatedAt: number;
  updatedBy: string;
}

export interface PlatformSettings {
  creditToUsdRate: number;
  fcfaToUsdRate: number;
  minPurchaseFcfa: number;
  theme: PlatformTheme;
}

export type VideoJobStatus = "pending" | "processing" | "ready" | "failed";

export interface VideoJob {
  id: string;
  uid: string;
  apiKeyId: string;
  model: string;
  provider: ProviderId;
  prompt: string;
  status: VideoJobStatus;
  providerOperationId?: string;
  videoUrl?: string;
  durationSeconds?: number;
  creditsCharged?: number;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

/** Une conversation de chat persistée, pour l'historique sur /dashboard/chat. */
export interface Conversation {
  id: string;
  uid: string;
  model: string;
  title: string;
  messages: Array<{ role: "user" | "assistant"; content: unknown; creditsCharged?: number }>;
  createdAt: number;
  updatedAt: number;
}

/** Une image générée et persistée, pour l'historique sur /dashboard/images. */
export interface ImageGenerationRecord {
  id: string;
  uid: string;
  model: string;
  prompt: string;
  base64: string;
  mimeType: string;
  size: string;
  creditsCharged: number;
  createdAt: number;
}