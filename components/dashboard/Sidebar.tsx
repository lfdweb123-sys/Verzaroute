"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, KeyRound, History, Wallet, User, LogOut, Sparkles, MessageSquare, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/models", label: "Modèles", icon: Sparkles },
  { href: "/dashboard/chat", label: "Discuter", icon: MessageSquare },
  { href: "/dashboard/api-keys", label: "Clés API", icon: KeyRound },
  { href: "/dashboard/billing", label: "Crédits & paiement", icon: Wallet },
  { href: "/dashboard/history", label: "Historique", icon: History },
  { href: "/dashboard/profile", label: "Profil", icon: User },
];

// Sélection des éléments les plus importants pour le menu du bas sur mobile (max 4-5 pour la lisibilité)
const BOTTOM_NAV_ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard/api-keys", label: "Clés", icon: KeyRound },
  { href: "/dashboard/profile", label: "Profil", icon: User },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Contenu mutualisé entre la sidebar desktop et le drawer mobile
  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between mb-10 px-2">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/icons/icon-192.png" 
            alt="VerzaRoute Logo" 
            width={40} 
            height={40} 
            className="rounded-md" 
            priority 
          />
        </Link>
        {/* Bouton fermer uniquement visible sur mobile */}
        <button 
          onClick={() => setIsMobileSidebarOpen(false)} 
          className="md:hidden text-white/60 hover:text-white p-2"
          aria-label="Fermer le menu"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setIsMobileSidebarOpen(false)}
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
        onClick={() => {
          signOut();
          setIsMobileSidebarOpen(false);
        }}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/50 hover:text-red-400 hover:bg-red-500/5 transition-colors mt-auto"
      >
        <LogOut size={18} />
        Déconnexion
      </button>
    </>
  );

  return (
    <>
      {/* 1. Barre mobile supérieure avec bouton menu (Hamburger) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-obsidian-card border-b border-white/10 flex items-center px-4 z-40">
        <button 
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 -ml-2 text-white/80 hover:text-white"
          aria-label="Ouvrir le menu"
        >
          <Menu size={24} />
        </button>
        <Link href="/" className="ml-3 flex items-center gap-2">
          <Image 
            src="/icons/icon-192.png" 
            alt="VerzaRoute Logo" 
            width={32} 
            height={32} 
            className="rounded-md" 
          />
          <span className="text-lg font-extrabold">
            <span className="gold-text">Verza</span>
            <span className="text-white">Route</span>
          </span>
        </Link>
      </div>

      {/* 2. Sidebar Mobile (Drawer) */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Fond sombre (Backdrop) */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* Panneau latéral */}
          <aside className="relative w-64 bg-obsidian-card border-r border-white/10 p-5 flex flex-col min-h-screen animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* 3. Sidebar Desktop (inchangée) */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-white/10 bg-obsidian-card min-h-screen p-5">
        <SidebarContent />
      </aside>

      {/* 4. Menu du bas sur mobile (Bottom Navigation) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-obsidian-card border-t border-white/10 px-2 z-40 pb-2">
        <div className="flex justify-around items-center h-16">
          {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 text-xs transition-colors",
                  active ? "text-gold" : "text-white/50 hover:text-white/80"
                )}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}