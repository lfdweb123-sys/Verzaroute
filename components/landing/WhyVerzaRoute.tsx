"use client";

import Link from "next/link";
import { Brain, Cpu, MessageSquareText, Cog } from "lucide-react";

/**
 * Visuel central : noyau lumineux doré avec 4 icônes IA rayonnantes reliées
 * par des lignes façon circuit, généré en SVG + icônes superposées (pas une
 * image statique — tout est du code, cohérent avec le thème et redimensionnable).
 */
function CoreIntelligenceVisual() {
  const satellites = [
    { icon: Brain, x: 15, y: 20 },
    { icon: Cog, x: 85, y: 25 },
    { icon: MessageSquareText, x: 20, y: 80 },
    { icon: Cpu, x: 80, y: 78 },
  ];

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl border border-white/10 bg-obsidian-card overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-obsidian via-obsidian-card to-obsidian" />

      <svg viewBox="0 0 100 75" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F0D878" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </radialGradient>
        </defs>
        {satellites.map((s, i) => (
          <path
            key={i}
            d={`M 50 37.5 Q ${(50 + s.x) / 2} ${(37.5 + s.y) / 2 + (i % 2 === 0 ? -8 : 8)} ${s.x} ${s.y}`}
            fill="none"
            stroke="#D4AF37"
            strokeOpacity="0.35"
            strokeWidth="0.4"
          />
        ))}
        <circle cx="50" cy="37.5" r="18" fill="url(#coreGlow)" />
      </svg>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-gold-gradient shadow-gold" />

      {satellites.map(({ icon: Icon, x, y }, i) => (
        <div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-obsidian border border-gold/30 flex items-center justify-center"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <Icon size={15} className="text-gold" />
        </div>
      ))}

      <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-obsidian/90 border border-gold/30 px-2.5 py-1 text-[10px] text-gold">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" /> CORE INTELLIGENCE
      </span>
    </div>
  );
}

export function WhyVerzaRoute() {
  return (
    <section id="pourquoi" className="mx-auto max-w-7xl px-5 sm:px-6 py-16 sm:py-24">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
        <div>
          <span className="inline-block rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-[11px] sm:text-xs text-gold uppercase tracking-wide mb-5">
            Notre mission
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-8">
            Pourquoi avons-nous créé <span className="gold-text">VerzaRoute</span> ?
          </h2>
          <CoreIntelligenceVisual />
        </div>

        <div>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed mb-4">
            L&apos;intelligence artificielle évolue à une vitesse incroyable. Aujourd&apos;hui, chaque
            entreprise développe son propre modèle : <strong className="text-white font-semibold">ChatGPT, Claude, Llama, Gemini, Mistral, Grok</strong> et
            bien d&apos;autres. Chacun possède ses forces, mais les utiliser au quotidien devient
            rapidement compliqué.
          </p>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed mb-6">
            Il faut créer un compte sur chaque plateforme, gérer plusieurs abonnements, retenir
            différents mots de passe, apprendre plusieurs interfaces et passer continuellement d&apos;un
            site à un autre. Cette perte de temps ralentit votre productivité.
          </p>

          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-gold" />
            <h3 className="text-white font-semibold">Notre objectif est simple :</h3>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-5 mb-6">
            <p className="text-white/85 leading-relaxed">
              Rassembler les meilleurs modèles d&apos;intelligence artificielle dans une seule
              plateforme <span className="text-gold font-semibold">moderne, rapide et intuitive.</span>
            </p>
          </div>

          <Link
            href="/register"
            className="inline-block rounded-xl bg-gold-gradient px-6 py-3 font-semibold text-obsidian hover:scale-[1.03] transition-transform"
          >
            Découvrir la plateforme
          </Link>
        </div>
      </div>
    </section>
  );
}