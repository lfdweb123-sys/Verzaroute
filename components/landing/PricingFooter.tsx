import Link from "next/link";
import Image from "next/image";

export function PricingCta() {
  return (
    <section id="tarifs" className="mx-auto max-w-5xl px-5 sm:px-6 py-16 sm:py-24">
      <div className="rounded-3xl border border-gold/20 bg-gradient-to-br from-obsidian-card to-obsidian p-6 sm:p-10 md:p-14 text-center shadow-gold">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
          Rechargez en <span className="gold-text">FCFA</span>, payez ce que vous consommez
        </h2>
        <p className="text-sm sm:text-base text-white/60 max-w-xl mx-auto mb-7 sm:mb-8">
          Finis les blocages de cartes bancaires internationales. Rechargez votre portefeuille
          VerzaRoute via Mobile Money et commencez à construire l&apos;avenir.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register" className="w-full sm:w-auto rounded-xl bg-gold-gradient px-8 py-3.5 font-semibold text-obsidian shadow-gold hover:scale-[1.03] transition-transform">
            Commencer maintenant
          </Link>
          <Link href="mailto:contact@verzaroute.com" className="w-full sm:w-auto rounded-xl border border-white/15 px-8 py-3.5 font-semibold text-white/80 hover:border-gold/40 hover:text-white transition-colors">
            Parler à un ingénieur
          </Link>
        </div>

        <div className="mt-9 sm:mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {["WAVE", "ORANGE", "MOOV", "MTN"].map((p) => (
            <span key={p} className="text-white/30 text-xs sm:text-sm font-bold tracking-widest">{p}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const columns = [
    { title: "Produit", links: [{ label: "Modèles", href: "#modeles" }, { label: "Documentation", href: "#" }, { label: "Statut", href: "#" }] },
    { title: "Légal", links: [{ label: "Confidentialité", href: "#" }, { label: "CGU", href: "#" }] },
    { title: "Entreprise", links: [{ label: "À propos", href: "#" }, { label: "Blog", href: "#" }, { label: "Contact", href: "#" }] },
  ];

  return (
    <footer className="border-t border-white/10 mt-6">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-col gap-8 mb-10">
          <div className="max-w-[280px]">
            <Link href="/" className="inline-block shrink-0">
              <Image 
                src="/icons/icon-192.png" 
                alt="VerzaRoute Logo" 
                width={48} 
                height={48} 
                className="rounded-md" 
                priority 
              />
            </Link>
            
            <p className="mt-4 text-xs text-white/40 leading-relaxed">
              L&apos;infrastructure API qui connecte l&apos;Afrique aux modèles de fondation mondiaux.
              Propulsé par une ingénierie de pointe.
            </p>
          </div>
          
          <div className="flex flex-col gap-8">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-white/60 hover:text-gold transition-colors">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
          <span className="text-white/40 text-xs sm:text-sm">© {new Date().getFullYear()} VerzaRoute — verzaroute.com</span>
          <div className="flex gap-5 text-xs sm:text-sm text-white/40">
            <Link href="/login" className="hover:text-gold transition-colors">Connexion</Link>
            <Link href="/register" className="hover:text-gold transition-colors">Inscription</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}