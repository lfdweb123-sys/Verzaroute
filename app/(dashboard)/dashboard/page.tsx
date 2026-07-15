"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import { Wallet, KeyRound, Activity, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { UsageLog } from "@/types";

function StatCard({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href?: string }) {
  const content = (
    <div className="rounded-2xl border border-white/10 bg-obsidian-card p-4 sm:p-6 card-glow transition-all h-full">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center">
          <Icon size={18} className="text-gold" />
        </div>
      </div>
      <p className="text-xs sm:text-sm text-white/50 mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-white truncate">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [keysCount, setKeysCount] = useState<number | null>(null);
  const [recentLogs, setRecentLogs] = useState<UsageLog[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setBalance(snap.data()?.creditsBalance ?? 0);
    });

    const unsubKeys = onSnapshot(
      query(collection(db, "apiKeys"), where("uid", "==", user.uid), where("revoked", "==", false)),
      (snap) => setKeysCount(snap.size)
    );

    const unsubLogs = onSnapshot(
      query(collection(db, "usageLogs"), where("uid", "==", user.uid), orderBy("createdAt", "desc"), limit(8)),
      (snap) => setRecentLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UsageLog))
    );

    return () => {
      unsubUser();
      unsubKeys();
      unsubLogs();
    };
  }, [user]);

  const totalCreditsUsed = recentLogs.reduce((sum, l) => sum + (l.creditsCharged || 0), 0);

  return (
    <>
      {/* Masqué sur mobile, visible uniquement sur desktop */}
      <div className="hidden md:block">
        <DashboardTopBar title="Vue d'ensemble" />
      </div>

      {/* pb-24 compense le bottom menu sur mobile, pt-4 remplace l'espace de la topbar cachée */}
      <div className="p-4 sm:p-6 md:p-8 pb-24 md:pb-8 space-y-6 md:space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <StatCard icon={Wallet} label="Solde de crédits" value={balance === null ? "..." : balance.toLocaleString("fr-FR")} href="/dashboard/billing" />
          <StatCard icon={KeyRound} label="Clés API actives" value={keysCount === null ? "..." : String(keysCount)} href="/dashboard/api-keys" />
          <StatCard icon={Activity} label="Appels récents" value={String(recentLogs.length)} href="/dashboard/history" />
          <StatCard icon={TrendingUp} label="Crédits consommés" value={totalCreditsUsed.toLocaleString("fr-FR")} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-4 sm:p-6">
          <h2 className="text-white font-semibold mb-4">Démarrage rapide</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-white/10 p-4 hover:border-gold/30 transition-colors">
              <p className="text-white/70 mb-2">1. Générez votre clé API</p>
              <Link href="/dashboard/api-keys" className="text-gold hover:underline inline-flex items-center gap-1">
                Aller dans Clés API <span>→</span>
              </Link>
            </div>
            <div className="rounded-xl border border-white/10 p-4 hover:border-gold/30 transition-colors">
              <p className="text-white/70 mb-2">2. Rechargez votre solde</p>
              <Link href="/dashboard/billing" className="text-gold hover:underline inline-flex items-center gap-1">
                Acheter des crédits <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-4 sm:p-6">
          <h2 className="text-white font-semibold mb-4">Activité récente</h2>
          {recentLogs.length === 0 ? (
            <p className="text-white/50 text-sm">Aucun appel effectué pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <span className="text-white/80 truncate mr-2">{log.model}</span>
                  <span className={`shrink-0 ${log.status === "success" ? "text-emerald-400" : "text-red-400"}`}>
                    {log.status === "success" ? `-${log.creditsCharged} crédits` : "Échec"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}