"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import type { UsageLog } from "@/types";
import { CheckCircle2, XCircle } from "lucide-react";

export default function HistoryPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<UsageLog[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "usageLogs"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UsageLog));
    });
    return () => unsub();
  }, [user]);

  return (
    <>
      {/* Masqué sur mobile, visible uniquement sur desktop */}
      <div className="hidden md:block">
        <DashboardTopBar title="Historique des appels" />
      </div>

      {/* pb-24 compense le bottom menu sur mobile, pt-4 remplace l'espace de la topbar cachée */}
      <div className="p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
        {/* ===== VUE MOBILE : cartes empilées ===== */}
        <div className="sm:hidden space-y-3">
          {logs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-obsidian-card p-6 text-center text-white/40 text-sm">
              Aucun appel effectué pour le moment.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-white/10 bg-obsidian-card p-4 space-y-3"
              >
                {/* Ligne 1 : Date + Statut */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">
                    {new Date(log.createdAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    className={
                      log.status === "success"
                        ? "inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md"
                        : "inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-md"
                    }
                  >
                    {log.status === "success" ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    {log.status === "success" ? "Succès" : "Échec"}
                  </span>
                </div>

                {/* Ligne 2 : Modèle */}
                <div>
                  <p className="text-white font-semibold text-sm">{log.model}</p>
                  <p className="text-xs text-white/40 capitalize">{log.provider}</p>
                </div>

                {/* Ligne 3 : Tokens + Coût */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  <div>
                    <span className="text-white/40">Tokens </span>
                    <span className="text-white/70">
                      {log.inputTokens} / {log.outputTokens}
                    </span>
                  </div>
                  <div className="text-gold font-semibold">
                    {log.creditsCharged} crédits
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ===== VUE DESKTOP : tableau classique ===== */}
        <div className="hidden sm:block rounded-2xl border border-white/10 bg-obsidian-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/50">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Modèle</th>
                <th className="p-4 font-medium">Fournisseur</th>
                <th className="p-4 font-medium">Tokens (in/out)</th>
                <th className="p-4 font-medium">Coût</th>
                <th className="p-4 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-white/40">
                    Aucun appel effectué pour le moment.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5 last:border-0">
                  <td className="p-4 text-white/70 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("fr-FR")}
                  </td>
                  <td className="p-4 text-white font-medium">{log.model}</td>
                  <td className="p-4 text-white/60 capitalize">{log.provider}</td>
                  <td className="p-4 text-white/60">
                    {log.inputTokens} / {log.outputTokens}
                  </td>
                  <td className="p-4 text-white/80">{log.creditsCharged} crédits</td>
                  <td className="p-4">
                    <span
                      className={
                        log.status === "success"
                          ? "inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md"
                          : "inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-md"
                      }
                    >
                      {log.status === "success" ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <XCircle size={12} />
                      )}
                      {log.status === "success" ? "Succès" : "Échec"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}