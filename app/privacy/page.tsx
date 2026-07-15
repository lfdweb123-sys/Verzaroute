import { LandingNav } from "@/components/landing/LandingNav";
import { Footer } from "@/components/landing/PricingFooter";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-obsidian">
      <LandingNav />
      <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16 sm:py-20">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Politique de confidentialité</h1>
        <p className="text-white/40 text-sm mb-10">Dernière mise à jour : juillet 2026</p>

        <div className="prose prose-invert prose-sm sm:prose-base max-w-none space-y-8 text-white/70">
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">1. Données que nous collectons</h2>
            <p>
              Lorsque tu utilises VerzaRoute, nous collectons les informations nécessaires au
              fonctionnement du service : ton adresse email et nom affiché (via Google ou email/mot de
              passe), l&apos;historique de tes appels aux modèles IA (modèle utilisé, nombre de tokens,
              coût en crédits, horodatage), et les informations liées à tes transactions de paiement
              (montant, méthode, statut) via notre partenaire Verzapay.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">2. Ce que nous ne collectons pas</h2>
            <p>
              Nous ne stockons jamais en clair les clés API que tu génères : seul un hash cryptographique
              est conservé. Le contenu de tes conversations avec les modèles IA n&apos;est pas conservé par
              VerzaRoute au-delà du temps nécessaire pour traiter ta requête, sauf disposition contraire
              indiquée par le fournisseur du modèle utilisé (OpenAI, Anthropic, Google, etc.), dont les
              propres politiques de confidentialité s&apos;appliquent également à ces échanges.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">3. Utilisation des données</h2>
            <p>
              Tes données sont utilisées pour : fournir et facturer le service, prévenir la fraude,
              améliorer la plateforme, et te contacter en cas de besoin (support, notifications de
              sécurité). Nous ne vendons jamais tes données à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">4. Partage avec des tiers</h2>
            <p>
              Certaines données sont partagées avec les fournisseurs IA (pour traiter tes requêtes) et
              avec Verzapay (pour traiter tes paiements). Chacun de ces partenaires applique ses propres
              règles de confidentialité pour les données qu&apos;il traite.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">5. Sécurité</h2>
            <p>
              Nous utilisons Firebase (Google Cloud) pour l&apos;authentification et le stockage de
              données, avec des règles d&apos;accès strictes limitant les lectures/écritures aux seuls
              utilisateurs autorisés. Les communications sont chiffrées en transit (HTTPS/TLS).
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">6. Tes droits</h2>
            <p>
              Tu peux à tout moment demander l&apos;accès, la correction ou la suppression de tes données
              personnelles en nous contactant à{" "}
              <a href="mailto:contact@verzaroute.com" className="text-gold hover:underline">
                contact@verzaroute.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">7. Modifications</h2>
            <p>
              Cette politique peut évoluer. Toute modification substantielle te sera notifiée par email
              ou via une notification dans l&apos;application.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}