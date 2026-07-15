"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { FirebaseError } from "firebase/app";

function mapAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/email-already-in-use":
        return "Un compte existe déjà avec cet email.";
      case "auth/weak-password":
        return "Le mot de passe doit contenir au moins 6 caractères.";
      case "auth/invalid-email":
        return "Adresse email invalide.";
      default:
        return "Une erreur est survenue lors de l'inscription.";
    }
  }
  return "Une erreur est survenue.";
}

export default function RegisterPage() {
  const { signInWithGoogle, registerWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      await registerWithEmail(email, password);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-obsidian-card p-8 shadow-2xl animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-2xl font-extrabold">
          <span className="gold-text">Verza</span>
          <span className="text-white">Route</span>
        </span>
        <h1 className="mt-4 text-xl font-semibold text-white">Créer votre compte</h1>
        <p className="text-sm text-white/50 mt-1">Accédez à 10 fournisseurs IA avec une seule clé</p>
      </div>

      <button
        onClick={() => signInWithGoogle()}
        type="button"
        className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/15 py-3 text-sm font-medium text-white hover:border-gold/40 transition-colors mb-6"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0012 23z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.05H2.18a11 11 0 000 9.9z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 00-9.82 6.05l3.66 2.85C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        S'inscrire avec Google
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-white/40">OU</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-white/70 mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-white outline-none focus:border-gold/50 transition-colors"
            placeholder="vous@exemple.com"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-1.5">Mot de passe</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-white outline-none focus:border-gold/50 transition-colors"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-1.5">Confirmer le mot de passe</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-white outline-none focus:border-gold/50 transition-colors"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gold-gradient py-3 font-semibold text-obsidian hover:scale-[1.02] transition-transform disabled:opacity-60"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-gold hover:underline">
          Connectez-vous
        </Link>
      </p>
    </div>
  );
}
