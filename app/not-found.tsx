import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-obsidian px-6 text-center">
      <span className="text-6xl font-extrabold gold-text mb-4">404</span>
      <h1 className="text-xl font-semibold text-white mb-2">Page introuvable</h1>
      <p className="text-white/50 mb-8">La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <Link
        href="/"
        className="rounded-xl bg-gold-gradient px-6 py-3 font-semibold text-obsidian hover:scale-[1.02] transition-transform"
      >
        Retour à l'accueil
      </Link>
    </main>
  );
}
