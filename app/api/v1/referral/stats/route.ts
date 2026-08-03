import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const session = cookies().get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const decoded = await adminAuth.verifySessionCookie(session, true).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const userData = userSnap.data();
  if (userData?.role !== "creactor") {
    return NextResponse.json({ error: "Réservé aux comptes créateur" }, { status: 403 });
  }

  const [referralsSnap, earningsSnap, pendingPayoutsSnap] = await Promise.all([
    adminDb.collection("users").where("referredBy", "==", decoded.uid).get(),
    adminDb.collection("referralEarnings").where("creatorUid", "==", decoded.uid).get(),
    adminDb
      .collection("creatorPayoutRequests")
      .where("creatorUid", "==", decoded.uid)
      .where("status", "==", "pending")
      .get(),
  ]);

  const totalEarnedFcfa = earningsSnap.docs.reduce((sum, d) => sum + (d.data().amountFcfa ?? 0), 0);
  const paidOutFcfa = earningsSnap.docs
    .filter((d) => d.data().paidOut)
    .reduce((sum, d) => sum + (d.data().amountFcfa ?? 0), 0);
  const pendingBalanceFcfa = totalEarnedFcfa - paidOutFcfa;
  const hasPendingRequest = !pendingPayoutsSnap.empty;

  return NextResponse.json({
    referralCode: userData?.referralCode ?? null,
    referralPublicId: userData?.referralPublicId ?? null,
    referralCount: referralsSnap.size,
    totalEarnedFcfa,
    paidOutFcfa,
    pendingBalanceFcfa,
    hasPendingRequest,
  });
}
