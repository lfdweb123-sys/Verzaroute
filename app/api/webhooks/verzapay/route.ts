/**
 * Webhook Verzapay — reçoit les notifications de paiement.
 * Sécurité : vérifie la signature HMAC avant tout traitement (voir lib/verzapay/client.ts).
 * Idempotent : creditUserAccount() ignore les paiements déjà traités (par verzapayPaymentId).
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyVerzapayWebhookSignature, type VerzapayWebhookEvent } from "@/lib/verzapay/client";
import { creditUserAccount } from "@/lib/credits";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-verzapay-signature");

  if (!verifyVerzapayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let event: VerzapayWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  await adminDb.collection("verzapayEvents").add({
    type: event.type,
    paymentId: event.data?.id ?? null,
    receivedAt: Date.now(),
    raw: event,
  });

  if (event.type === "payment.completed") {
    const { uid, creditsRequested } = event.data.metadata ?? {};
    if (!uid) {
      return NextResponse.json({ error: "metadata.uid manquant" }, { status: 400 });
    }
    await creditUserAccount({
      uid,
      amountCredits: Number(creditsRequested ?? 0),
      amountFcfa: event.data.amount,
      verzapayPaymentId: event.data.id,
    });
  }

  return NextResponse.json({ received: true });
}