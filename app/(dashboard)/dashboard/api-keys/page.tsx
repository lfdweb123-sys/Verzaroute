"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import { KeyRound, Copy, Trash2, Plus, Check, AlertTriangle } from "lucide-react";

interface ApiKeyView {
  id: string;
  prefix: string;
  label: string;
  createdAt: number;
  lastUsedAt: number | null;
  revoked: boolean;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/keys");
      const data = await res.json();
      if (res.ok) setKeys(data.keys ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel || "Clé par défaut" }),
      });
      const data = await res.json();
      if (res.ok) {
        setRevealedKey(data.key);
        setNewLabel("");
        await fetchKeys();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm("Révoquer cette clé ? Toute application l'utilisant cessera de fonctionner immédiatement.")) return;
    await fetch("/api/v1/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId }),
    });
    await fetchKeys();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* Masqué sur mobile, visible uniquement sur desktop */}
      <div className="hidden md:block">
        <DashboardTopBar title="Clés API" />
      </div>

      {/* pb-24 compense le bottom menu sur mobile, max-w-3xl mx-auto centre le contenu */}
      <div className="p-4 sm:p-6 md:p-8 pb-24 md:pb-8 space-y-4 sm:space-y-6 max-w-3xl mx-auto">
        
        {/* Bannière de clé révélée */}
        {revealedKey && (
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 sm:p-5 animate-fade-in">
            <div className="flex items-start gap-2 text-gold mb-3">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span className="text-sm font-semibold leading-snug">
                Copiez cette clé maintenant — elle ne sera plus jamais affichée
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-obsidian border border-white/10 p-3 font-mono text-xs sm:text-sm text-white break-all">
              <span className="flex-1">{revealedKey}</span>
              <button 
                onClick={() => copyToClipboard(revealedKey)} 
                className="shrink-0 p-1 text-gold hover:text-gold-light transition-colors"
                aria-label="Copier la clé"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <button 
              onClick={() => setRevealedKey(null)} 
              className="mt-3 text-xs text-white/50 hover:text-white transition-colors"
            >
              J'ai copié ma clé, fermer
            </button>
          </div>
        )}

        {/* Formulaire de création */}
        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-4 sm:p-6">
          <h2 className="text-white font-semibold mb-4">Créer une nouvelle clé</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nom de la clé (ex: Production)"
              className="flex-1 rounded-lg border border-white/15 bg-obsidian px-3.5 py-2.5 text-white outline-none focus:border-gold/50 transition-colors"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center justify-center gap-2 rounded-lg bg-gold-gradient px-5 py-2.5 font-semibold text-obsidian hover:scale-[1.02] transition-transform disabled:opacity-60 w-full sm:w-auto shrink-0"
            >
              <Plus size={16} />
              {creating ? "Création..." : "Générer"}
            </button>
          </div>
        </div>

        {/* Liste des clés */}
        <div className="rounded-2xl border border-white/10 bg-obsidian-card p-4 sm:p-6">
          <h2 className="text-white font-semibold mb-4">Vos clés</h2>
          {loading ? (
            <p className="text-white/50 text-sm">Chargement...</p>
          ) : keys.length === 0 ? (
            <p className="text-white/50 text-sm">Aucune clé API pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 p-3 sm:p-4 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                      <KeyRound size={16} className="text-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{k.label}</p>
                      <p className="text-white/40 text-xs font-mono truncate">{k.prefix}••••••••••</p>
                    </div>
                  </div>
                  {k.revoked ? (
                    <span className="text-xs text-red-400 shrink-0">Révoquée</span>
                  ) : (
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="shrink-0 p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Révoquer"
                      aria-label={`Révoquer la clé ${k.label}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}