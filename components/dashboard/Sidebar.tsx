"use client";

import Link from "next/link";
import Image from "next/image"; // Ajout de l'import nécessaire
import { usePathname } from "next/navigation";
import { LayoutDashboard, KeyRound, History, Wallet, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/api-keys", label: "Clés API", icon: KeyRound },
  { href: "/dashboard/billing", label: "Crédits & paiement", icon: Wallet },
  { href: "/dashboard/history", label: "Historique", icon: History },
  { href: "/dashboard/profile", label: "Profil", icon: User },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-white/10 bg-obsidian-card min-h-screen p-5">
      {/* Logo cliquable vers l'accueil */}
      <Link href="/" className="flex items-center mb-10 px-2">
        <Image 
          src="/icons/icon-192.png" 
          alt="VerzaRoute Logo" 
          width={48} 
          height={48} 
          className="rounded-md" 
          priority 
        />
      </Link>

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