import Link from "next/link";
import { ArrowRight, PlayCircle, Radio } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.14),transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 pt-16 sm:pt-24 md:pt-28 pb-14 sm:pb-20">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-[11px] sm:text-xs text-gold mb-6 sm:mb-8">
            <Radio size={12} className="animate-pulse" />
            ROUTING ENGINE V2.4 LIVE — disponible en zone CFA
          </div>
        </div>

        <h1 className="text-center text-3xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] text-white">
          Une seule API pour <span className="gold-text">tous les modèles</span> IA mondiaux.
        </h1>
        <p className="mt-5 sm:mt-6 max-w-2xl mx-auto text-center text-base sm:text-lg text-white/60">
          Optimisez vos latences, réduisez vos coûts et sécurisez vos flux LLM avec une couche de
          routage programmatique haute performance, payable localement en Mobile Money ou carte.
        </p>

        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gold-gradient px-7 py-3.5 font-semibold text-obsidian shadow-gold transition-transform hover:scale-[1.03]"
          >
            Démarrer gratuitement <ArrowRight size={18} />
          </Link>
          <Link
            href="#comment-ca-marche"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-7 py-3.5 font-semibold text-white/80 hover:border-gold/40 hover:text-white transition-colors"
          >
            <PlayCircle size={18} /> Voir comment ça marche
          </Link>
        </div>

        <div className="mt-12 sm:mt-14 mx-auto max-w-2xl rounded-2xl border border-white/10 bg-obsidian-card overflow-hidden shadow-2xl">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
            <span className="ml-3 text-[11px] text-white/30 font-mono">bash — verzaroute_config.sh</span>
          </div>
          <pre className="p-4 sm:p-5 overflow-x-auto text-[12px] sm:text-sm font-mono leading-relaxed text-white/70 whitespace-pre">
<span className="text-gold/80">export default</span> <span className="text-white">defineVerzaRoute</span>({"{"}
  strategy: <span className="text-emerald-400">&apos;latency-optimized&apos;</span>,
  endpoints: [
    {"{"} id: <span className="text-emerald-400">&apos;primary&apos;</span>, provider: <span className="text-emerald-400">&apos;openai&apos;</span>, weight: 80 {"}"},
    {"{"} id: <span className="text-emerald-400">&apos;fallback&apos;</span>, provider: <span className="text-emerald-400">&apos;anthropic&apos;</span>, weight: 20 {"}"}
  ],
  middleware: [<span className="text-emerald-400">&apos;rate-limit&apos;</span>, <span className="text-emerald-400">&apos;cache&apos;</span>]
{"}"});
          </pre>
        </div>

        <div className="mt-8 sm:mt-10 grid grid-cols-3 gap-3 sm:gap-4 max-w-xl mx-auto">
          {[
            { value: "99.9%", label: "Uptime garanti" },
            { value: "<14ms", label: "Latence additionnelle" },
            { value: "2M+", label: "Requêtes / minute" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-obsidian-card px-3 py-4 text-center">
              <p className="text-gold font-bold text-base sm:text-lg">{stat.value}</p>
              <p className="text-white/40 text-[10px] sm:text-xs mt-1 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}