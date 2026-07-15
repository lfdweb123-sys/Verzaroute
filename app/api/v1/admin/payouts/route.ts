import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const snap = await adminDb.collection("payouts").orderBy("createdAt", "desc").limit(100).get();
  return NextResponse.json({ payouts: snap.docs.map((d) => d.data()) });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { amountFcfa, note } = await req.json().catch(() => ({}));
  if (!amountFcfa || typeof amountFcfa !== "number") {
    return NextResponse.json({ error: "amountFcfa requis" }, { status: 400 });
  }

  const ref = adminDb.collection("payouts").doc();
  await ref.set({
    id: ref.id,
    amountFcfa,
    status: "pending",
    requestedBy: guard.uid,
    createdAt: Date.now(),
    note: note ?? null,
  });

  return NextResponse.json({ success: true, id: ref.id });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { payoutId, status } = await req.json().catch(() => ({}));
  if (!payoutId || !status) return NextResponse.json({ error: "payoutId et status requis" }, { status: 400 });

  await adminDb.collection("payouts").doc(payoutId).update({
    status,
    completedAt: status === "completed" ? Date.now() : null,
  });

  return NextResponse.json({ success: true });
}
