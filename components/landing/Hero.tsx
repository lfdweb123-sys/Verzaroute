import Link from "next/link";
import { ArrowRight, KeyRound, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.12),transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-6 pt-28 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs text-gold mb-8">
          <Zap size={14} /> AI Payment Routing Platform
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-white">
          Une clé API. <span className="gold-text">Tous les modèles IA.</span>
          <br /> Payez en Mobile Money ou carte.
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-white/60">
          VerzaRoute connecte votre application à GPT, Claude, Gemini, Grok, DeepSeek, Mistral, Kimi,
          MiniMax, Z.ai et StepFun via un seul endpoint compatible OpenAI, facturé sur un solde de
          crédits unique. Utilisez nos crédits ou branchez vos propres clés fournisseurs, comme vous
          le souhaitez.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-7 py-3.5 font-semibold text-obsidian shadow-gold transition-transform hover:scale-[1.03]"
          >
            Créer mon compte gratuit <ArrowRight size={18} />
          </Link>
          <Link
            href="#comment-ca-marche"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-7 py-3.5 font-semibold text-white/80 hover:border-gold/40 hover:text-white transition-colors"
          >
            <KeyRound size={18} /> Voir comment ça marche
          </Link>
        </div>

        <div className="mt-14 mx-auto max-w-2xl rounded-2xl border border-white/10 bg-obsidian-card p-4 text-left font-mono text-sm text-white/70 shadow-2xl">
          <div className="flex gap-1.5 mb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
          </div>
          <pre className="whitespace-pre-wrap leading-relaxed">
{`curl https://verzaroute.com/api/v1/chat/completions \\
  -H "Authorization: Bearer vzr_sk_..." \\
  -d '{
    "model": "claude-sonnet-5",
    "messages": [{"role": "user", "content": "Bonjour !"}]
  }'`}
          </pre>
        </div>
      </div>
    </section>
  );
}
