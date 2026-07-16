import { MODELS_CATALOG } from "@/lib/models-catalog";
import type { ProviderId } from "@/types";

const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: "OpenAI", anthropic: "Anthropic", google: "Google", xai: "xAI",
  deepseek: "DeepSeek", mistral: "Mistral AI", moonshot: "Moonshot AI (Kimi)",
  minimax: "MiniMax", zai: "Z.ai", stepfun: "StepFun", meta: "Meta AI (Llama)",
};

const PROVIDER_ACCENT: Record<ProviderId, string> = {
  openai: "from-emerald-400/70 to-emerald-400/0",
  anthropic: "from-orange-400/70 to-orange-400/0",
  google: "from-blue-400/70 to-blue-400/0",
  xai: "from-slate-300/70 to-slate-300/0",
  deepseek: "from-indigo-400/70 to-indigo-400/0",
  mistral: "from-red-400/70 to-red-400/0",
  moonshot: "from-purple-400/70 to-purple-400/0",
  minimax: "from-pink-400/70 to-pink-400/0",
  zai: "from-cyan-400/70 to-cyan-400/0",
  stepfun: "from-yellow-400/70 to-yellow-400/0",
  meta: "from-blue-500/70 to-blue-500/0",
};

const FEATURED_IDS = [
  "GPT-5.5 Pro",
  "Claude Sonnet 5",
  "Gemini 3.1 Pro",
  "DeepSeek V3",
  "Grok 4",
  "Mistral Large",
  "Kimi K2.6",
  "Llama 3.3 70B",
];
const POPULAR_MODEL = "Claude Sonnet 5";

export function ModelsShowcase() {
  const featured = MODELS_CATALOG.filter((m) => FEATURED_IDS.includes(m.displayName)).slice(0, 8);
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
        {featured.map((model) => {
          const isPopular = model.displayName === POPULAR_MODEL;
          return (
            <div
              key={model.displayName}
              className={`group relative rounded-2xl border bg-obsidian-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-gold overflow-hidden ${
                isPopular ? "border-gold/40" : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${PROVIDER_ACCENT[model.provider]}`} />

              {isPopular && (
                <span className="absolute top-3 right-3 rounded-full bg-gold-gradient px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-obsidian">
                  Populaire
                </span>
              )}

              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {PROVIDER_LABELS[model.provider]}
                </span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
                  {(model.contextWindow / 1000).toFixed(0)}K ctx
                </span>
              </div>

              <h3 className="text-white font-semibold mb-2 group-hover:text-gold transition-colors">
                {model.displayName}
              </h3>
              <p className="text-xs text-white/55 leading-relaxed mb-4 min-h-[48px]">{model.description}</p>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <p className="text-gold text-sm font-semibold">
                  ${model.inputPricePerMTokUsd.toFixed(2)}
                  <span className="text-white/40 font-normal text-xs"> /1M tokens</span>
                </p>
                <div className="flex gap-1">
                  {model.tags.slice(0, 1).map((tag) => (
                    <span key={tag} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        
        <a  href="/register"
          className="inline-flex items-center gap-1.5 text-sm text-gold hover:gap-2.5 transition-all"
        >
          Voir les {totalModels - 8}+ autres modèles <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}