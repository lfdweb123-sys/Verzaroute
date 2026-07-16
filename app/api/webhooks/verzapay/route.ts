/**
 * Webhook Verzapay — reçoit les notifications de paiement.
 * Sécurité : vérifie la signature HMAC avant tout traitement (voir lib/verzapay/client.ts).
 * Idempotent : creditUserAccount() ignore les paiements déjà traités (par verzapayPaymentId).
 *
 * DEBUG : tous les logs de cette route sont préfixés "[VZR-WEBHOOK]" et visibles
 * dans Vercel → ton projet → onglet "Logs".
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyVerzapayWebhookSignature, type VerzapayWebhookEvent } from "@/lib/verzapay/client";
import { creditUserAccount } from "@/lib/credits";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("[VZR-WEBHOOK] Requête POST reçue sur /api/webhooks/verzapay");

  const rawBody = await req.text();
  console.log("[VZR-WEBHOOK] Corps brut reçu:", rawBody);

  const signature = req.headers.get("x-verzapay-signature");
  console.log("[VZR-WEBHOOK] En-tête X-Verzapay-Signature présent ?", Boolean(signature));
  if (signature) {
    console.log("[VZR-WEBHOOK] Valeur de la signature reçue:", signature);
  }

  const signatureValid = verifyVerzapayWebhookSignature(rawBody, signature);
  console.log("[VZR-WEBHOOK] Signature valide ?", signatureValid);

  if (!signatureValid) {
    console.warn("[VZR-WEBHOOK] Signature invalide ou manquante — requête rejetée (401)");
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let event: VerzapayWebhookEvent;
  try {
    event = JSON.parse(rawBody);
    console.log("[VZR-WEBHOOK] Événement JSON parsé avec succès:", JSON.stringify(event));
  } catch (err) {
    console.error("[VZR-WEBHOOK] Échec du parsing JSON du corps de la requête:", err);
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  console.log("[VZR-WEBHOOK] Type d'événement:", event.type);
  console.log("[VZR-WEBHOOK] Données de l'événement (event.data):", JSON.stringify(event.data));
  console.log("[VZR-WEBHOOK] Metadata reçue:", JSON.stringify(event.data?.metadata));

  try {
    await adminDb.collection("verzapayEvents").add({
      type: event.type,
      paymentId: event.data?.id ?? null,
      receivedAt: Date.now(),
      raw: event,
    });
    console.log("[VZR-WEBHOOK] Événement journalisé dans Firestore (verzapayEvents)");
  } catch (err) {
    console.error("[VZR-WEBHOOK] Échec de la journalisation Firestore:", err);
  }

  if (event.type === "payment.completed") {
    console.log("[VZR-WEBHOOK] Événement de type payment.completed détecté, traitement du crédit...");

    const { uid, creditsRequested } = event.data.metadata ?? {};
    console.log("[VZR-WEBHOOK] uid extrait de metadata:", uid);
    console.log("[VZR-WEBHOOK] creditsRequested extrait de metadata:", creditsRequested);

    if (!uid) {
      console.error("[VZR-WEBHOOK] ERREUR: metadata.uid manquant dans l'événement — impossible de créditer");
      return NextResponse.json({ error: "metadata.uid manquant" }, { status: 400 });
    }

    try {
      await creditUserAccount({
        uid,
        amountCredits: Number(creditsRequested ?? 0),
        amountFcfa: event.data.amount,
        verzapayPaymentId: event.data.id,
      });
      console.log("[VZR-WEBHOOK] Compte crédité avec succès pour uid:", uid);
    } catch (err) {
      console.error("[VZR-WEBHOOK] ERREUR lors du crédit du compte:", err);
      throw err;
    }
  } else {
    console.log("[VZR-WEBHOOK] Type d'événement non traité (ignoré):", event.type);
  }

  console.log("[VZR-WEBHOOK] Traitement terminé, réponse 200 envoyée");
  return NextResponse.json({ received: true });
}