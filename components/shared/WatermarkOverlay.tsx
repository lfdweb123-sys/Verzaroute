"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Filigrane visuel en surimpression sur toute la plateforme.
 * Rendu en CSS pur (SVG tiling en background), donc visible sur
 * n'importe quelle capture d'écran, peu importe l'outil utilisé.
 *
 * Objectif : dissuasion + traçabilité, PAS un blocage technique de la capture
 * elle-même (aucun mécanisme web ne peut empêcher un screenshot).
 *
 * Placé dans RootLayout => actif sur toutes les pages sans modification
 * page par page.
 */
export function WatermarkOverlay() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  // Identifiant affiché dans le filigrane : email tronqué + uid court si connecté,
  // sinon un identifiant générique. Permet de tracer la source d'une fuite.
  const identity = user
    ? `${user.email ?? "user"} · ${user.uid.slice(0, 8)}`
    : "VerzaRoute";

  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const watermarkText = `VERZAROUTE — REPRODUCTION INTERDITE — ${identity} — ${timestamp}`;

  // SVG encodé en data URI, répété en tuile via CSS. Le texte est répété en
  // diagonale, à faible opacité, pour rester lisible par-dessus le contenu
  // sans gêner la lecture normale.
  const svgTile = `
    <svg xmlns="http://www.w3.org/2000/svg" width="480" height="320">
      <text x="0" y="160" font-family="monospace" font-size="13"
        fill="rgba(255,255,255,0.055)" transform="rotate(-28 240 160)">
        ${watermarkText}
      </text>
    </svg>
  `;
  const encoded = encodeURIComponent(svgTile.trim());

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,${encoded}")`,
        backgroundRepeat: "repeat",
        mixBlendMode: "overlay",
      }}
    />
  );
}