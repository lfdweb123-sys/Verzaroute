export type Role = "user" | "admin" | "creactor";

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
  /** Code de parrainage personnel — uniquement présent pour les comptes role "creator". */
  referralCode?: string;
  /** uid du créateur qui a parrainé ce compte, s'il en existe un (défini une seule fois). */
  referredBy?: string;
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
  apiModelId?: string;
  isFreeTier?: boolean;
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

export interface Conversation {
  id: string;
  uid: string;
  model: string;
  title: string;
  messages: Array<{ role: "user" | "assistant"; content: unknown; creditsCharged?: number }>;
  createdAt: number;
  updatedAt: number;
}

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

/**
 * Une commission de parrainage générée quand un filleul (referredBy défini) fait un
 * dépôt. 2% du montant FCFA du dépôt, versé au créateur qui l'a parrainé. Ces
 * enregistrements sont agrégés puis marqués "paidOut" quand un paiement mensuel est
 * effectué manuellement par l'admin (voir CreatorPayoutRequest).
 */
export interface ReferralEarning {
  id: string;
  creatorUid: string;
  referredUid: string;
  verzapayPaymentId: string;
  amountFcfa: number;
  createdAt: number;
  paidOut: boolean;
}

/** Demande de paiement mensuel d'un créateur, traitée manuellement par l'admin. */
export interface CreatorPayoutRequest {
  id: string;
  creatorUid: string;
  amountFcfa: number;
  status: "pending" | "paid" | "rejected";
  requestedAt: number;
  paidAt?: number;
  note?: string;
}
