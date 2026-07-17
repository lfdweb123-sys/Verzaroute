"use client";

import { useEffect } from "react";
import { PanelLeftOpen, PanelLeftClose, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useSidebarCollapse } from "@/lib/dashboard/sidebar-context";

export interface HistoryItem {
  id: string;
  title: string;
  subtitle?: string;
  active?: boolean;
}

interface HistorySidebarProps {
  open: boolean;
  onToggle: () => void;
  items: HistoryItem[];
  loading?: boolean;
  onSelect: (id: string) => void;
  onNew?: () => void;
  newLabel?: string;
  emptyLabel?: string;
}

export function HistorySidebar({
  open,
  onToggle,
  items,
  loading,
  onSelect,
  onNew,
  newLabel = "Nouvelle conversation",
  emptyLabel = "Aucun historique pour le moment.",
}: HistorySidebarProps) {
  const { setIsCollapsed } = useSidebarCollapse();

  useEffect(() => {
    setIsCollapsed(open);
    return () => setIsCollapsed(false);
  }, [open, setIsCollapsed]);

  return (
    <>
      {!open && (
        <button
          onClick={onToggle}
          className="hidden md:flex items-center justify-center h-9 w-9 rounded-lg border border-white/10 bg-obsidian-card text-white/60 hover:text-gold hover:border-gold/30 transition-colors shrink-0"
          aria-label="Ouvrir l'historique"
          title="Ouvrir l'historique"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {open && (
        <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-white/10 bg-obsidian-card h-full">
          <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">Historique</span>
            <button
              onClick={onToggle}
              className="h-7 w-7 flex items-center justify-center rounded-md text-white/50 hover:text-gold hover:bg-white/5 transition-colors"
              aria-label="Fermer l'historique"
              title="Fermer l'historique"
            >
              <PanelLeftClose size={15} />
            </button>
          </div>

          {onNew && (
            <div className="px-3 pt-3">
              <button
                onClick={onNew}
                className="w-full flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs font-medium text-gold hover:bg-gold/10 transition-colors"
              >
                <Plus size={14} /> {newLabel}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-white/30">
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-[11px] text-white/30 text-center py-8 px-2">{emptyLabel}</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-2.5 transition-colors",
                    item.active ? "bg-gold/10 border border-gold/20" : "hover:bg-white/5"
                  )}
                >
                  <p className={cn("text-xs font-medium truncate", item.active ? "text-gold" : "text-white/80")}>
                    {item.title}
                  </p>
                  {item.subtitle && <p className="text-[10px] text-white/40 truncate mt-0.5">{item.subtitle}</p>}
                </button>
              ))
            )}
          </div>
        </aside>
      )}
    </>
  );
}