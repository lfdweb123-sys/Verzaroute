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
  return Math.max(1, Math.ceil(credits));
}

export function computeImageCreditsCharged(params: {
  model: AiModel;
  creditToUsdRate: number;
}): number {
  const { model, creditToUsdRate } = params;
  const priceUsd = model.pricePerImageUsd ?? 0;
  const priceWithMarginUsd = priceUsd * (1 + model.marginPercent / 100);
  const credits = priceWithMarginUsd / creditToUsdRate;
  return Math.max(1, Math.ceil(credits));
}

export function computeVideoCreditsCharged(params: {
  model: AiModel;
  durationSeconds: number;
  creditToUsdRate: number;
}): number {
  const { model, durationSeconds, creditToUsdRate } = params;
  const priceUsd = (model.pricePerVideoSecondUsd ?? 0) * durationSeconds;
  const priceWithMarginUsd = priceUsd * (1 + model.marginPercent / 100);
  const credits = priceWithMarginUsd / creditToUsdRate;
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

/**
 * Crédite le solde utilisateur (appelé par le webhook Verzapay après paiement confirmé).
 *
 * IMPORTANT : la transaction avec ce verzapayPaymentId existe déjà en base, créée avec
 * status "pending" au moment de la demande d'achat (voir /api/v1/billing/purchase).
 * On la MET À JOUR ici plutôt que d'en créer une nouvelle. L'idempotence se fait sur le
 * statut de cette transaction (si déjà "completed", on ne recrédite pas), et non sur sa
 * simple existence — sinon la fonction ne créditerait jamais rien, puisque la
 * transaction "pending" existe systématiquement avant l'appel à cette fonction.
 */
export async function creditUserAccount(params: {
  uid: string;
  amountCredits: number;
  amountFcfa: number;
  verzapayPaymentId: string;
}): Promise<void> {
  const { uid, amountCredits, amountFcfa, verzapayPaymentId } = params;
  const userRef = adminDb.collection("users").doc(uid);

  await adminDb.runTransaction(async (tx) => {
    const existingSnap = await tx.get(
      adminDb.collection("transactions").where("verzapayPaymentId", "==", verzapayPaymentId).limit(1)
    );

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      const existingStatus = existingDoc.data().status;

      if (existingStatus === "completed") return;

      tx.update(userRef, {
        creditsBalance: FieldValue.increment(amountCredits),
        updatedAt: Date.now(),
      });
      tx.update(existingDoc.ref, {
        status: "completed",
        amountFcfa,
        description: `Achat de crédits via Verzapay (${amountFcfa} FCFA) — confirmé`,
      });
      return;
    }

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