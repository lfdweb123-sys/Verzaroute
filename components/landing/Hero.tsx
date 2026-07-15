import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.14),transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 pt-14 sm:pt-20 md:pt-24 pb-14 sm:pb-20">
        <div className="mb-6 sm:mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-[11px] sm:text-xs text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            Maintenant disponible en zone CFA
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.1] text-white">
              Une seule API pour tous les <span className="gold-text">modèles AI</span> mondiaux.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-white/60 max-w-lg">
              VerzaRoute permet aux développeurs africains d&apos;accéder à GPT-4, Claude et Gemini
              via une passerelle unique, payable localement en FCFA.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 py-3.5 font-semibold text-obsidian shadow-gold transition-transform hover:scale-[1.03]">
                Démarrer l&apos;intégration <ArrowRight size={18} />
              </Link>
              <Link href="#comment-ca-marche" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 font-semibold text-white/80 hover:border-gold/40 hover:text-white transition-colors">
                <FileText size={18} /> Documentation
              </Link>
            </div>
          </div>

              <div className="rounded-2xl border border-white/10 bg-obsidian-card overflow-hidden shadow-2xl self-stretch flex flex-col">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/[0.02] shrink-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                  <span className="ml-3 text-[11px] text-white/30 font-mono">curl — verzaroute_request.sh</span>
                </div>
                <pre className="flex-1 p-5 sm:p-6 overflow-x-auto text-[12px] sm:text-[13px] font-mono leading-[1.9] text-white/70 whitespace-pre">
              <span className="text-gold/80">curl</span> https://api.verzaroute.com/v1/chat/completions \
                -H <span className="text-emerald-400">&quot;Authorization: Bearer $VERZA_KEY&quot;</span> \
                -H <span className="text-emerald-400">&quot;Content-Type: application/json&quot;</span> \
                -d <span className="text-white/50">&apos;</span>{"{"}
                  &quot;model&quot;: <span className="text-emerald-400">&quot;claude-3-5-sonnet&quot;</span>,
                  &quot;messages&quot;: [
                    {"{"}
                      &quot;role&quot;: <span className="text-emerald-400">&quot;user&quot;</span>,
                      &quot;content&quot;: <span className="text-emerald-400">&quot;Hello world&quot;</span>
                    {"}"}
                  ],
                  &quot;billing&quot;: <span className="text-emerald-400">&quot;cfa_wallet&quot;</span>
                {"}"}<span className="text-white/50">&apos;</span>

              <span className="text-white/30"># → réponse en moins de 300ms, débit automatique du solde FCFA</span>
                </pre>
              </div>
        </div>
      </div>
    </section>
  );
}