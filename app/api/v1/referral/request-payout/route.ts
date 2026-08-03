import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const MIN_PAYOUT_FCFA = 5000;

export async function POST() {
  const session = cookies().get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const decoded = await adminAuth.verifySessionCookie(session, true).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  if (userSnap.data()?.role !== "creactor") {
    return NextResponse.json({ error: "Réservé aux comptes créateur" }, { status: 403 });
  }

  const existingPending = await adminDb
    .collection("creatorPayoutRequests")
    .where("creatorUid", "==", decoded.uid)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!existingPending.empty) {
    return NextResponse.json({ error: "Une demande de paiement est déjà en attente" }, { status: 400 });
  }

  const earningsSnap = await adminDb.collection("referralEarnings").where("creatorUid", "==", decoded.uid).get();
  const totalEarnedFcfa = earningsSnap.docs.reduce((sum, d) => sum + (d.data().amountFcfa ?? 0), 0);
  const paidOutFcfa = earningsSnap.docs
    .filter((d) => d.data().paidOut)
    .reduce((sum, d) => sum + (d.data().amountFcfa ?? 0), 0);
  const pendingBalanceFcfa = totalEarnedFcfa - paidOutFcfa;

  if (pendingBalanceFcfa < MIN_PAYOUT_FCFA) {
    return NextResponse.json(
      { error: `Solde minimum de ${MIN_PAYOUT_FCFA.toLocaleString("fr-FR")} FCFA requis pour une demande de paiement.` },
      { status: 400 }
    );
  }

  const ref = adminDb.collection("creatorPayoutRequests").doc();
  await ref.set({
    id: ref.id,
    creatorUid: decoded.uid,
    amountFcfa: pendingBalanceFcfa,
    status: "pending",
    requestedAt: Date.now(),
  });

  return NextResponse.json({ success: true, amountFcfa: pendingBalanceFcfa });
}
