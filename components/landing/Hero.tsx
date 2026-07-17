import Link from "next/link";
import { ArrowRight, FileText, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Rayures verticales dorées subtiles */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #D4AF37 0px, #D4AF37 1px, transparent 1px, transparent 64px)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.14),transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 pt-14 sm:pt-20 md:pt-24 pb-14 sm:pb-20">


        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.1] text-white">
              Tous les meilleurs <span className="gold-text">modèles d'IA</span>, réunis sur une seule plateforme.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-white/60 max-w-lg">
              Pourquoi créer plusieurs comptes et passer d'un site à un autre pour utiliser ChatGPT, Claude, Gemini, Llama et d'autres modèles ? VerzaRoute centralise les meilleures intelligences artificielles dans une seule interface afin de discuter, créer et innover plus rapidement.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 py-3.5 font-semibold text-obsidian shadow-gold transition-transform hover:scale-[1.03]"
              >
                S'inscrire <ArrowRight size={18} />
              </Link>

              <Link
                href="/essai-gratuit"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/5 px-6 py-3.5 font-semibold text-gold hover:bg-gold/10 transition-colors animate-pulse"
              >
                Essai gratuit <Sparkles size={18} />
              </Link>

              <Link
                href="#comment-ca-marche"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 font-semibold text-white/80 hover:border-gold/40 hover:text-white transition-colors"
              >
                <FileText size={18} /> Découvrir
              </Link>
            </div>
          </div>

          <div className="relative flex items-center justify-center self-stretch">
            <AiGlobe />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Globe stylisé représentant le routage mondial des requêtes IA : sphère
 * filaire tournante avec nœuds lumineux (data centers / fournisseurs) reliés
 * par des arcs, en pur SVG/CSS animé — pas de dépendance 3D lourde.
 */
function AiGlobe() {
  const nodes = [
    { cx: 180, cy: 90 },
    { cx: 230, cy: 175 },
    { cx: 140, cy: 210 },
    { cx: 300, cy: 140 },
    { cx: 260, cy: 230 },
  ];
  const arcs: [number, number][] = [
    [2, 0], [2, 1], [2, 3], [1, 0], [3, 4], [0, 3],
  ];

  return (
    <div className="relative w-full max-w-[420px] aspect-square">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(212,175,55,0.16),transparent_70%)] blur-2xl" />

      <svg viewBox="0 0 400 400" className="relative w-full h-full animate-[spin_40s_linear_infinite]">
        <defs>
          <radialGradient id="globeFill" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
            <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
        </defs>

        <circle cx="200" cy="200" r="150" fill="url(#globeFill)" stroke="#D4AF37" strokeOpacity="0.25" />

        {[0, 30, 60, 90, 120, 150].map((angle) => (
          <ellipse
            key={angle}
            cx="200"
            cy="200"
            rx={150 * Math.abs(Math.cos((angle * Math.PI) / 180))}
            ry="150"
            fill="none"
            stroke="#D4AF37"
            strokeOpacity="0.12"
            transform={`rotate(${angle} 200 200)`}
          />
        ))}
        {[-100, -50, 0, 50, 100].map((y) => (
          <ellipse
            key={y}
            cx="200"
            cy={200 + y}
            rx={Math.sqrt(150 * 150 - y * y)}
            ry={Math.sqrt(150 * 150 - y * y) * 0.28}
            fill="none"
            stroke="#D4AF37"
            strokeOpacity="0.12"
          />
        ))}

        {arcs.map(([a, b], i) => {
          const n1 = nodes[a];
          const n2 = nodes[b];
          const mx = (n1.cx + n2.cx) / 2;
          const my = (n1.cy + n2.cy) / 2 - 40;
          return (
            <path
              key={i}
              d={`M ${n1.cx} ${n1.cy} Q ${mx} ${my} ${n2.cx} ${n2.cy}`}
              fill="none"
              stroke="url(#arcGrad)"
              strokeWidth="1.5"
              className="animate-pulse"
              style={{ animationDuration: `${3 + i * 0.4}s` }}
            />
          );
        })}

        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.cx} cy={n.cy} r="10" fill="#D4AF37" opacity="0.15" className="animate-ping" style={{ animationDuration: "2.5s" }} />
            <circle cx={n.cx} cy={n.cy} r="4" fill="#F0D878" />
          </g>
        ))}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="rounded-2xl border border-gold/30 bg-obsidian-card/90 backdrop-blur-sm px-5 py-4 shadow-gold text-center">
          <p className="text-2xl font-bold text-gold">10+</p>
          <p className="text-[11px] text-white/50 uppercase tracking-wide">Fournisseurs IA connectés</p>
        </div>
      </div>
    </div>
  );
}