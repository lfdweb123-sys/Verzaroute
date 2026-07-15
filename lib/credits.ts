/**
 * Logique de facturation des crédits.
 * 1 "crédit" = unité interne. La conversion crédits <-> USD est pilotée par
 * PlatformSettings.creditToUsdRate (modifiable par l'admin), ce qui permet
 * d'ajuster la marge globale sans redéployer le code.
 */
import { adminDb } from "@/lib/firebase/admin";
import type { AiModel } from "@/types";
import { FieldValue } from "firebase-admin/firestore";

export function computeCreditsCharged(params: {
  model: AiModel;
  inputTokens: number;
  outputTokens: number;
  creditToUsdRate: number;
}): number {
  const { model, inputTokens, outputTokens, creditToUsdRate } = params;
  const rawCostUsd =
    (inputTokens / 1_000_000) * model.inputPricePerMTokUsd +
    (outputTokens / 1_000_000) * model.outputPricePerMTokUsd;
  const priceWithMarginUsd = rawCostUsd * (1 + model.marginPercent / 100);
  const credits = priceWithMarginUsd / creditToUsdRate;
  // On arrondit toujours vers le haut pour ne jamais sous-facturer
  return Math.max(1, Math.ceil(credits));
}

/**
 * Débite atomiquement le solde d'un utilisateur. Lève une erreur si le solde est insuffisant.
 * Utilise une transaction Firestore pour éviter les conditions de course entre deux appels simultanés.
 */
export async function debitCredits(uid: string, amount: number, description: string): Promise<void> {
  const userRef = adminDb.collection("users").doc(uid);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error("Utilisateur introuvable");
    const balance = snap.data()?.creditsBalance ?? 0;
    if (balance < amount) {
      throw new Error("INSUFFICIENT_CREDITS");
    }
    tx.update(userRef, {
      creditsBalance: FieldValue.increment(-amount),
      updatedAt: Date.now(),
    });
    const txRef = adminDb.collection("transactions").doc();
    tx.set(txRef, {
      id: txRef.id,
      uid,
      type: "usage",
      amountCredits: -amount,
      status: "completed",
      createdAt: Date.now(),
      description,
    });
  });
}

/** Crédite le solde utilisateur (appelé par le webhook Verzapay après paiement confirmé). */
export async function creditUserAccount(params: {
  uid: string;
  amountCredits: number;
  amountFcfa: number;
  verzapayPaymentId: string;
}): Promise<void> {
  const { uid, amountCredits, amountFcfa, verzapayPaymentId } = params;
  const userRef = adminDb.collection("users").doc(uid);

  await adminDb.runTransaction(async (tx) => {
    // Idempotence : si ce paiement a déjà été traité, on ne re-crédite pas
    const existing = await tx.get(
      adminDb.collection("transactions").where("verzapayPaymentId", "==", verzapayPaymentId).limit(1)
    );
    if (!existing.empty) return;

    tx.update(userRef, {
      creditsBalance: FieldValue.increment(amountCredits),
      updatedAt: Date.now(),
    });
    const txRef = adminDb.collection("transactions").doc();
    tx.set(txRef, {
      id: txRef.id,
      uid,
      type: "purchase",
      amountCredits,
      amountFcfa,
      verzapayPaymentId,
      status: "completed",
      createdAt: Date.now(),
      description: `Achat de crédits via Verzapay (${amountFcfa} FCFA)`,
    });
  });
}
