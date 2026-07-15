"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminTopBar } from "@/components/admin/TopBar";
import type { AiModel } from "@/types";
import { cn } from "@/lib/utils/cn";

export default function AdminModelsPage() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/admin/models");
    const data = await res.json();
    setModels(data.models ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  async function updateModel(modelId: string, updates: Partial<AiModel>) {
    setSavingId(modelId);
    setModels((prev) => prev.map((m) => (m.id === modelId ? { ...m, ...updates } : m)));
    try {
      await fetch("/api/v1/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, updates }),
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <AdminTopBar title="Modèles & marges" />
      <div className="p-6 md:p-8 space-y-4">
        {loading ? (
          <p className="text-white/50 text-sm">Chargement...</p>
        ) : (
          models.map((model) => (
            <div key={model.id} className="rounded-2xl border border-white/10 bg-obsidian-card p-5 flex flex-wrap items-center gap-6">
              <div className="min-w-[180px]">
                <p className="text-white font-medium">{model.displayName}</p>
                <p className="text-white/40 text-xs capitalize">{model.provider}</p>
              </div>

              <div className="text-xs text-white/50">
                Coût: ${model.inputPricePerMTokUsd}/M in · ${model.outputPricePerMTokUsd}/M out
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-white/50">Marge %</label>
                <input
                  type="number"
                  value={model.marginPercent}
                  onChange={(e) => updateModel(model.id, { marginPercent: Number(e.target.value) })}
                  className="w-20 rounded-md bg-obsidian border border-white/15 px-2 py-1 text-white text-sm"
                />
              </div>

              <button
                onClick={() => updateModel(model.id, { enabled: !model.enabled })}
                disabled={savingId === model.id}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border ml-auto",
                  model.enabled
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    : "border-white/15 text-white/40"
                )}
              >
                {model.enabled ? "Activé" : "Désactivé"}
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
