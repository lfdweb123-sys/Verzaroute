"use client";

import { useState } from "react";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import { Smartphone, CreditCard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000, 25000, 50000];

export default function BillingPage() {
  const [amount, setAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState("");
  const [method, setMethod] = useState<"mobile_money" | "card">("mobile_money");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAmount = customAmount ? Number(customAmount) : amount;

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
      // Redirection vers la page de paiement Verzapay (Mobile Money ou carte)
      window.location.href = data.paymentUrl;
    } catch {
      setError("Impossible de contacter le service de paiement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DashboardTopBar title="Crédits & paiement" />
      <div className="p-6 md:p-8 max-w-8xl space-y-6">
        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-6">
          <h2 className="text-white font-semibold mb-4">Choisissez un montant (FCFA)</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
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

        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-6">
          <h2 className="text-white font-semibold mb-4">Méthode de paiement</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMethod("mobile_money")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border py-5 transition-colors",
                method === "mobile_money" ? "border-gold bg-gold/10 text-gold" : "border-white/15 text-white/70 hover:border-white/30"
              )}
            >
              <Smartphone size={22} />
              <span className="text-sm font-medium">Mobile Money</span>
            </button>
            <button
              onClick={() => setMethod("card")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border py-5 transition-colors",
                method === "card" ? "border-gold bg-gold/10 text-gold" : "border-white/15 text-white/70 hover:border-white/30"
              )}
            >
              <CreditCard size={22} />
              <span className="text-sm font-medium">Carte bancaire</span>
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handlePurchase}
          disabled={loading || !effectiveAmount}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3.5 font-semibold text-obsidian hover:scale-[1.01] transition-transform disabled:opacity-60"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Payer {effectiveAmount ? effectiveAmount.toLocaleString("fr-FR") : 0} FCFA via Verzapay
        </button>
        <p className="text-xs text-white/40 text-center">
          Paiement sécurisé traité par Verzapay. Vos crédits sont ajoutés automatiquement dès confirmation.
        </p>
      </div>
    </>
  );
}
