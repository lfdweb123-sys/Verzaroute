/**
 * Garde d'accès pour les routes API réservées aux administrateurs.
 * Vérifie le cookie de session ET relit le rôle depuis Firestore (source de vérité),
 * plutôt que de faire confiance aux seuls custom claims potentiellement obsolètes.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function requireAdmin(): Promise<{ uid: string } | NextResponse> {
  const session = cookies().get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const decoded = await adminAuth.verifySessionCookie(session, true).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  if (userSnap.data()?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  return { uid: decoded.uid };
}
