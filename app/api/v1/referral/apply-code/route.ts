import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  const session = cookies().get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const decoded = await adminAuth.verifySessionCookie(session, true).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code de parrainage requis" }, { status: 400 });
  }

  const userRef = adminDb.collection("users").doc(decoded.uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data();

  if (userData?.referredBy) {
    return NextResponse.json({ error: "Un code de parrainage a déjà été appliqué sur ce compte" }, { status: 400 });
  }

  const creatorSnap = await adminDb
    .collection("users")
    .where("referralCode", "==", code.trim().toUpperCase())
    .limit(1)
    .get();

  if (creatorSnap.empty) {
    return NextResponse.json({ error: "Code de parrainage invalide" }, { status: 404 });
  }

  const creatorDoc = creatorSnap.docs[0];
  if (creatorDoc.id === decoded.uid) {
    return NextResponse.json({ error: "Tu ne peux pas utiliser ton propre code" }, { status: 400 });
  }

  await userRef.update({ referredBy: creatorDoc.id, updatedAt: Date.now() });

  return NextResponse.json({ success: true });
}
