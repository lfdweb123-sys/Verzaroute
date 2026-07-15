import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const [usersSnap, logsSnap, txSnap] = await Promise.all([
    adminDb.collection("users").get(),
    adminDb.collection("usageLogs").orderBy("createdAt", "desc").limit(500).get(),
    adminDb.collection("transactions").where("type", "==", "purchase").where("status", "==", "completed").get(),
  ]);

  const totalUsers = usersSnap.size;
  const totalCreditsInCirculation = usersSnap.docs.reduce((sum, d) => sum + (d.data().creditsBalance ?? 0), 0);

  const usageByModel: Record<string, { calls: number; credits: number }> = {};
  let totalCallsSuccess = 0;
  let totalCallsError = 0;
  logsSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.status === "success") totalCallsSuccess++;
    else totalCallsError++;
    const key = data.model as string;
    if (!usageByModel[key]) usageByModel[key] = { calls: 0, credits: 0 };
    usageByModel[key].calls += 1;
    usageByModel[key].credits += data.creditsCharged ?? 0;
  });

  const totalRevenueFcfa = txSnap.docs.reduce((sum, d) => sum + (d.data().amountFcfa ?? 0), 0);

  return NextResponse.json({
    totalUsers,
    totalCreditsInCirculation,
    totalCallsSuccess,
    totalCallsError,
    totalRevenueFcfa,
    usageByModel,
  });
}
