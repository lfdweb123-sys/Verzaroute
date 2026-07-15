"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Sliders, Banknote, Settings, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Statistiques", icon: LayoutDashboard },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/models", label: "Modèles & marges", icon: Sliders },
  { href: "/admin/payouts", label: "Décaissements", icon: Banknote },
  { href: "/admin/settings", label: "Apparence & réglages", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-white/10 bg-obsidian-card min-h-screen p-5">
      <Link href="/" className="flex items-center gap-2 mb-2 px-2">
        <span className="text-xl font-extrabold">
          <span className="gold-text">Verza</span>
          <span className="text-white">Route</span>
        </span>
      </Link>
      <div className="flex items-center gap-1.5 px-2 mb-8 text-xs text-gold/70">
        <ShieldCheck size={12} /> Espace administrateur
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-gold/10 text-gold border border-gold/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => signOut()}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/50 hover:text-red-400 hover:bg-red-500/5 transition-colors"
      >
        <LogOut size={18} />
        Déconnexion
      </button>
    </aside>
  );
}
