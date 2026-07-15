"use client";

import { useEffect, useState } from "react";
import { AdminTopBar } from "@/components/admin/TopBar";
import type { PlatformSettings } from "@/types";
import { Check } from "lucide-react";

const DEFAULTS: PlatformSettings = {
  creditToUsdRate: 0.001,
  fcfaToUsdRate: 610,
  minPurchaseFcfa: 1000,
  theme: {
    primaryColor: "#D4AF37",
    primaryColorDark: "#C9A227",
    backgroundColor: "#0a0a0a",
    surfaceColor: "#121212",
    accentColor: "#F0D878",
    updatedAt: Date.now(),
    updatedBy: "system",
  },
};

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/70">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded cursor-pointer bg-transparent border border-white/15"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 rounded-md bg-obsidian border border-white/15 px-2 py-1 text-white text-xs font-mono"
        />
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data.settings ?? DEFAULTS))
      .finally(() => setLoading(false));
  }, []);

  function updateTheme(field: keyof PlatformSettings["theme"], value: string) {
    setSettings((prev) => ({ ...prev, theme: { ...prev.theme, [field]: value } }));
  }

  async function handleSave() {
    await fetch("/api/v1/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <>
        <AdminTopBar title="Apparence & réglages" />
        <div className="p-8 text-white/50 text-sm">Chargement...</div>
      </>
    );
  }

  return (
    <>
      <AdminTopBar title="Apparence & réglages" />
      <div className="p-6 md:p-8 max-w-2xl space-y-6">
        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-6">
          <h2 className="text-white font-semibold mb-1">Personnalisation des couleurs</h2>
          <p className="text-white/50 text-sm mb-4">
            Ces couleurs s'appliquent instantanément à toute la plateforme (exigence n°10).
          </p>
          <ColorField label="Couleur primaire (or)" value={settings.theme.primaryColor} onChange={(v) => updateTheme("primaryColor", v)} />
          <ColorField label="Couleur primaire foncée" value={settings.theme.primaryColorDark} onChange={(v) => updateTheme("primaryColorDark", v)} />
          <ColorField label="Fond (noir)" value={settings.theme.backgroundColor} onChange={(v) => updateTheme("backgroundColor", v)} />
          <ColorField label="Surface (cartes)" value={settings.theme.surfaceColor} onChange={(v) => updateTheme("surfaceColor", v)} />
          <ColorField label="Accent" value={settings.theme.accentColor} onChange={(v) => updateTheme("accentColor", v)} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-6">
          <h2 className="text-white font-semibold mb-4">Taux de conversion</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">1 crédit = X USD</label>
              <input
                type="number"
                step="0.0001"
                value={settings.creditToUsdRate}
                onChange={(e) => setSettings((p) => ({ ...p, creditToUsdRate: Number(e.target.value) }))}
                className="w-full rounded-md bg-obsidian border border-white/15 px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">1 USD = X FCFA</label>
              <input
                type="number"
                value={settings.fcfaToUsdRate}
                onChange={(e) => setSettings((p) => ({ ...p, fcfaToUsdRate: Number(e.target.value) }))}
                className="w-full rounded-md bg-obsidian border border-white/15 px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Achat minimum (FCFA)</label>
              <input
                type="number"
                value={settings.minPurchaseFcfa}
                onChange={(e) => setSettings((p) => ({ ...p, minPurchaseFcfa: Number(e.target.value) }))}
                className="w-full rounded-md bg-obsidian border border-white/15 px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-gold-gradient px-6 py-3 font-semibold text-obsidian hover:scale-[1.02] transition-transform"
        >
          {saved && <Check size={16} />}
          {saved ? "Enregistré" : "Enregistrer les modifications"}
        </button>
      </div>
    </>
  );
}
