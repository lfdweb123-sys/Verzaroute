"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";

const LINKS = [
  { href: "#modeles", label: "Modèles" },
  { href: "#comment-ca-marche", label: "Fonctionnalités" },
  { href: "#tarifs", label: "Tarifs" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-obsidian/85 backdrop-blur-md">
      <nav className="mx-auto max-w-7xl px-5 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Sparkles size={18} className="text-gold" />
          <span className="text-lg sm:text-xl font-extrabold">
            <span className="text-white">Verza</span>
            <span className="gold-text">Route</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-gold transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-3">
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

        <button
          onClick={() => setOpen((o) => !o)}
          className="sm:hidden text-white/80 p-2 -mr-2"
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="sm:hidden border-t border-white/10 bg-obsidian px-5 py-4 space-y-4 animate-fade-in">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block text-sm text-white/70 hover:text-gold transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-center text-sm text-white/70 py-2"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="text-center rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-semibold text-obsidian"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}