/**
 * Client Verzapay — SERVEUR UNIQUEMENT.
 * La clé secrète (VERZAPAY_SECRET_KEY) ne doit jamais être exposée au frontend.
 *
 * IMPORTANT : la documentation officielle de Verzapay ne décrit AUCUN mécanisme de
 * signature de webhook (pas de header, pas d'algorithme) — leur propre exemple de
 * handler Node.js lit event.type directement depuis req.body sans aucune vérification.
 * Confirmé empiriquement : nos tests réels ne reçoivent jamais de header de signature.
 * On ne peut donc pas vérifier l'authenticité cryptographique de ces webhooks tant que
 * Verzapay n'implémente pas ce mécanisme. À la place, on vérifie que companyId
 * correspond à ton propre compte marchand, ce qui est un filtre partiel mais réel.
 *
 * Format RÉEL confirmé du payload webhook (plat, pas d'objet "data") :
 * { type, paymentId, amount, currency, status, customerName, customerPhone, companyId, metadata? }
 */
import { createHmac, timingSafeEqual } from "crypto";

const BASE_URL = process.env.VERZAPAY_BASE_URL ?? "https://www.verzapay.com/api/v1";

export interface CreatePaymentParams {
  amountFcfa: number;
  currency?: "XOF" | "XAF";
  customerName: string;
  customerPhone: string;
  description: string;
  metadata?: Record<string, string>;
  callbackUrl?: string;
  returnUrl?: string;
}

export interface VerzapayPaymentResponse {
  id: string;
  status: "pending" | "completed" | "failed";
  paymentUrl: string;
  amountFcfa: number;
}

export async function createVerzapayPayment(params: CreatePaymentParams): Promise<VerzapayPaymentResponse> {
  const secretKey = process.env.VERZAPAY_SECRET_KEY;
  if (!secretKey) throw new Error("VERZAPAY_SECRET_KEY manquant dans l'environnement");

  const requestBody = {
    amount: params.amountFcfa,
    currency: params.currency ?? "XOF",
    description: params.description,
    customer_name: params.customerName,
    customer_phone: params.customerPhone,
    ...(params.metadata ? { metadata: params.metadata } : {}),
    ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
    ...(params.returnUrl ? { return_url: params.returnUrl } : {}),
  };

  console.log("[VZR-VERZAPAY] Requête envoyée à", `${BASE_URL}/payments`, ":", JSON.stringify(requestBody));

  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  console.log("[VZR-VERZAPAY] Statut de la réponse Verzapay:", res.status);

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    console.error("[VZR-VERZAPAY] Corps complet de l'erreur Verzapay:", errText);
    throw new Error(`[verzapay] Erreur création paiement (${res.status}): ${errText}`);
  }

  const data = await res.json();
  console.log("[VZR-VERZAPAY] Réponse de succès complète:", JSON.stringify(data));
  return {
    id: data.id,
    status: data.status,
    paymentUrl: data.checkout_url,
    amountFcfa: data.amount ?? params.amountFcfa,
  };
}

/**
 * Vérifie que l'événement webhook provient bien de TON compte marchand Verzapay,
 * en comparant companyId au tien (variable d'env VERZAPAY_COMPANY_ID).
 * Ce n'est PAS une vérification cryptographique (Verzapay n'en propose aucune à ce
 * jour d'après leur documentation) — c'est un filtre partiel en attendant mieux.
 */
export function isVerzapayEventFromOurAccount(companyId: string | undefined): boolean {
  const ourCompanyId = process.env.VERZAPAY_COMPANY_ID;
  if (!ourCompanyId) {
    console.warn("[VZR-VERZAPAY] VERZAPAY_COMPANY_ID non configuré — impossible de filtrer par companyId");
    return true;
  }
  return companyId === ourCompanyId;
}

/** Conservé pour compatibilité si Verzapay ajoute un jour un vrai mécanisme de signature. */
export function verifyVerzapayWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.VERZAPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

/** Format RÉEL confirmé du webhook Verzapay (payload plat, pas d'objet "data"). */
export interface VerzapayWebhookEvent {
  type: "payment.completed" | "payment.failed" | "payout.completed" | "payout.failed" | string;
  paymentId: string;
  merchantReference?: string | null;
  amount: number;
  currency: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  companyId?: string;
  metadata?: Record<string, string>;
}