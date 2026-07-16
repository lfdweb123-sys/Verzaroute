"use client";

import { Sparkles } from "lucide-react";

function ConvergenceVisual() {
  const beams = [
    { angle: -50, color: "#D4AF37" },
    { angle: -20, color: "#F0D878" },
    { angle: 10, color: "#D4AF37" },
    { angle: 40, color: "#C9A227" },
    { angle: 65, color: "#F0D878" },
  ];

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl border border-white/10 bg-obsidian-card overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian via-obsidian-card to-obsidian" />

      <svg viewBox="0 0 100 75" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <radialGradient id="visionGlow" cx="50%" cy="85%" r="60%">
            <stop offset="0%" stopColor="#F0D878" stopOpacity="1" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </radialGradient>
          {beams.map((b, i) => (
            <linearGradient key={i} id={`beam-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={b.color} stopOpacity="0" />
              <stop offset="100%" stopColor={b.color} stopOpacity="0.55" />
            </linearGradient>
          ))}
        </defs>

        <circle cx="50" cy="68" r="22" fill="url(#visionGlow)" />

        {beams.map((b, i) => {
          const rad = (b.angle * Math.PI) / 180;
          const startX = 50 + 45 * Math.sin(rad);
          const startY = 68 - 45 * Math.cos(rad) - 20;
          return (
            <line
              key={i}
              x1={startX}
              y1={Math.max(2, startY)}
              x2="50"
              y2="68"
              stroke={`url(#beam-${i})`}
              strokeWidth="0.8"
            />
          );
        })}
      </svg>

      <div className="absolute left-1/2 bottom-[15%] -translate-x-1/2 h-8 w-8 rounded-full bg-gold-gradient shadow-gold" />

      <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-obsidian/90 border border-gold/30 px-2.5 py-1 text-[10px] text-gold">
        <Sparkles size={10} /> ONE FUTURE
      </span>
    </div>
  );
}

export function Vision() {
  return (
    <section id="vision" className="mx-auto max-w-7xl px-5 sm:px-6 py-16 sm:py-24">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
        <div>
          <span className="inline-block rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-[11px] sm:text-xs text-gold uppercase tracking-wide mb-5">
            Notre vision
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-8">
            L&apos;avenir de l&apos;IA, <span className="gold-text">au même endroit</span>.
          </h2>
          <ConvergenceVisual />
        </div>

        <div>
          <p className="text-lg sm:text-xl text-white/80 leading-relaxed mb-4">
            Nous croyons que l&apos;intelligence artificielle doit être accessible, simple et
            efficace.
          </p>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed mb-6">
            Au lieu d&apos;obliger les utilisateurs à naviguer entre des dizaines de plateformes,
            VerzaRoute rassemble les meilleures technologies au sein d&apos;une seule expérience. Nous
            voulons permettre à chacun de travailler plus vite, de créer davantage et d&apos;innover
            sans contraintes.
          </p>

          <div className="rounded-xl bg-white/5 border border-white/10 p-5 mb-6">
            <p className="text-white/85 leading-relaxed">
              L&apos;avenir de l&apos;IA n&apos;est pas de choisir une seule intelligence
              artificielle. L&apos;avenir est de pouvoir utiliser{" "}
              <span className="text-gold font-semibold">les meilleures</span>, au bon moment, depuis
              un seul endroit.
            </p>
          </div>

          <p className="text-gold font-semibold text-lg">Bienvenue sur VerzaRoute.</p>
        </div>
      </div>
    </section>
  );
}