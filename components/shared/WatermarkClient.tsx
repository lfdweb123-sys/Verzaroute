"use client";

import { WatermarkOverlay } from "@/components/shared/WatermarkOverlay";
import { useCopyWatermark } from "@/lib/watermark/useCopyWatermark";

/**
 * Petit wrapper client, car RootLayout est un Server Component et les hooks
 * (useCopyWatermark, useAuth) ne peuvent tourner que côté client.
 */
export function WatermarkClient() {
  useCopyWatermark();
  return <WatermarkOverlay />;
}