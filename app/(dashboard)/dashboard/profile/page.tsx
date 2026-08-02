"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import type { UserProfile } from "@/types";
import { Check, Phone, AlertTriangle, Users, Copy, Gift, Wallet } from "lucide-react";

interface ReferralStats {
  referralCode: string | null;
  referralCount: number;
  totalEarnedFcfa: number;
  paidOutFcfa: number;
  pendingBalanceFcfa: number;
  hasPendingRequest: boolean;
}

/** Section visible uniquement pour les comptes role: "creator". */
function ReferralProgramSection() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [copied, setCopied] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  async function loadStats() {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/v1/referral/stats");
      const data = await res.json();
      if (res.ok) {
        if (!data.referralCode) {
          // Génère le code automatiquement au premier chargement si absent.
          const genRes = await fetch("/api/v1/referral/generate-code", { method: "POST" });
          const genData = await genRes.json();
          setStats({ ...data, referralCode: genData.referralCode ?? null });
        } else {
          setStats(data);
        }
      }
    } catch {
      // silencieux
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  const referralLink = stats?.referralCode ? `https://verzaroute.com/register?ref=${stats.referralCode}` : "";

  async function handleCopyLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silencieux
    }
  }

  async function handleRequestPayout() {
    setRequesting(true);
    setPayoutError(null);
    setPayoutSuccess(false);
    try {
      const res = await fetch("/api/v1/referral/request-payout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setPayoutError(data.error ?? "Échec de la demande de paiement.");
        return;
      }
      setPayoutSuccess(true);
      loadStats();
    } catch {
      setPayoutError("Impossible de contacter le serveur.");
    } finally {
      setRequesting(false);
    }
  }

  if (loadingStats) {
    return (
      <div className="rounded-2xl border border-white/10 bg-obsidian-card p-5 md:p-6">
        <p className="text-white/40 text-sm">Chargement du programme de parrainage...</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="rounded-2xl border border-gold/20 bg-obsidian-card p-5 md:p-6">
      <div className="flex items-center gap-2 mb-1.5">
        <Gift size={16} className="text-gold" />
        <h2 className="text-white font-semibold">Programme de parrainage créateur</h2>
      </div>
      <p className="text-xs text-white/50 mb-5">
        Gagne 2% sur chaque recharge de crédits effectuée par les utilisateurs que tu parraines.
      </p>

      <div className="mb-5">
        <label className="block text-xs text-white/50 mb-1.5">Ton code de parrainage</label>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-gold font-mono font-semibold tracking-wide">
            {stats.referralCode ?? "—"}
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-semibold text-obsidian hover:scale-[1.02] transition-transform shrink-0"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copié" : "Copier le lien"}
          </button>
        </div>
        <p className="text-[11px] text-white/30 mt-1.5 break-all">{referralLink}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl bg-white/5 p-3.5">
          <div className="flex items-center gap-1.5 text-white/40 mb-1">
            <Users size={13} />
            <span className="text-[11px]">Filleuls</span>
          </div>
          <p className="text-lg font-bold text-white">{stats.referralCount}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3.5">
          <p className="text-[11px] text-white/40 mb-1">Gagné au total</p>
          <p className="text-lg font-bold text-white">{stats.totalEarnedFcfa.toLocaleString("fr-FR")} F</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3.5">
          <p className="text-[11px] text-white/40 mb-1">Déjà versé</p>
          <p className="text-lg font-bold text-white/60">{stats.paidOutFcfa.toLocaleString("fr-FR")} F</p>
        </div>
        <div className="rounded-xl bg-gold/10 border border-gold/30 p-3.5">
          <p className="text-[11px] text-gold/70 mb-1">Solde disponible</p>
          <p className="text-lg font-bold text-gold">{stats.pendingBalanceFcfa.toLocaleString("fr-FR")} F</p>
        </div>
      </div>

      {payoutError && <p className="text-xs text-red-400 mb-3">{payoutError}</p>}
      {payoutSuccess && <p className="text-xs text-gold mb-3">Demande de paiement envoyée avec succès.</p>}

      <button
        onClick={handleRequestPayout}
        disabled={requesting || stats.hasPendingRequest || stats.pendingBalanceFcfa < 5000}
        className="flex items-center justify-center gap-2 rounded-lg bg-gold-gradient px-5 py-2.5 font-semibold text-obsidian hover:scale-[1.02] transition-transform disabled:opacity-40 w-full sm:w-auto"
      >
        <Wallet size={16} />
        {stats.hasPendingRequest
          ? "Demande déjà en attente"
          : requesting
          ? "Envoi..."
          : "Demander un paiement (fin de mois)"}
      </button>
      {stats.pendingBalanceFcfa < 5000 && !stats.hasPendingRequest && (
        <p className="text-[11px] text-white/30 mt-2">Solde minimum de 5 000 FCFA requis pour demander un paiement.</p>
      )}
    </div>
  );
}

/** Champ pour appliquer un code de parrainage oublié à l'inscription (une seule fois). */
function ReferralCodeInputSection() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleApply() {
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/referral/apply-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Code invalide.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-white/10 bg-obsidian-card p-5 md:p-6">
        <p className="text-sm text-gold">Code de parrainage appliqué avec succès !</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-obsidian-card p-5 md:p-6">
      <h2 className="text-white font-semibold mb-1.5">Code de parrainage</h2>
      <p className="text-xs text-white/50 mb-4">
        Tu as oublié de renseigner un code de parrainage à l&apos;inscription ? Ajoute-le ici (une seule fois).
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="EX: A3B7C9D"
          className="flex-1 rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-white outline-none focus:border-gold/50 transition-colors font-mono uppercase"
        />
        <button
          onClick={handleApply}
          disabled={submitting || !code.trim()}
          className="rounded-lg bg-gold-gradient px-5 py-2.5 font-semibold text-obsidian hover:scale-[1.02] transition-transform disabled:opacity-40 shrink-0"
        >
          {submitting ? "..." : "Appliquer"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saved, setSaved] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data() as UserProfile | undefined;
      if (data) {
        setProfile(data);
        setDisplayName(data.displayName);
        setPhoneNumber(data.phoneNumber ?? "");
      }
    });
    return () => unsub();
  }, [user]);

  async function handleSave() {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { displayName, updatedAt: Date.now() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSavePhone() {
    if (!user) return;
    setPhoneError(null);
    const digitsOnly = phoneNumber.replace(/[^\d+]/g, "");
    if (!digitsOnly.startsWith("+") || digitsOnly.length < 8) {
      setPhoneError("Format attendu : indicatif pays + numéro, ex: +2250700000000");
      return;
    }
    await updateDoc(doc(db, "users", user.uid), { phoneNumber: digitsOnly, updatedAt: Date.now() });
    setPhoneSaved(true);
    setTimeout(() => setPhoneSaved(false), 2000);
  }

  return (
    <>
      <div className="hidden md:block">
        <DashboardTopBar title="Profil" />
      </div>

      <div className="p-4 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-5 md:p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gold-gradient flex items-center justify-center text-obsidian font-bold text-lg sm:text-xl shrink-0">
              {profile?.displayName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold truncate">{profile?.displayName}</p>
              <p className="text-white/50 text-sm truncate">{profile?.email}</p>
            </div>
          </div>

          <label className="block text-sm text-white/70 mb-1.5">Nom affiché</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-white outline-none focus:border-gold/50 transition-colors mb-4"
          />

          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-2 rounded-lg bg-gold-gradient px-5 py-2.5 font-semibold text-obsidian hover:scale-[1.02] transition-transform w-full sm:w-auto"
          >
            {saved ? <Check size={16} /> : null}
            {saved ? "Enregistré" : "Enregistrer"}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-5 md:p-6">
          <div className="flex items-center gap-2 mb-1.5">
            <Phone size={16} className="text-gold" />
            <h2 className="text-white font-semibold">Numéro de téléphone</h2>
          </div>
          <p className="text-xs text-white/50 mb-4">
            Format international avec indicatif pays, ex :{" "}
            <span className="text-white/70 font-mono">+2250700000000</span>.
          </p>

          {!profile?.phoneNumber && (
            <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2.5 mb-4">
              <AlertTriangle size={15} className="text-gold shrink-0 mt-0.5" />
              <p className="text-xs text-gold/90">
                Aucun numéro enregistré. Tu devras en ajouter un avant de pouvoir acheter des crédits.
              </p>
            </div>
          )}

          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+2250700000000"
            className="w-full rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-white outline-none focus:border-gold/50 transition-colors mb-3 font-mono"
          />
          {phoneError && <p className="text-xs text-red-400 mb-3">{phoneError}</p>}

          <button
            onClick={handleSavePhone}
            className="flex items-center justify-center gap-2 rounded-lg bg-gold-gradient px-5 py-2.5 font-semibold text-obsidian hover:scale-[1.02] transition-transform w-full sm:w-auto"
          >
            {phoneSaved ? <Check size={16} /> : null}
            {phoneSaved ? "Enregistré" : "Enregistrer le numéro"}
          </button>
        </div>

        {/* Section parrainage : uniquement pour les comptes créateur */}
        {profile?.role === "creator" && <ReferralProgramSection />}

        {/* Champ de code oublié : uniquement si pas encore de parrain associé */}
        {profile && !profile.referredBy && profile.role !== "creator" && <ReferralCodeInputSection />}

        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-5 md:p-6">
          <h2 className="text-white font-semibold mb-3">Compte</h2>
          <div className="space-y-1">
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-white/50">Rôle</span>
              <span className="text-white capitalize">{profile?.role}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-white/50">Membre depuis</span>
              <span className="text-white">
                {profile ? new Date(profile.createdAt).toLocaleDateString("fr-FR") : "..."}
              </span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-white/50">Solde de crédits</span>
              <span className="text-gold font-semibold">
                {profile?.creditsBalance?.toLocaleString("fr-FR")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
