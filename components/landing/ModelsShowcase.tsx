import { MODELS_CATALOG } from "@/lib/models-catalog";
import type { ProviderId } from "@/types";

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
};

const PROVIDER_COLORS: Record<ProviderId, string> = {
  openai: "from-emerald-500/20 to-emerald-500/0",
  anthropic: "from-orange-500/20 to-orange-500/0",
  google: "from-blue-500/20 to-blue-500/0",
  xai: "from-slate-400/20 to-slate-400/0",
  deepseek: "from-indigo-500/20 to-indigo-500/0",
  mistral: "from-red-500/20 to-red-500/0",
  moonshot: "from-purple-500/20 to-purple-500/0",
  minimax: "from-pink-500/20 to-pink-500/0",
  zai: "from-cyan-500/20 to-cyan-500/0",
  stepfun: "from-yellow-500/20 to-yellow-500/0",
};

export function ModelsShowcase() {
  return (
    <section id="modeles" className="mx-auto max-w-7xl px-6 py-24">
      <div className="text-center mb-14">
        <span className="inline-block rounded-full border border-gold/30 bg-gold/5 px-4 py-1 text-xs font-medium tracking-wide text-gold uppercase">
          10 fournisseurs, un seul accès
        </span>
        <h2 className="mt-5 text-3xl md:text-5xl font-bold text-white">
          Tous les meilleurs modèles IA, <span className="gold-text">une seule clé</span>
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-white/60">
          VerzaRoute agrège GPT, Claude, Gemini, Grok, DeepSeek, Mistral, Kimi, MiniMax, Z.ai et StepFun.
          Changez de modèle en changeant simplement un paramètre — votre code ne change pas.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {MODELS_CATALOG.map((model) => (
          <div
            key={model.displayName}
            className={`card-glow relative overflow-hidden rounded-2xl border border-white/10 bg-obsidian-card p-6 transition-all bg-gradient-to-br ${PROVIDER_COLORS[model.provider]}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                {PROVIDER_LABELS[model.provider]}
              </span>
              <span className="rounded-full bg-gold/10 border border-gold/30 px-2.5 py-0.5 text-[11px] text-gold">
                {(model.contextWindow / 1000).toFixed(0)}K ctx
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1.5">{model.displayName}</h3>
            <p className="text-sm text-white/60 mb-4 leading-relaxed">{model.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {model.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/50">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
