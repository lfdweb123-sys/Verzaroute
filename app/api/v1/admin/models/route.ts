import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const snap = await adminDb.collection("models").orderBy("displayName").get();
  return NextResponse.json({ models: snap.docs.map((d) => d.data()) });
}

/** Met à jour la marge, l'activation ou les prix d'un modèle */
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { modelId, updates } = await req.json().catch(() => ({}));
  if (!modelId || !updates) return NextResponse.json({ error: "modelId et updates requis" }, { status: 400 });

  const allowedFields = ["marginPercent", "enabled", "inputPricePerMTokUsd", "outputPricePerMTokUsd", "displayName", "description"];
  const sanitized: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) sanitized[key] = updates[key];
  }

  await adminDb.collection("models").doc(modelId).update(sanitized);
  return NextResponse.json({ success: true });
}
