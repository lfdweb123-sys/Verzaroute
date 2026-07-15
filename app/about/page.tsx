import { LandingNav } from "@/components/landing/LandingNav";
import { Footer } from "@/components/landing/PricingFooter";
import { Target, Users, Zap } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-obsidian">
      <LandingNav />
      <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16 sm:py-20">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">
          À propos de <span className="gold-text">VerzaRoute</span>
        </h1>

        <p className="text-white/70 leading-relaxed mb-8">
          VerzaRoute est né d&apos;un constat simple : les développeurs et entreprises africaines
          veulent accéder aux meilleurs modèles d&apos;intelligence artificielle du marché, sans avoir à
          jongler entre dix comptes fournisseurs différents, dix méthodes de facturation, et des
          moyens de paiement internationaux souvent inaccessibles localement.
        </p>
        <p className="text-white/70 leading-relaxed mb-12">
          Nous construisons une couche de routage unique, avec une seule clé API, un seul solde de
          crédits, et un paiement pensé pour le marché local — Mobile Money et carte bancaire, en FCFA.
        </p>

        <div className="grid sm:grid-cols-3 gap-5 mb-12">
          <div className="rounded-2xl border border-white/10 bg-obsidian-card p-5">
            <Target className="text-gold mb-3" size={22} />
            <h3 className="text-white font-semibold mb-1.5">Notre mission</h3>
            <p className="text-sm text-white/60">
              Rendre l&apos;IA générative accessible, simple et facturée équitablement pour les
              développeurs africains.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-obsidian-card p-5">
            <Zap className="text-gold mb-3" size={22} />
            <h3 className="text-white font-semibold mb-1.5">Notre approche</h3>
            <p className="text-sm text-white/60">
              Une infrastructure technique solide, transparente sur les coûts, sans engagement ni
              abonnement forcé.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-obsidian-card p-5">
            <Users className="text-gold mb-3" size={22} />
            <h3 className="text-white font-semibold mb-1.5">Pour qui</h3>
            <p className="text-sm text-white/60">
              Développeurs indépendants, startups et entreprises souhaitant intégrer l&apos;IA dans leurs
              produits.
            </p>
          </div>
        </div>

        <p className="text-white/50 text-sm">
          Une question, un partenariat, une envie de nous rejoindre ?{" "}
          <a href="mailto:contact@verzaroute.com" className="text-gold hover:underline">
            Écris-nous
          </a>
          .
        </p>
      </div>
      <Footer />
    </main>
  );
}