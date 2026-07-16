/**
 * Webhook Verzapay — reçoit les notifications de paiement.
 *
 * SÉCURITÉ (lire attentivement) : la documentation Verzapay ne décrit aucun mécanisme
 * de signature cryptographique, et nos tests réels confirment qu'aucun header de
 * signature n'est envoyé. On applique donc un filtre partiel par companyId (voir
 * lib/verzapay/client.ts) plutôt qu'une vraie vérification d'authenticité.
 * CECI EST UNE LIMITATION CONNUE tant que Verzapay n'implémente pas de signature —
 * n'importe qui connaissant cette URL et ton companyId pourrait forger un faux
 * événement payment.completed. À durcir dès que Verzapay propose un vrai mécanisme.
 *
 * Format RÉEL confirmé du payload (plat, sans objet "data") :
 * { type, paymentId, amount, currency, status, customerName, customerPhone, companyId, metadata? }
 *
 * Idempotent : creditUserAccount() ignore les paiements déjà traités (par verzapayPaymentId).
 * DEBUG : logs préfixés "[VZR-WEBHOOK]", visibles dans Vercel → Logs.
 */
import { NextRequest, NextResponse } from "next/server";
import { isVerzapayEventFromOurAccount, type VerzapayWebhookEvent } from "@/lib/verzapay/client";
import { creditUserAccount } from "@/lib/credits";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("[VZR-WEBHOOK] Requête POST reçue sur /api/webhooks/verzapay");

  const rawBody = await req.text();
  console.log("[VZR-WEBHOOK] Corps brut reçu:", rawBody);

  let event: VerzapayWebhookEvent;
  try {
    event = JSON.parse(rawBody);
    console.log("[VZR-WEBHOOK] Événement JSON parsé avec succès:", JSON.stringify(event));
  } catch (err) {
    console.error("[VZR-WEBHOOK] Échec du parsing JSON du corps de la requête:", err);
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const fromOurAccount = isVerzapayEventFromOurAccount(event.companyId);
  console.log("[VZR-WEBHOOK] companyId reçu:", event.companyId, "— correspond à notre compte ?", fromOurAccount);

  if (!fromOurAccount) {
    console.warn("[VZR-WEBHOOK] companyId ne correspond pas à notre compte — requête rejetée (401)");
    return NextResponse.json({ error: "companyId invalide" }, { status: 401 });
  }

  console.log("[VZR-WEBHOOK] Type d'événement:", event.type);
  console.log("[VZR-WEBHOOK] paymentId:", event.paymentId, "— amount:", event.amount, "— status:", event.status);
  console.log("[VZR-WEBHOOK] Metadata reçue:", JSON.stringify(event.metadata));

  try {
    await adminDb.collection("verzapayEvents").add({
      type: event.type,
      paymentId: event.paymentId ?? null,
      receivedAt: Date.now(),
      raw: event,
    });
    console.log("[VZR-WEBHOOK] Événement journalisé dans Firestore (verzapayEvents)");
  } catch (err) {
    console.error("[VZR-WEBHOOK] Échec de la journalisation Firestore:", err);
  }

  if (event.type === "payment.completed") {
    console.log("[VZR-WEBHOOK] payment.completed détecté, traitement du crédit...");

    const { uid, creditsRequested } = event.metadata ?? {};
    console.log("[VZR-WEBHOOK] uid extrait de metadata:", uid, "— creditsRequested:", creditsRequested);

    if (!uid) {
      console.error("[VZR-WEBHOOK] ERREUR: metadata.uid manquant — impossible de créditer. Metadata complète:", JSON.stringify(event.metadata));
      return NextResponse.json({ error: "metadata.uid manquant" }, { status: 400 });
    }

    try {
      await creditUserAccount({
        uid,
        amountCredits: Number(creditsRequested ?? 0),
        amountFcfa: event.amount,
        verzapayPaymentId: event.paymentId,
      });
      console.log("[VZR-WEBHOOK] Compte crédité avec succès pour uid:", uid);
    } catch (err) {
      console.error("[VZR-WEBHOOK] ERREUR lors du crédit du compte:", err);
      throw err;
    }
  } else if (event.type === "payment.failed") {
    console.log("[VZR-WEBHOOK] payment.failed reçu — aucune action de crédit (comportement attendu).");
  } else {
    console.log("[VZR-WEBHOOK] Type d'événement non traité (ignoré):", event.type);
  }

  console.log("[VZR-WEBHOOK] Traitement terminé, réponse 200 envoyée");
  return NextResponse.json({ received: true });
}