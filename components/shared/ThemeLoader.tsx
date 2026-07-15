"use client";

import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { PlatformTheme } from "@/types";

/**
 * Écoute en temps réel le document Firestore `settings/platform` et applique
 * les couleurs choisies par l'admin (exigence n°10) via les variables CSS globales.
 * Ainsi, un changement de couleur dans /admin/dashboard/settings se répercute
 * instantanément sur toute la plateforme, sans redéploiement.
 */
export function ThemeLoader() {
  useEffect(() => {
    const ref = doc(db, "settings", "platform");
    const unsub = onSnapshot(ref, (snap) => {
      const theme = snap.data()?.theme as PlatformTheme | undefined;
      if (!theme) return;
      const root = document.documentElement;
      root.style.setProperty("--color-primary", theme.primaryColor);
      root.style.setProperty("--color-primary-dark", theme.primaryColorDark);
      root.style.setProperty("--color-background", theme.backgroundColor);
      root.style.setProperty("--color-surface", theme.surfaceColor);
      root.style.setProperty("--color-accent", theme.accentColor);
    });
    return () => unsub();
  }, []);

  return null;
}
