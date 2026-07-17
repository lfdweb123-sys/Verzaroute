/**
 * Webhook Verzapay — reçoit les notifications de paiement.
 *
 * IMPORTANT (confirmé empiriquement) : Verzapay NE renvoie PAS le champ "metadata"
 * dans le payload du webhook, même s'il est envoyé à la création du paiement. On ne
 * peut donc pas récupérer uid/creditsRequested depuis event.metadata comme prévu
 * initialement. À la place, on retrouve ces informations en recherchant la
 * transaction déjà enregistrée dans Firestore au moment de la création du paiement
 * (voir /api/v1/billing/purchase), via son paymentId — cette transaction contient
 * déjà uid et amountCredits, donc aucune dépendance à la metadata du webhook.
 *
 * SÉCURITÉ : Verzapay ne documente ni n'envoie de signature cryptographique — on
 * filtre par companyId (voir lib/verzapay/client.ts) en attendant un vrai mécanisme
 * de signature de leur part. Limitation connue.
 *
 * Format RÉEL confirmé du payload (plat, sans objet "data") :
 * { type, paymentId, amount, currency, status, customerName, customerPhone, companyId }
 *
 * FACTURATION : une fois le compte crédité avec succès, une facture PDF est générée
 * (lib/pdf/invoice.ts, via pdf-lib — pas de dépendance native, compatible serverless
 * Vercel) et envoyée par email via Brevo en pièce jointe. Cet envoi est fait dans un
 * try/catch séparé qui n'affecte jamais la réponse du webhook : le crédit est déjà
 * acquis à ce stade, un échec d'email ne doit pas faire échouer tout le traitement
 * ni risquer un retraitement du paiement par Verzapay.
 *
 * Idempotent : creditUserAccount() ignore les paiements déjà traités (par verzapayPaymentId).
 * DEBUG : logs préfixés "[VZR-WEBHOOK]", visibles dans Vercel → Logs.
 */
import { NextRequest, NextResponse } from "next/server";
import { isVerzapayEventFromOurAccount, type VerzapayWebhookEvent } from "@/lib/verzapay/client";
import { creditUserAccount } from "@/lib/credits";
import { adminDb } from "@/lib/firebase/admin";
import { generateInvoicePdf } from "@/lib/pdf/invoice";
import { sendBrevoEmail } from "@/lib/email/brevo";

export const runtime = "nodejs";

/**
 * Génère la facture PDF et l'envoie par email — isolé dans sa propre fonction pour
 * que toute erreur (Brevo indisponible, PDF malformé, etc.) reste confinée et ne
 * remonte jamais jusqu'à faire échouer le webhook lui-même.
 */
async function sendInvoiceEmail(params: {
  uid: string;
  paymentId: string;
  amountFcfa: number;
  amountCredits: number;
}) {
  const userSnap = await adminDb.collection("users").doc(params.uid).get();
  const userData = userSnap.data();
  const email = userData?.email as string | undefined;
  const displayName = (userData?.displayName as string | undefined) ?? "Client VerzaRoute";

  if (!email) {
    console.warn("[VZR-WEBHOOK] Aucun email trouvé pour uid:", params.uid, "— facture non envoyée");
    return;
  }

  const invoiceNumber = `VR-${params.paymentId.slice(0, 10).toUpperCase()}`;

  const pdfBytes = await generateInvoicePdf({
    invoiceNumber,
    customerName: displayName,
    customerEmail: email,
    amountFcfa: params.amountFcfa,
    amountCredits: params.amountCredits,
    paymentId: params.paymentId,
    date: new Date(),
  });

  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

  await sendBrevoEmail({
    to: email,
    subject: `Votre facture VerzaRoute — ${invoiceNumber}`,
    htmlContent: `
      <h2>Merci pour votre achat, ${displayName.replace(/</g, "&lt;")} !</h2>
      <p>Votre paiement de <strong>${params.amountFcfa.toLocaleString("fr-FR")} FCFA</strong> a bien été
      confirmé, et <strong>${params.amountCredits.toLocaleString("fr-FR")} crédits</strong> ont été
      ajoutés à votre compte VerzaRoute.</p>
      <p>Vous trouverez votre facture en pièce jointe (${invoiceNumber}).</p>
      <p style="color:#888; font-size:12px; margin-top:24px;">VerzaRoute — verzaroute.com</p>
    `,
    attachments: [{ name: `${invoiceNumber}.pdf`, contentBase64: pdfBase64 }],
  });

  console.log("[VZR-WEBHOOK] Facture envoyée avec succès à:", email);
}

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

  console.log("[VZR-WEBHOOK] Type d'événement:", event.type, "— paymentId:", event.paymentId, "— status:", event.status);

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
    console.log("[VZR-WEBHOOK] payment.completed détecté — recherche de la transaction associée par paymentId...");

    const txSnap = await adminDb
      .collection("transactions")
      .where("verzapayPaymentId", "==", event.paymentId)
      .limit(1)
      .get();

    if (txSnap.empty) {
      console.error(
        "[VZR-WEBHOOK] ERREUR: aucune transaction trouvée pour paymentId:",
        event.paymentId,
        "— impossible de déterminer quel utilisateur créditer."
      );
      return NextResponse.json({ error: "Transaction correspondante introuvable" }, { status: 404 });
    }

    const txData = txSnap.docs[0].data();
    const uid = txData.uid as string;
    const creditsRequested = txData.amountCredits as number;
    console.log("[VZR-WEBHOOK] Transaction trouvée. uid:", uid, "— creditsRequested:", creditsRequested);

    try {
      await creditUserAccount({
        uid,
        amountCredits: creditsRequested,
        amountFcfa: event.amount,
        verzapayPaymentId: event.paymentId,
      });
      console.log("[VZR-WEBHOOK] Compte crédité avec succès pour uid:", uid);
    } catch (err) {
      console.error("[VZR-WEBHOOK] ERREUR lors du crédit du compte:", err);
      throw err;
    }

    // Génération + envoi de la facture PDF — jamais bloquant pour le webhook.
    try {
      await sendInvoiceEmail({
        uid,
        paymentId: event.paymentId,
        amountFcfa: event.amount,
        amountCredits: creditsRequested,
      });
    } catch (err) {
      console.error("[VZR-WEBHOOK] ERREUR lors de l'envoi de la facture par email (crédit déjà appliqué, non bloquant):", err);
    }
  } else if (event.type === "payment.failed") {
    console.log("[VZR-WEBHOOK] payment.failed reçu — aucune action de crédit (comportement attendu).");
  } else {
    console.log("[VZR-WEBHOOK] Type d'événement non traité (ignoré):", event.type);
  }

  console.log("[VZR-WEBHOOK] Traitement terminé, réponse 200 envoyée");
  return NextResponse.json({ received: true });
}