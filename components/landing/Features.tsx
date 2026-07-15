import { Wallet, KeyRound, LineChart, Smartphone, ShieldCheck, Plug } from "lucide-react";

const FEATURES = [
  {
    icon: KeyRound,
    title: "Une seule clé API",
    desc: "Générez votre clé vzr_sk_... et appelez n'importe quel modèle IA disponible sans multiplier les abonnements.",
  },
  {
    icon: Wallet,
    title: "Solde de crédits unifié",
    desc: "Un seul portefeuille pour tous les fournisseurs. Rechargez via Mobile Money ou carte bancaire avec Verzapay.",
  },
  {
    icon: Plug,
    title: "Utilisez vos propres clés",
    desc: "Vous préférez payer directement vos fournisseurs ? Connectez vos propres clés API (BYOK) et gardez le contrôle total, tout en gardant l'historique et le monitoring unifiés de VerzaRoute.",
  },
  {
    icon: LineChart,
    title: "Historique détaillé",
    desc: "Suivez chaque appel : modèle utilisé, tokens consommés, coût en crédits, latence.",
  },
  {
    icon: Smartphone,
    title: "PWA installable",
    desc: "Installez VerzaRoute sur votre téléphone ou ordinateur, avec notifications push en temps réel.",
  },
  {
    icon: ShieldCheck,
    title: "Sécurité by design",
    desc: "Clés hashées, règles Firestore strictes, webhook signé — vos données et votre solde sont protégés.",
  },
];

export function Features() {
  return (
    <section id="comment-ca-marche" className="mx-auto max-w-7xl px-6 py-20">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Conçu pour les développeurs et <span className="gold-text">entreprises africaines</span>
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-white/60">
          Tout ce qu'il vous faut pour intégrer l'IA générative dans vos produits, sans friction de paiement.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-obsidian-card p-6 card-glow transition-all">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 border border-gold/30">
              <Icon size={20} className="text-gold" />
            </div>
            <h3 className="text-white font-semibold mb-1.5">{title}</h3>
            <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
