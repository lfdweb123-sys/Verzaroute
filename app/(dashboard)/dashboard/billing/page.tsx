"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import { Smartphone, CreditCard, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import type { UserProfile } from "@/types";

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000, 25000, 50000];

export default function BillingPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [amount, setAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState("");
  const [method, setMethod] = useState<"mobile_money" | "card">("mobile_money");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAmount = customAmount ? Number(customAmount) : amount;
  const hasPhoneNumber = Boolean(profile?.phoneNumber);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setProfile(snap.data() as UserProfile);
    });
    return () => unsub();
  }, [user]);

async function handlePurchase() {
  setError(null);
  setLoading(true);
  try {
    const res = await fetch("/api/v1/billing/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountFcfa: effectiveAmount, method }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Une erreur est survenue.");
      return;
    }
    // Ouvre le paiement dans un nouvel onglet
    window.open(data.paymentUrl, "_blank");
  } catch {
    setError("Impossible de contacter le service de paiement.");
  } finally {
    setLoading(false);
  }
}

  return (
    <>
      {/* Masqué sur mobile, visible uniquement sur desktop */}
      <div className="hidden md:block">
        <DashboardTopBar title="Crédits & paiement" />
      </div>

      <div className="p-4 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Alerte numéro de téléphone */}
        {profile && !hasPhoneNumber && (
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 sm:p-5 flex items-start gap-3">
            <AlertTriangle size={20} className="text-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium mb-1">Numéro de téléphone requis</p>
              <p className="text-sm text-white/60 mb-3">
                Verzapay exige un numéro de téléphone vérifié pour créer un lien de paiement. Ajoute
                le tien depuis ton profil avant de continuer.
              </p>
              <Link
                href="/dashboard/profile"
                className="inline-block rounded-lg bg-gold-gradient px-4 py-2 text-sm font-semibold text-obsidian hover:scale-[1.02] transition-transform"
              >
                Ajouter mon numéro →
              </Link>
            </div>
          </div>
        )}

        {/* Carte de sélection du montant */}
        <div className={cn("rounded-2xl border border-white/10 bg-obsidian-card p-4 sm:p-6", !hasPhoneNumber && "opacity-50 pointer-events-none")}>
          <h2 className="text-white font-semibold mb-4">Choisissez un montant (FCFA)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  setAmount(amt);
                  setCustomAmount("");
                }}
                className={cn(
                  "rounded-xl border py-3 text-sm font-medium transition-colors",
                  !customAmount && amount === amt
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-white/15 text-white/70 hover:border-white/30"
                )}
              >
                {amt.toLocaleString("fr-FR")}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1000}
            placeholder="Ou saisissez un montant personnalisé"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-white outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        {/* Carte de méthode de paiement */}
        <div className={cn("rounded-2xl border border-white/10 bg-obsidian-card p-4 sm:p-6", !hasPhoneNumber && "opacity-50 pointer-events-none")}>
          <h2 className="text-white font-semibold mb-4">Méthode de paiement</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMethod("mobile_money")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border py-4 sm:py-5 transition-colors",
                method === "mobile_money" ? "border-gold bg-gold/10 text-gold" : "border-white/15 text-white/70 hover:border-white/30"
              )}
            >
              <Smartphone size={22} />
              <span className="text-sm font-medium">Mobile Money</span>
            </button>
            <button
              onClick={() => setMethod("card")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border py-4 sm:py-5 transition-colors",
                method === "card" ? "border-gold bg-gold/10 text-gold" : "border-white/15 text-white/70 hover:border-white/30"
              )}
            >
              <CreditCard size={22} />
              <span className="text-sm font-medium">Carte bancaire</span>
            </button>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Bouton de paiement */}
        <button
          onClick={handlePurchase}
          disabled={loading || !effectiveAmount || !hasPhoneNumber}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3.5 font-semibold text-obsidian hover:scale-[1.01] transition-transform disabled:opacity-40 disabled:hover:scale-100"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Payer {effectiveAmount ? effectiveAmount.toLocaleString("fr-FR") : 0} FCFA via Verzapay
        </button>
        <p className="text-xs text-white/40 text-center leading-relaxed">
          Paiement sécurisé traité par Verzapay. Vos crédits sont ajoutés automatiquement dès confirmation.
        </p>
      </div>
    </>
  );
}