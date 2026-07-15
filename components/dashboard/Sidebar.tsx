"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, KeyRound, History, Wallet, User, LogOut, Sparkles, MessageSquare, Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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

// Sélection des éléments les plus importants pour le menu du bas sur mobile
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Contenu mutualisé entre la sidebar desktop et le drawer mobile
  const SidebarContent = ({ isDesktop = false }: { isDesktop?: boolean }) => (
    <>
      <div className={cn(
        "flex items-center mb-10 px-2",
        isDesktop && isCollapsed ? "justify-center" : "justify-between"
      )}>
        <Link href="/" className={cn("flex items-center", isDesktop && isCollapsed ? "justify-center" : "gap-2")}>
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
              onClick={() => {
                setIsMobileSidebarOpen(false);
              }}
              className={cn(
                "flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors group relative",
                isDesktop && isCollapsed ? "justify-center" : "gap-3",
                active
                  ? "bg-gold/10 text-gold border border-gold/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!(isDesktop && isCollapsed) && <span>{label}</span>}
              {isDesktop && isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-obsidian-card border border-white/10 rounded-md text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => {
          signOut();
          setIsMobileSidebarOpen(false);
        }}
        className={cn(
          "flex items-center rounded-lg px-3 py-2.5 text-sm text-white/50 hover:text-red-400 hover:bg-red-500/5 transition-colors mt-auto",
          isDesktop && isCollapsed ? "justify-center" : "gap-3"
        )}
      >
        <LogOut size={18} className="shrink-0" />
        {!(isDesktop && isCollapsed) && <span>Déconnexion</span>}
      </button>
    </>
  );

  return (
    <>
      {/* 1. Barre mobile supérieure : logo à gauche, menu à droite */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-obsidian-card border-b border-white/10 flex items-center px-4 z-40">
        <Link href="/" className="flex items-center">
          <Image 
            src="/icons/icon-192.png" 
            alt="VerzaRoute Logo" 
            width={36} 
            height={36} 
            className="rounded-md" 
          />
        </Link>
        <button 
          onClick={() => setIsMobileSidebarOpen(true)}
          className="ml-auto p-2 text-white/80 hover:text-white"
          aria-label="Ouvrir le menu"
        >
          <Menu size={24} />
        </button>
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

      {/* 3. Sidebar Desktop avec bouton de réduction */}
      <aside className={cn(
        "hidden md:flex md:flex-col shrink-0 border-r border-white/10 bg-obsidian-card min-h-screen p-5 transition-all duration-300 relative",
        isCollapsed ? "w-20" : "w-64"
      )}>
        {/* Bouton pour réduire/agrandir - PLUS VISIBLE */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 h-7 w-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-obsidian border-2 border-obsidian-card flex items-center justify-center hover:scale-110 hover:shadow-lg hover:shadow-gold/20 transition-all z-20 font-bold"
          aria-label={isCollapsed ? "Agrandir la sidebar" : "Réduire la sidebar"}
          title={isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>

        <SidebarContent isDesktop />
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