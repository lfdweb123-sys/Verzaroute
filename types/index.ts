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
  | "stepfun";

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