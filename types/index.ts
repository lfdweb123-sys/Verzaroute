export type Role = "user" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role;
  creditsBalance: number; // en crédits (1 crédit = unité interne de facturation)
  createdAt: number;
  updatedAt: number;
  disabled?: boolean;
}

export interface ApiKeyRecord {
  id: string;
  uid: string;
  hash: string;       // SHA-256 de la clé complète, jamais la clé en clair
  prefix: string;     // ex: vzr_sk_ab12 (les 8 premiers caractères, affichables)
  label: string;
  createdAt: number;
  lastUsedAt?: number;
  revoked: boolean;
}

export interface AiModel {
  id: string;            // ex: "gpt-4o", "claude-sonnet-5", "gemini-2.5-pro"
  provider: ProviderId;
  displayName: string;
  description: string;
  contextWindow: number;
  inputPricePerMTokUsd: number;   // prix coûtant fournisseur ($/1M tokens input)
  outputPricePerMTokUsd: number;  // prix coûtant fournisseur ($/1M tokens output)
  marginPercent: number;          // marge appliquée par VerzaRoute
  enabled: boolean;
  tags: string[];         // ex: ["rapide", "raisonnement", "code", "multimodal"]
  logo?: string;
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
  amountCredits: number;   // positif = crédit, négatif = débit
  amountFcfa?: number;     // montant payé le cas échéant
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
  primaryColor: string;    // or par défaut #D4AF37
  primaryColorDark: string;
  backgroundColor: string; // noir par défaut #0a0a0a
  surfaceColor: string;
  accentColor: string;
  logoUrl?: string;
  updatedAt: number;
  updatedBy: string;
}

export interface PlatformSettings {
  creditToUsdRate: number;      // ex: 1 crédit = 0.001 USD
  fcfaToUsdRate: number;        // taux de change FCFA -> USD utilisé pour la conversion
  minPurchaseFcfa: number;
  theme: PlatformTheme;
}
