import { MODELS_CATALOG } from "@/lib/models-catalog";
import type { ProviderId } from "@/types";

const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: "OpenAI", anthropic: "Anthropic", google: "Google", xai: "xAI",
  deepseek: "DeepSeek", mistral: "Mistral AI", moonshot: "Moonshot AI (Kimi)",
  minimax: "MiniMax", zai: "Z.ai", stepfun: "StepFun",
};

const FEATURED_IDS = ["GPT-5", "Claude Sonnet 5", "Gemini 2.5 Pro", "DeepSeek V3"];

export function ModelsShowcase() {
  const featured = MODELS_CATALOG.filter((m) => FEATURED_IDS.includes(m.displayName)).slice(0, 4);
  const totalModels = MODELS_CATALOG.length;

  return (
    <section id="modeles" className="mx-auto max-w-7xl px-5 sm:px-6 py-16 sm:py-20">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Les meilleurs modèles <span className="gold-text">à portée de main</span>
          </h2>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-white/60">
            Pas d&apos;abonnement séparé, payez uniquement ce que vous utilisez.
          </p>
        </div>
        <span className="self-start sm:self-auto shrink-0 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-gold">
          {totalModels}+ MODÈLES CONNECTÉS
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {featured.map((model) => (
          <div key={model.displayName} className="rounded-2xl border border-white/10 bg-obsidian-card p-5 card-glow transition-all">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {PROVIDER_LABELS[model.provider]}
            </span>
            <h3 className="text-white font-semibold mt-1.5 mb-2">{model.displayName}</h3>
            <p className="text-xs text-white/55 leading-relaxed mb-4 min-h-[48px]">{model.description}</p>
            <p className="text-gold text-sm font-semibold">
              ${model.inputPricePerMTokUsd.toFixed(2)} <span className="text-white/40 font-normal">/ 1M tokens</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <a href="/register" className="text-sm text-gold hover:underline">
          Voir les {totalModels - 4}+ autres modèles →
        </a>
      </div>
    </section>
  );
}