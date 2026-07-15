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

export async function creditUserAccount(params: {
  uid: string;
  amountCredits: number;
  amountFcfa: number;
  verzapayPaymentId: string;
}): Promise<void> {
  const { uid, amountCredits, amountFcfa, verzapayPaymentId } = params;
  const userRef = adminDb.collection("users").doc(uid);

  await adminDb.runTransaction(async (tx) => {
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