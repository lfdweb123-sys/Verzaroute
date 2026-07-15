import Link from "next/link";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-obsidian/80 backdrop-blur-md">
      <nav className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-extrabold">
            <span className="gold-text">Verza</span>
            <span className="text-white">Route</span>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
          <Link href="#modeles" className="hover:text-gold transition-colors">Modèles</Link>
          <Link href="#comment-ca-marche" className="hover:text-gold transition-colors">Fonctionnalités</Link>
          <Link href="#tarifs" className="hover:text-gold transition-colors">Tarifs</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors">
            Connexion
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-semibold text-obsidian hover:scale-[1.03] transition-transform"
          >
            Créer un compte
          </Link>
        </div>
      </nav>
    </header>
  );
}
