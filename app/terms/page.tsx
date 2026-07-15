import { LandingNav } from "@/components/landing/LandingNav";
import { Footer } from "@/components/landing/PricingFooter";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-obsidian">
      <LandingNav />
      <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16 sm:py-20">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Conditions générales d&apos;utilisation</h1>
        <p className="text-white/40 text-sm mb-10">Dernière mise à jour : juillet 2026</p>

        <div className="space-y-8 text-white/70 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-white text-lg font-semibold mb-2">1. Objet</h2>
            <p>
              Les présentes conditions régissent l&apos;utilisation de VerzaRoute, une plateforme
              permettant d&apos;accéder à plusieurs modèles d&apos;intelligence artificielle via une
              interface et une clé API uniques, facturée sur la base d&apos;un solde de crédits
              rechargeable en FCFA.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">2. Création de compte</h2>
            <p>
              L&apos;utilisation de VerzaRoute nécessite la création d&apos;un compte (par email/mot de
              passe ou via Google). Tu es responsable de la confidentialité de tes identifiants et de ta
              ou tes clé(s) API, ainsi que de toute activité effectuée depuis ton compte.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">3. Crédits et paiement</h2>
            <p>
              Les crédits achetés via Verzapay (Mobile Money ou carte bancaire) sont utilisés pour
              couvrir le coût des appels aux modèles IA, majoré d&apos;une marge de service. Les crédits
              ne sont ni remboursables ni transférables, sauf erreur avérée imputable à VerzaRoute.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">4. Usage autorisé</h2>
            <p>
              Tu t&apos;engages à ne pas utiliser VerzaRoute pour générer du contenu illégal, nuisible,
              frauduleux, ou visant à contourner les politiques d&apos;usage des fournisseurs IA
              sous-jacents (OpenAI, Anthropic, Google, etc.). VerzaRoute se réserve le droit de suspendre
              tout compte utilisé en violation de ces règles.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">5. Disponibilité du service</h2>
            <p>
              VerzaRoute s&apos;efforce d&apos;assurer une disponibilité continue, mais ne peut garantir
              une absence totale d&apos;interruption, notamment en cas de panne d&apos;un fournisseur IA
              tiers, de maintenance, ou de cas de force majeure.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">6. Responsabilité</h2>
            <p>
              VerzaRoute agit en tant qu&apos;intermédiaire technique entre toi et les fournisseurs IA.
              Le contenu généré par ces modèles relève de leur propre responsabilité et de leurs propres
              conditions d&apos;utilisation ; VerzaRoute ne peut être tenu responsable de l&apos;exactitude
              ou de la pertinence des réponses générées.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">7. Résiliation</h2>
            <p>
              Tu peux supprimer ton compte à tout moment. VerzaRoute peut suspendre ou résilier un compte
              en cas de violation des présentes conditions, avec notification préalable sauf urgence liée
              à la sécurité.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-2">8. Contact</h2>
            <p>
              Pour toute question relative à ces conditions, écris-nous à{" "}
              <a href="mailto:contact@verzaroute.com" className="text-gold hover:underline">
                contact@verzaroute.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}