"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminTopBar } from "@/components/admin/TopBar";
import type { Payout } from "@/types";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/admin/payouts");
    const data = await res.json();
    setPayouts(data.payouts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  async function handleCreate() {
    if (!amount) return;
    await fetch("/api/v1/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountFcfa: Number(amount), note }),
    });
    setAmount("");
    setNote("");
    await fetchPayouts();
  }

  async function handleUpdateStatus(payoutId: string, status: string) {
    await fetch("/api/v1/admin/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutId, status }),
    });
    await fetchPayouts();
  }

  return (
    <>
      <AdminTopBar title="Décaissements Verzapay" />
      <div className="p-6 md:p-8 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-6">
          <h2 className="text-white font-semibold mb-4">Nouvelle demande de décaissement</h2>
          <div className="flex flex-wrap gap-3">
            <input
              type="number"
              placeholder="Montant en FCFA"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-white outline-none focus:border-gold/50 w-48"
            />
            <input
              type="text"
              placeholder="Note (optionnel)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-white outline-none focus:border-gold/50"
            />
            <button
              onClick={handleCreate}
              className="rounded-lg bg-gold-gradient px-5 py-2.5 font-semibold text-obsidian hover:scale-[1.02] transition-transform"
            >
              Créer
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-obsidian-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/50">
                <th className="p-4 font-medium">Montant</th>
                <th className="p-4 font-medium">Note</th>
                <th className="p-4 font-medium">Statut</th>
                <th className="p-4 font-medium">Créé le</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-white/40">Chargement...</td></tr>
              ) : payouts.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-white/40">Aucun décaissement.</td></tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0">
                    <td className="p-4 text-white">{p.amountFcfa.toLocaleString("fr-FR")} FCFA</td>
                    <td className="p-4 text-white/60">{p.note ?? "—"}</td>
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 rounded-md bg-gold/10 text-gold capitalize">{p.status}</span>
                    </td>
                    <td className="p-4 text-white/60">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="p-4 space-x-3">
                      {p.status !== "completed" && (
                        <button onClick={() => handleUpdateStatus(p.id, "processing")} className="text-xs text-blue-400 hover:underline">
                          Traiter
                        </button>
                      )}
                      {p.status !== "completed" && (
                        <button onClick={() => handleUpdateStatus(p.id, "completed")} className="text-xs text-emerald-400 hover:underline">
                          Marquer payé
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
