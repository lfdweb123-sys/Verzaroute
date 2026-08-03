import { NextRequest, NextResponse } from "next/server";
import { adminAuth, createSessionCookie } from "@/lib/firebase/admin";
import { adminDb } from "@/lib/firebase/admin";

const SESSION_EXPIRES_MS = 60 * 60 * 24 * 14 * 1000;

export async function POST(req: NextRequest) {
  console.log("[VZR-SESSION] Requête POST reçue sur /api/auth/session");

  const body = await req.json().catch((err) => {
    console.error("[VZR-SESSION] Échec du parsing JSON du corps de la requête:", err);
    return {};
  });
  const { idToken, phoneNumber, referralUuid } = body;

  if (!idToken) {
    console.warn("[VZR-SESSION] Aucun idToken fourni dans le corps de la requête");
    return NextResponse.json({ error: "idToken requis" }, { status: 400 });
  }
  console.log("[VZR-SESSION] idToken reçu, longueur:", idToken.length);

  try {
    console.log("[VZR-SESSION] Vérification de l'idToken via Firebase Admin...");
    const decoded = await adminAuth.verifyIdToken(idToken);
    console.log("[VZR-SESSION] idToken vérifié avec succès. uid:", decoded.uid, "email:", decoded.email);

    console.log("[VZR-SESSION] Création du cookie de session...");
    const sessionCookie = await createSessionCookie(idToken, SESSION_EXPIRES_MS);
    console.log("[VZR-SESSION] Cookie de session créé, longueur:", sessionCookie.length);

    const userRef = adminDb.collection("users").doc(decoded.uid);
    const snap = await userRef.get();
    console.log("[VZR-SESSION] Document utilisateur existe déjà ?", snap.exists);

    if (!snap.exists) {
      console.log("[VZR-SESSION] Création du profil utilisateur Firestore pour uid:", decoded.uid);

      // Résolution serveur du UUID de parrainage → uid du parrain.
      // Un UUID invalide/inconnu n'empêche jamais l'inscription : le compte
      // est simplement créé sans parrain.
      let referredBy: string | null = null;
      if (typeof referralUuid === "string" && referralUuid.trim()) {
        try {
          const referrerSnap = await adminDb
            .collection("users")
            .where("referralPublicId", "==", referralUuid.trim())
            .limit(1)
            .get();
          if (!referrerSnap.empty && referrerSnap.docs[0].id !== decoded.uid) {
            referredBy = referrerSnap.docs[0].id;
          }
        } catch (err) {
          console.error("[VZR-SESSION] Résolution du parrainage échouée:", err);
        }
      }

      await userRef.set({
        uid: decoded.uid,
        email: decoded.email ?? "",
        displayName: decoded.name ?? decoded.email?.split("@")[0] ?? "Utilisateur",
        photoURL: decoded.picture ?? null,
        role: "user",
        creditsBalance: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...(phoneNumber ? { phoneNumber } : {}),
        ...(referredBy ? { referredBy } : {}),
      });
      await adminAuth.setCustomUserClaims(decoded.uid, { role: "user" });
      console.log("[VZR-SESSION] Profil utilisateur créé et rôle 'user' attribué (custom claims)");
    }

    const role = (snap.data()?.role as string) ?? (decoded as unknown as { role?: string }).role ?? "user";
    console.log("[VZR-SESSION] Rôle résolu:", role, "— envoi de la réponse avec cookie de session");

    const res = NextResponse.json({ success: true, role });
    res.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_EXPIRES_MS / 1000,
      path: "/",
    });
    console.log("[VZR-SESSION] Réponse envoyée avec succès (200)");
    return res;
  } catch (error) {
    console.error("[VZR-SESSION] ERREUR lors du traitement de la session:", error);
    if (error instanceof Error) {
      console.error("[VZR-SESSION] Message d'erreur:", error.message);
      console.error("[VZR-SESSION] Stack:", error.stack);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token invalide" },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  console.log("[VZR-SESSION] Requête DELETE reçue — suppression du cookie de session");
  const res = NextResponse.json({ success: true });
  res.cookies.delete("session");
  return res;
}