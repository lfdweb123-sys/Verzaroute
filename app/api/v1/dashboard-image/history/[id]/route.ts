/** Supprime une image générée précise de l'historique. */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = cookies().get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const decoded = await adminAuth.verifySessionCookie(session, true).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const ref = adminDb.collection("imageGenerations").doc(params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== decoded.uid) {
    return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
  }

  await ref.delete();
  return NextResponse.json({ success: true });
}