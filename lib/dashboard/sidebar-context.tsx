"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

/**
 * Contexte partagé permettant à un panneau externe (ex: HistorySidebar sur les
 * pages Chat/Images/Vidéos) de plier/déplier la sidebar principale du dashboard,
 * sans que celle-ci ait à connaître l'existence de ces panneaux. La sidebar lit
 * simplement son état "isCollapsed" depuis ce contexte au lieu d'un useState local.
 *
 * DashboardTopBar.tsx écoute par ailleurs un événement DOM personnalisé
 * "sidebarCollapsed" (mécanisme préexistant, indépendant de ce contexte) pour
 * ajuster sa propre marge gauche. On redéclenche cet événement ici à chaque
 * changement d'état, pour que la topbar reste synchronisée peu importe si c'est
 * la sidebar elle-même ou un HistorySidebar qui déclenche le repli.
 */
interface SidebarCollapseContextValue {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextValue | null>(null);

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sidebarCollapsed", { detail: { collapsed: isCollapsed } }));
  }, [isCollapsed]);

  return (
    <SidebarCollapseContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarCollapseContext.Provider>
  );
}

export function useSidebarCollapse() {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) throw new Error("useSidebarCollapse doit être utilisé à l'intérieur d'un SidebarCollapseProvider");
  return ctx;
}