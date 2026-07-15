import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  const session = cookies().get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const decoded = await adminAuth.verifySessionCookie(session, true).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const { token } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: "token requis" }, { status: 400 });

  await adminDb
    .collection("users")
    .doc(decoded.uid)
    .collection("fcmTokens")
    .doc(token)
    .set({ token, registeredAt: Date.now() });

  return NextResponse.json({ success: true });
}
