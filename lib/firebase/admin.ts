/**
 * Firebase Admin SDK — SERVEUR UNIQUEMENT.
 * Ne jamais importer ce fichier depuis un composant client ("use client").
 * Utilisé par : API routes, middleware, webhooks, scripts d'admin.
 */
import {
  initializeApp,
  getApps,
  getApp,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

function buildAdminApp(): App {
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // La clé privée est stockée avec des \n échappés dans les variables d'env (Vercel)
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "[firebase-admin] Variables d'environnement manquantes: " +
        "FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const adminApp: App = buildAdminApp();

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export const adminMessaging: Messaging = getMessaging(adminApp);

/**
 * Vérifie un cookie de session Firebase et retourne les claims décodés
 * (dont `role`: "admin" | "user", injecté via setCustomUserClaims).
 */
export async function verifySessionCookie(sessionCookie: string) {
  return adminAuth.verifySessionCookie(sessionCookie, true /* checkRevoked */);
}

/** Crée un cookie de session (durée par défaut : 14 jours) */
export async function createSessionCookie(idToken: string, expiresInMs = 60 * 60 * 24 * 14 * 1000) {
  return adminAuth.createSessionCookie(idToken, { expiresIn: expiresInMs });
}

/** Attribue le rôle admin à un utilisateur (à utiliser depuis un script sécurisé, jamais depuis le front) */
export async function setUserRole(uid: string, role: "admin" | "user") {
  await adminAuth.setCustomUserClaims(uid, { role });
  await adminDb.collection("users").doc(uid).set({ role }, { merge: true });
}
