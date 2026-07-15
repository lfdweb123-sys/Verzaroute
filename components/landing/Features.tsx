import { KeyRound, CreditCard, GitBranch, BarChart3, Laptop2, ShieldCheck } from "lucide-react";

const FEATURES = [
  { icon: KeyRound, title: "Clef Unique", desc: "Accédez à plus de 50 modèles LLM avec une seule clef d'authentification sécurisée." },
  { icon: CreditCard, title: "Paiement Mobile Money", desc: "Rechargez votre compte en FCFA via Wave, Orange Money ou Moov sans carte internationale." },
  { icon: GitBranch, title: "Routage Intelligent", desc: "Basculez automatiquement entre les modèles pour optimiser les coûts et la latence." },
  { icon: BarChart3, title: "Analytique Réel", desc: "Suivez votre consommation de tokens et vos dépenses en temps réel par projet." },
  { icon: Laptop2, title: "SDK Multi-plateforme", desc: "Bibliothèques prêtes à l'emploi pour Python, Node.js, PHP et Flutter." },
  { icon: ShieldCheck, title: "Sécurité Bancaire", desc: "Chiffrement de bout en bout et conformité RGPD pour vos données sensibles." },
];

export function Features() {
  return (
    <section id="comment-ca-marche" className="mx-auto max-w-7xl px-5 sm:px-6 py-16 sm:py-20">
      <div className="text-center mb-10 sm:mb-14">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
          Conçu pour l&apos;écosystème <span className="gold-text">technique local</span>
        </h2>
        <p className="mt-3 sm:mt-4 max-w-xl mx-auto text-sm sm:text-base text-white/60">
          Tout ce dont vous avez besoin pour passer de l&apos;idée à la production.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-obsidian-card p-5 sm:p-6 card-glow transition-all">
            <div className="mb-4 inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gold/10 border border-gold/30">
              <Icon size={19} className="text-gold" />
            </div>
            <h3 className="text-white font-semibold mb-1.5 text-sm sm:text-base">{title}</h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}