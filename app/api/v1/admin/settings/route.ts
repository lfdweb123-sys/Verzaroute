import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { adminDb } from "@/lib/firebase/admin";
import type { PlatformSettings } from "@/types";

const DEFAULT_SETTINGS: PlatformSettings = {
  creditToUsdRate: 0.001,
  fcfaToUsdRate: 610,
  minPurchaseFcfa: 1000,
  theme: {
    primaryColor: "#D4AF37",
    primaryColorDark: "#C9A227",
    backgroundColor: "#0a0a0a",
    surfaceColor: "#121212",
    accentColor: "#F0D878",
    updatedAt: Date.now(),
    updatedBy: "system",
  },
};

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const snap = await adminDb.collection("settings").doc("platform").get();
  return NextResponse.json({ settings: snap.exists ? snap.data() : DEFAULT_SETTINGS });
}

/**
 * Permet à l'admin de personnaliser les couleurs de la plateforme (exigence n°10)
 * ainsi que les taux de conversion crédits/FCFA.
 */
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const updates = await req.json().catch(() => ({}));

  const ref = adminDb.collection("settings").doc("platform");
  const snap = await ref.get();
  const current = (snap.exists ? snap.data() : DEFAULT_SETTINGS) as PlatformSettings;

  const merged: PlatformSettings = {
    ...current,
    ...updates,
    theme: {
      ...current.theme,
      ...(updates.theme ?? {}),
      updatedAt: Date.now(),
      updatedBy: guard.uid,
    },
  };

  await ref.set(merged, { merge: true });
  return NextResponse.json({ success: true, settings: merged });
}
