/**
 * CRUD des clés API de l'utilisateur connecté.
 * Authentification via le cookie de session Firebase (utilisateur connecté au dashboard),
 * PAS via une clé vzr_sk_ (ces routes ne sont pas destinées à un usage programmatique externe).
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb, verifySessionCookie } from "@/lib/firebase/admin";
import { generateApiKey, hashApiKey } from "@/lib/apikey";

async function getCurrentUid(): Promise<string | null> {
  const cookieStore = cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  try {
    const decoded = await verifySessionCookie(session);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET() {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const snap = await adminDb.collection("apiKeys").where("uid", "==", uid).orderBy("createdAt", "desc").get();
  const keys = snap.docs.map((d) => {
    const data = d.data();
    // On ne renvoie JAMAIS le hash complet, seulement le préfixe affichable
    return {
      id: data.id,
      prefix: data.prefix,
      label: data.label,
      createdAt: data.createdAt,
      lastUsedAt: data.lastUsedAt ?? null,
      revoked: data.revoked,
    };
  });
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Clé par défaut";

  const { key, prefix } = generateApiKey();
  const hash = hashApiKey(key);

  const ref = adminDb.collection("apiKeys").doc();
  await ref.set({
    id: ref.id,
    uid,
    hash,
    prefix,
    label,
    createdAt: Date.now(),
    revoked: false,
  });

  // La clé en clair n'est renvoyée QUE dans cette réponse, jamais stockée ni ré-affichable ensuite
  return NextResponse.json({ id: ref.id, key, prefix, label });
}

export async function DELETE(req: NextRequest) {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { keyId } = await req.json().catch(() => ({ keyId: null }));
  if (!keyId) return NextResponse.json({ error: "keyId requis" }, { status: 400 });

  const ref = adminDb.collection("apiKeys").doc(keyId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== uid) {
    return NextResponse.json({ error: "Clé introuvable" }, { status: 404 });
  }

  await ref.update({ revoked: true });
  return NextResponse.json({ success: true });
}
