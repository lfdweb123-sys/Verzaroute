"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { buildInvisibleWatermark } from "./invisibleWatermark";

/**
 * Écoute l'événement "copy" au niveau document et ajoute le filigrane
 * invisible à la fin du texte copié, via clipboardData.setData.
 *
 * Placé dans RootLayout => actif globalement, aucune modification page par
 * page nécessaire.
 */
export function useCopyWatermark() {
  const { user } = useAuth();

  useEffect(() => {
    const identity = user?.uid ?? "anon";

    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection()?.toString();
      if (!selection) return;

      const watermark = buildInvisibleWatermark(identity);
      const watermarked = `${selection}${watermark}`;

      e.clipboardData?.setData("text/plain", watermarked);
      e.preventDefault();
    };

    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, [user]);
}