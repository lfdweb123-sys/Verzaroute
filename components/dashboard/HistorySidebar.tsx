"use client";

import { useEffect, useState } from "react";
import { PanelLeftOpen, PanelLeftClose, Plus, Loader2, Trash2 } from "lucide-react";
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
  onDelete?: (id: string) => void;
  onDeleteAll?: () => void;
  deleteAllLabel?: string;
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
  onDelete,
  onDeleteAll,
  deleteAllLabel = "Tout supprimer",
}: HistorySidebarProps) {
  const { setIsCollapsed } = useSidebarCollapse();
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);

  useEffect(() => {
    setIsCollapsed(open);
    return () => setIsCollapsed(false);
  }, [open, setIsCollapsed]);

  function handleDeleteAllClick() {
    if (!confirmingDeleteAll) {
      setConfirmingDeleteAll(true);
      setTimeout(() => setConfirmingDeleteAll(false), 3000);
      return;
    }
    setConfirmingDeleteAll(false);
    onDeleteAll?.();
  }

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
        <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-white/10 bg-obsidian-card h-full overflow-hidden">
          <div className="flex items-center justify-between px-3 py-3 border-b border-white/10 shrink-0">
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
            <div className="px-3 pt-3 shrink-0">
              <button
                onClick={onNew}
                className="w-full flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs font-medium text-gold hover:bg-gold/10 transition-colors"
              >
                <Plus size={14} /> {newLabel}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-white/30">
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-[11px] text-white/30 text-center py-8 px-2">{emptyLabel}</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "group/item relative w-full rounded-lg transition-colors",
                    item.active ? "bg-gold/10 border border-gold/20" : "hover:bg-white/5"
                  )}
                >
                  <button onClick={() => onSelect(item.id)} className="w-full text-left px-3 py-2.5 pr-8">
                    <p className={cn("text-xs font-medium truncate", item.active ? "text-gold" : "text-white/80")}>
                      {item.title}
                    </p>
                    {item.subtitle && <p className="text-[10px] text-white/40 truncate mt-0.5">{item.subtitle}</p>}
                  </button>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/item:opacity-100 transition-opacity"
                      aria-label="Supprimer"
                      title="Supprimer"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {onDeleteAll && items.length > 0 && (
            <div className="px-3 pb-3 pt-2 border-t border-white/10 shrink-0">
              <button
                onClick={handleDeleteAllClick}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  confirmingDeleteAll
                    ? "bg-red-500/20 border border-red-500/40 text-red-300"
                    : "border border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/30"
                )}
              >
                <Trash2 size={13} />
                {confirmingDeleteAll ? "Confirmer la suppression ?" : deleteAllLabel}
              </button>
            </div>
          )}
        </aside>
      )}
    </>
  );
}