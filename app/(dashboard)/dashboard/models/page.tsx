"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DashboardTopBar } from "@/components/dashboard/TopBar";
import type { AiModel, ProviderId } from "@/types";
import { MessageSquare, ImagePlus, Film } from "lucide-react";
import Link from "next/link";

const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  deepseek: "DeepSeek",
  mistral: "Mistral AI",
  moonshot: "Moonshot AI (Kimi)",
  minimax: "MiniMax",
  zai: "Z.ai",
  stepfun: "StepFun",
  meta: "Meta AI (Llama)",
};

/** Détermine la page dashboard adaptée et le libellé du bouton selon la modality du modèle. */
function getActionFor(model: AiModel): { href: string; label: string; icon: typeof MessageSquare } {
  if (model.modality === "image") {
    return { href: `/dashboard/images?model=${model.id}`, label: "Générer une image", icon: ImagePlus };
  }
  if (model.modality === "video") {
    return { href: `/dashboard/videos?model=${model.id}`, label: "Générer une vidéo", icon: Film };
  }
  return { href: `/dashboard/chat?model=${model.id}`, label: "Discuter", icon: MessageSquare };
}

export default function ModelsPage() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "models"), orderBy("displayName"));
    const unsub = onSnapshot(q, (snap) => {
      setModels(snap.docs.map((d) => d.data() as AiModel).filter((m) => m.enabled));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <>
      <DashboardTopBar title="Modèles disponibles" />
      <div className="p-6 md:p-8">
        {loading ? (
          <p className="text-white/50 text-sm">Chargement des modèles...</p>
        ) : models.length === 0 ? (
          <p className="text-white/50 text-sm">
            Aucun modèle disponible pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {models.map((model) => (
              <div key={model.id} className="rounded-2xl border border-white/10 bg-obsidian-card p-5 card-glow transition-all flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    {PROVIDER_LABELS[model.provider]}
                  </span>
                  <span className="rounded-full bg-gold/10 border border-gold/30 px-2.5 py-0.5 text-[11px] text-gold">
                    {(model.contextWindow / 1000).toFixed(0)}K ctx
                  </span>
                </div>
                <h3 className="text-white font-semibold mb-1.5">{model.displayName}</h3>
                <p className="text-sm text-white/60 mb-4 leading-relaxed flex-1">{model.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {model.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/50">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <p className="text-xs text-white/40">
                    ${model.inputPricePerMTokUsd.toFixed(2)} / ${model.outputPricePerMTokUsd.toFixed(2)}
                    <span className="block">par 1M tokens (in/out)</span>
                  </p>
                  {(() => {
                    const action = getActionFor(model);
                    const ActionIcon = action.icon;
                    return (
                      <Link
                        href={action.href}
                        className="flex items-center gap-1.5 rounded-lg bg-gold-gradient px-3 py-2 text-xs font-semibold text-obsidian hover:scale-[1.03] transition-transform"
                      >
                        <ActionIcon size={14} /> {action.label}
                      </Link>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}