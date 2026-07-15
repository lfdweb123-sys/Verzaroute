import Link from "next/link";

export function PricingCta() {
  return (
    <section id="tarifs" className="mx-auto max-w-5xl px-6 py-24">
      <div className="rounded-3xl border border-gold/20 bg-gradient-to-br from-obsidian-card to-obsidian p-10 md:p-14 text-center shadow-gold">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Rechargez en <span className="gold-text">FCFA</span>, payez ce que vous consommez
        </h2>
        <p className="text-white/60 max-w-xl mx-auto mb-8">
          Achetez des crédits via Mobile Money (Orange Money, MTN, Moov...) ou carte bancaire grâce à
          Verzapay. Aucun abonnement fixe : vous ne payez que les tokens réellement utilisés, avec une
          marge transparente ajoutée au coût fournisseur.
        </p>
        <Link
          href="/register"
          className="inline-block rounded-xl bg-gold-gradient px-8 py-3.5 font-semibold text-obsidian shadow-gold hover:scale-[1.03] transition-transform"
        >
          Commencer maintenant
        </Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 mt-10">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-white/50 text-sm">
          © {new Date().getFullYear()} VerzaRoute — verzaroute.com
        </span>
        <div className="flex gap-6 text-sm text-white/50">
          <Link href="/login" className="hover:text-gold transition-colors">Connexion</Link>
          <Link href="/register" className="hover:text-gold transition-colors">Inscription</Link>
        </div>
      </div>
    </footer>
  );
}
