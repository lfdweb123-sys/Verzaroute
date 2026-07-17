/**
 * Liste l'historique des images générées par l'utilisateur, pour le panneau
 * HistorySidebar de /dashboard/images.
 */
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

/** Supprime TOUTE l'historique d'images de l'utilisateur. */
export async function DELETE() {
  const session = cookies().get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const decoded = await adminAuth.verifySessionCookie(session, true).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const snap = await adminDb.collection("imageGenerations").where("uid", "==", decoded.uid).get();
  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  return NextResponse.json({ success: true, deleted: snap.size });
}