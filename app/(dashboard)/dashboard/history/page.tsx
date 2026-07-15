"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import type { UsageLog } from "@/types";

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
      <DashboardTopBar title="Historique des appels" />
      <div className="p-6 md:p-8">
        <div className="rounded-2xl border border-white/10 bg-obsidian-card overflow-x-auto">
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
                  <td className="p-4 text-white">{log.model}</td>
                  <td className="p-4 text-white/60 capitalize">{log.provider}</td>
                  <td className="p-4 text-white/60">
                    {log.inputTokens} / {log.outputTokens}
                  </td>
                  <td className="p-4 text-white/80">{log.creditsCharged} crédits</td>
                  <td className="p-4">
                    <span
                      className={
                        log.status === "success"
                          ? "text-emerald-400 text-xs bg-emerald-500/10 px-2 py-1 rounded-md"
                          : "text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded-md"
                      }
                    >
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
