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

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function establishServerSession(user: User, router: ReturnType<typeof useRouter>) {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error("Échec de l'établissement de la session serveur:", errBody);
    return;
  }
  const data = await res.json();
  router.push(data.role === "admin" ? "/admin/dashboard" : "/dashboard");
  router.refresh();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const sessionEstablishedFor = useRef<string | null>(null);

  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.error("Erreur lors de la récupération du résultat de redirection Google:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);

      if (u && sessionEstablishedFor.current !== u.uid) {
        sessionEstablishedFor.current = u.uid;
        try {
          await establishServerSession(u, router);
        } catch (err) {
          console.error("Erreur lors de l'établissement de la session:", err);
          sessionEstablishedFor.current = null;
        }
      }

      if (!u) {
        sessionEstablishedFor.current = null;
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    await signInWithRedirect(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    sessionEstablishedFor.current = cred.user.uid;
    await establishServerSession(cred.user, router);
  };

  const registerWithEmail = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    sessionEstablishedFor.current = cred.user.uid;
    await establishServerSession(cred.user, router);
  };

  const signOut = async () => {
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