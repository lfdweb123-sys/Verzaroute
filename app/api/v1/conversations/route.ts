import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

async function getCurrentUid(): Promise<string | null> {
  const session = cookies().get("session")?.value;
  if (!session) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET() {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const snap = await adminDb
    .collection("conversations")
    .where("uid", "==", uid)
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get();

  const conversations = snap.docs.map((d) => {
    const data = d.data();
    return { id: data.id, model: data.model, title: data.title, updatedAt: data.updatedAt };
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { model } = await req.json().catch(() => ({}));
  if (!model) return NextResponse.json({ error: "model requis" }, { status: 400 });

  const ref = adminDb.collection("conversations").doc();
  const now = Date.now();
  await ref.set({
    id: ref.id,
    uid,
    model,
    title: "Nouvelle conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: ref.id });
}

/** Supprime TOUTES les conversations de l'utilisateur (bouton "Tout supprimer" de l'historique). */
export async function DELETE() {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const snap = await adminDb.collection("conversations").where("uid", "==", uid).get();
  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  return NextResponse.json({ success: true, deleted: snap.size });
}