import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { generateUniqueReferralCode, generateReferralPublicId } from "@/lib/referral/code";

export async function POST() {
  const session = cookies().get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const decoded = await adminAuth.verifySessionCookie(session, true).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const userRef = adminDb.collection("users").doc(decoded.uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data();

  if (userData?.role !== "creactor") {
    return NextResponse.json({ error: "Réservé aux comptes créateur" }, { status: 403 });
  }
  if (userData?.referralCode) {
    // Backfill : les comptes créateur créés avant l'introduction du publicId
    // en reçoivent un à la volée.
    if (!userData.referralPublicId) {
      const referralPublicId = generateReferralPublicId();
      await userRef.update({ referralPublicId, updatedAt: Date.now() });
      return NextResponse.json({ referralCode: userData.referralCode, referralPublicId });
    }
    return NextResponse.json({ referralCode: userData.referralCode, referralPublicId: userData.referralPublicId });
  }

  const referralCode = await generateUniqueReferralCode();
  const referralPublicId = generateReferralPublicId();
  await userRef.update({ referralCode, referralPublicId, updatedAt: Date.now() });

  return NextResponse.json({ referralCode, referralPublicId });
}
