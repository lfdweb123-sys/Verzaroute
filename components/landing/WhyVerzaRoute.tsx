import { Layers, Clock, Target, Sparkles, Zap, Briefcase } from "lucide-react";

const REASONS = [
  {
    icon: Layers,
    title: "Une seule plateforme",
    desc: "Centralisez tous vos modèles d'IA dans une interface unique. Plus besoin de jongler entre plusieurs applications ou plusieurs navigateurs.",
  },
  {
    icon: Clock,
    title: "Gagnez un temps précieux",
    desc: "Évitez les connexions répétitives, les changements de plateforme et les interruptions. Concentrez-vous uniquement sur votre travail.",
  },
  {
    icon: Target,
    title: "Le meilleur modèle pour chaque tâche",
    desc: "Chaque intelligence artificielle possède ses propres points forts. Avec VerzaRoute, vous choisissez facilement celle qui offre les meilleurs résultats selon votre objectif.",
  },
  {
    icon: Sparkles,
    title: "Une expérience cohérente",
    desc: "Profitez d'une interface moderne et identique pour tous les modèles. Vous n'avez plus besoin d'apprendre le fonctionnement de chaque plateforme.",
  },
  {
    icon: Zap,
    title: "Une productivité maximale",
    desc: "Passez d'un modèle à un autre en quelques secondes sans interrompre votre flux de travail.",
  },
  {
    icon: Briefcase,
    title: "Pensée pour les professionnels",
    desc: "Développeurs, créateurs de contenu, entreprises, étudiants, designers, équipes marketing ou chercheurs : VerzaRoute simplifie votre utilisation quotidienne de l'IA.",
  },
];

export function WhyVerzaRoute() {
  return (
    <section id="pourquoi" className="mx-auto max-w-7xl px-5 sm:px-6 py-16 sm:py-24">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start mb-14 sm:mb-16">
        <div>
          <span className="inline-block rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-[11px] sm:text-xs text-gold uppercase tracking-wide mb-4">
            Notre mission
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
            Pourquoi avons-nous créé <span className="gold-text">VerzaRoute</span> ?
          </h2>
        </div>
        <div className="space-y-4 text-sm sm:text-base text-white/60 leading-relaxed">
          <p>
            L&apos;intelligence artificielle évolue à une vitesse incroyable. Aujourd&apos;hui, chaque
            entreprise développe son propre modèle : ChatGPT, Claude, Llama, Gemini, Mistral, Grok
            et bien d&apos;autres. Chacun possède ses forces, mais les utiliser au quotidien devient
            rapidement compliqué.
          </p>
          <p>
            Il faut créer un compte sur chaque plateforme, gérer plusieurs abonnements, retenir
            différents mots de passe, apprendre plusieurs interfaces et passer continuellement d&apos;un
            site à un autre. Cette perte de temps ralentit votre productivité.
          </p>
          <p className="text-white/80 font-medium">
            Notre objectif est simple : rassembler les meilleurs modèles d&apos;intelligence
            artificielle dans une seule plateforme moderne, rapide et intuitive.
          </p>
        </div>
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-white text-center mb-10">
        Pourquoi choisir <span className="gold-text">VerzaRoute</span> ?
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {REASONS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-obsidian-card p-5 sm:p-6 card-glow transition-all">
            <div className="mb-4 inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gold/10 border border-gold/30">
              <Icon size={19} className="text-gold" />
            </div>
            <h4 className="text-white font-semibold mb-1.5 text-sm sm:text-base">{title}</h4>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}