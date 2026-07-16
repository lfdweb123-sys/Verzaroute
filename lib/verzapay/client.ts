/**
 * Client Verzapay — SERVEUR UNIQUEMENT.
 * La clé secrète (VERZAPAY_SECRET_KEY) ne doit jamais être exposée au frontend.
 */
import { createHmac, timingSafeEqual } from "crypto";

const BASE_URL = process.env.VERZAPAY_BASE_URL ?? "https://www.verzapay.com/api/v1";

export interface CreatePaymentParams {
  amountFcfa: number;
  currency?: "XOF" | "XAF";
  customerEmail: string;
  customerPhone?: string;
  method: "mobile_money" | "card";
  metadata: Record<string, string>;
  callbackUrl: string;
  returnUrl: string;
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
    customer: { email: params.customerEmail, phone: params.customerPhone },
    payment_method: params.method,
    metadata: params.metadata,
    callback_url: params.callbackUrl,
    return_url: params.returnUrl,
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
    console.error("[VZR-VERZAPAY] En-têtes de la réponse:", JSON.stringify(Object.fromEntries(res.headers.entries())));
    throw new Error(`[verzapay] Erreur création paiement (${res.status}): ${errText}`);
  }

  const data = await res.json();
  console.log("[VZR-VERZAPAY] Réponse de succès complète:", JSON.stringify(data));
  return {
    id: data.id,
    status: data.status,
    paymentUrl: data.payment_url ?? data.paymentUrl,
    amountFcfa: data.amount ?? params.amountFcfa,
  };
}

export function verifyVerzapayWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.VERZAPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

export interface VerzapayWebhookEvent {
  event: "payment.completed" | "payment.failed" | string;
  data: {
    id: string;
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    status: string;
  };
}