import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const session = cookies().get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const decoded = await adminAuth.verifySessionCookie(session, true).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const snap = await adminDb
    .collection("imageGenerations")
    .where("uid", "==", decoded.uid)
    .orderBy("createdAt", "desc")
    .limit(40)
    .get();

  return NextResponse.json({ images: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}