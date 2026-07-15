"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";

// DEBUG : tous les logs de ce fichier sont préfixés "[VZR-AUTH]" et visibles
// dans la console du navigateur (F12 → Console).
const LOG = "[VZR-AUTH]";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Échange l'idToken Firebase contre le cookie de session côté serveur, puis redirige selon le rôle. */
async function establishServerSession(user: User, router: ReturnType<typeof useRouter>) {
  console.log(LOG, "establishServerSession() démarré pour uid:", user.uid, "email:", user.email);

  console.log(LOG, "Récupération de l'idToken...");
  const idToken = await user.getIdToken(true);
  console.log(LOG, "idToken récupéré, longueur:", idToken.length);

  console.log(LOG, "Appel de POST /api/auth/session...");
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  console.log(LOG, "Réponse reçue de /api/auth/session, statut:", res.status);

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error(LOG, "Échec de l'établissement de la session serveur:", res.status, errBody);
    return;
  }

  const data = await res.json();
  console.log(LOG, "Session établie avec succès. Rôle:", data.role, "— redirection en cours...");
  router.push(data.role === "admin" ? "/admin/dashboard" : "/dashboard");
  router.refresh();
  console.log(LOG, "router.push() et router.refresh() appelés");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  // Empêche d'établir la session serveur plusieurs fois pour le même utilisateur
  // (onAuthStateChanged peut se déclencher plusieurs fois pendant la vie de l'app).
  const sessionEstablishedFor = useRef<string | null>(null);

  useEffect(() => {
    console.log(LOG, "AuthProvider monté. Vérification d'un éventuel résultat de redirection Google...");

    // Traite le résultat d'un éventuel signInWithRedirect Google.
    // On log l'erreur mais on NE dépend PAS uniquement de cette promesse pour
    // établir la session : onAuthStateChanged ci-dessous sert de filet de
    // sécurité, car getRedirectResult peut renvoyer `null` de façon transitoire
    // selon le timing de restauration de l'état Firebase après redirection.
    getRedirectResult(auth)
      .then((result) => {
        console.log(LOG, "getRedirectResult() résolu. Utilisateur présent ?", Boolean(result?.user));
      })
      .catch((err) => {
        console.error(LOG, "Erreur lors de la récupération du résultat de redirection Google:", err.code ?? err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      console.log(LOG, "onAuthStateChanged déclenché. Utilisateur:", u ? `${u.uid} (${u.email})` : "null");
      setUser(u);
      setLoading(false);

      if (u && sessionEstablishedFor.current !== u.uid) {
        console.log(LOG, "Nouvel utilisateur détecté, établissement de la session serveur...");
        sessionEstablishedFor.current = u.uid;
        try {
          await establishServerSession(u, router);
        } catch (err) {
          console.error(LOG, "Erreur lors de l'établissement de la session:", err);
          sessionEstablishedFor.current = null; // permet de réessayer si ça a échoué
        }
      } else if (u) {
        console.log(LOG, "Session déjà établie pour cet utilisateur, on ne refait rien.");
      }

      if (!u) {
        sessionEstablishedFor.current = null;
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    console.log(LOG, "signInWithGoogle() appelé — lancement de signInWithRedirect...");
    // Conforme au cahier des charges : redirection obligatoire, jamais de popup
    await signInWithRedirect(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    console.log(LOG, "signInWithEmail() appelé pour:", email);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log(LOG, "Connexion email/mdp réussie, uid:", cred.user.uid);
    sessionEstablishedFor.current = cred.user.uid;
    await establishServerSession(cred.user, router);
  };

  const registerWithEmail = async (email: string, password: string) => {
    console.log(LOG, "registerWithEmail() appelé pour:", email);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    console.log(LOG, "Inscription réussie, uid:", cred.user.uid);
    sessionEstablishedFor.current = cred.user.uid;
    await establishServerSession(cred.user, router);
  };

  const signOut = async () => {
    console.log(LOG, "signOut() appelé");
    await firebaseSignOut(auth);
    sessionEstablishedFor.current = null;
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, registerWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur d'un <AuthProvider>");
  return ctx;
}