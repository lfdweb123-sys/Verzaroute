"use client";

import { useEffect, useState } from "react";
import { AdminTopBar } from "@/components/admin/TopBar";
import { Users, Wallet, Activity, Banknote } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalCreditsInCirculation: number;
  totalCallsSuccess: number;
  totalCallsError: number;
  totalRevenueFcfa: number;
  usageByModel: Record<string, { calls: number; credits: number }>;
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-obsidian-card p-6 card-glow transition-all">
      <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center mb-4">
        <Icon size={18} className="text-gold" />
      </div>
      <p className="text-sm text-white/50 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/v1/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const modelRows = stats ? Object.entries(stats.usageByModel).sort((a, b) => b[1].calls - a[1].calls) : [];

  return (
    <>
      <AdminTopBar title="Statistiques globales" />
      <div className="p-6 md:p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard icon={Users} label="Utilisateurs" value={stats ? String(stats.totalUsers) : "..."} />
          <StatCard
            icon={Wallet}
            label="Crédits en circulation"
            value={stats ? stats.totalCreditsInCirculation.toLocaleString("fr-FR") : "..."}
          />
          <StatCard
            icon={Activity}
            label="Appels réussis / échoués"
            value={stats ? `${stats.totalCallsSuccess} / ${stats.totalCallsError}` : "..."}
          />
          <StatCard
            icon={Banknote}
            label="Revenu total (FCFA)"
            value={stats ? stats.totalRevenueFcfa.toLocaleString("fr-FR") : "..."}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-6">
          <h2 className="text-white font-semibold mb-4">Usage par modèle</h2>
          {modelRows.length === 0 ? (
            <p className="text-white/50 text-sm">Aucune donnée pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {modelRows.map(([model, data]) => (
                <div key={model} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                  <span className="text-white/80">{model}</span>
                  <span className="text-white/50">{data.calls} appels</span>
                  <span className="text-gold">{data.credits.toLocaleString("fr-FR")} crédits</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
