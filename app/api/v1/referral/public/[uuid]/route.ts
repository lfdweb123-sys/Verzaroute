import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";

type Ctx = { params: { uuid: string } };

// UUID v4 basique — évite de taper Firestore pour n'importe quelle chaîne.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Résolution publique d'un lien de parrainage (?ref=uuid).
 * Ne renvoie jamais le code interne du créateur — uniquement son prénom
 * (ou nom d'affichage), pour le message d'invitation. Un UUID invalide
 * ou inconnu renvoie simplement { success: false }, sans détail.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const ip = clientIp(req);
  const rl = rateLimit(`referral-public:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ success: false }, { status: 429 });
  }

  const { uuid } = params;
  if (!uuid || !UUID_RE.test(uuid)) {
    return NextResponse.json({ success: false }, { status: 200 });
  }

  const snap = await adminDb
    .collection("users")
    .where("referralPublicId", "==", uuid)
    .limit(1)
    .get();

  if (snap.empty) {
    return NextResponse.json({ success: false }, { status: 200 });
  }

  const data = snap.docs[0].data();
  const displayName = (data.displayName as string | undefined)?.split(" ")[0] || "Un ami";

  return NextResponse.json({ success: true, displayName });
}
