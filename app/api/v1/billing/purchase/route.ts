/**
 * Crée une demande de paiement Verzapay pour l'achat de crédits.
 * Appelé depuis le dashboard (utilisateur connecté via cookie de session).
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { createVerzapayPayment } from "@/lib/verzapay/client";
import type { PlatformSettings } from "@/types";

async function getCurrentUser() {
  const session = cookies().get("session")?.value;
  if (!session) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return decoded;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { amountFcfa, method } = await req.json().catch(() => ({}));
  if (!amountFcfa || typeof amountFcfa !== "number" || amountFcfa <= 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }
  if (method !== "mobile_money" && method !== "card") {
    return NextResponse.json({ error: "Méthode de paiement invalide" }, { status: 400 });
  }

  const settingsSnap = await adminDb.collection("settings").doc("platform").get();
  const settings = (settingsSnap.data() as PlatformSettings) ?? {
    creditToUsdRate: 0.001,
    fcfaToUsdRate: 610,
    minPurchaseFcfa: 1000,
  };

  if (amountFcfa < settings.minPurchaseFcfa) {
    return NextResponse.json(
      { error: `Le montant minimum est de ${settings.minPurchaseFcfa} FCFA` },
      { status: 400 }
    );
  }

  const amountUsd = amountFcfa / settings.fcfaToUsdRate;
  const creditsRequested = Math.floor(amountUsd / settings.creditToUsdRate);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://verzaroute.com";

  const payment = await createVerzapayPayment({
    amountFcfa,
    method,
    customerEmail: user.email ?? "",
    metadata: { uid: user.uid, creditsRequested: String(creditsRequested) },
    callbackUrl: `${appUrl}/api/webhooks/verzapay`,
    returnUrl: `${appUrl}/dashboard/billing?status=return`,
  });

  await adminDb.collection("transactions").add({
    uid: user.uid,
    type: "purchase",
    amountCredits: creditsRequested,
    amountFcfa,
    verzapayPaymentId: payment.id,
    status: "pending",
    createdAt: Date.now(),
    description: `Demande d'achat de ${creditsRequested} crédits (${amountFcfa} FCFA)`,
  });

  return NextResponse.json({ paymentUrl: payment.paymentUrl, creditsRequested });
}
