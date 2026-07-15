/**
 * Échange un idToken Firebase (obtenu côté client après signInWithRedirect ou email/mdp)
 * contre un cookie de session HttpOnly sécurisé, utilisé par le middleware pour la redirection par rôle
 * et par les API routes pour authentifier l'utilisateur.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, createSessionCookie } from "@/lib/firebase/admin";
import { adminDb } from "@/lib/firebase/admin";

const SESSION_EXPIRES_MS = 60 * 60 * 24 * 14 * 1000; // 14 jours

export async function POST(req: NextRequest) {
  const { idToken } = await req.json().catch(() => ({}));
  if (!idToken) return NextResponse.json({ error: "idToken requis" }, { status: 400 });

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const sessionCookie = await createSessionCookie(idToken, SESSION_EXPIRES_MS);

    // Crée le profil utilisateur au premier login si besoin
    const userRef = adminDb.collection("users").doc(decoded.uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      await userRef.set({
        uid: decoded.uid,
        email: decoded.email ?? "",
        displayName: decoded.name ?? decoded.email?.split("@")[0] ?? "Utilisateur",
        photoURL: decoded.picture ?? null,
        role: "user",
        creditsBalance: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await adminAuth.setCustomUserClaims(decoded.uid, { role: "user" });
    }

    const role = (snap.data()?.role as string) ?? (decoded as unknown as { role?: string }).role ?? "user";

    const res = NextResponse.json({ success: true, role });
    res.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_EXPIRES_MS / 1000,
      path: "/",
    });
    return res;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token invalide" },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("session");
  return res;
}
