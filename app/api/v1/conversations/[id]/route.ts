import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

async function getCurrentUid(): Promise<string | null> {
  const session = cookies().get("session")?.value;
  if (!session) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const snap = await adminDb.collection("conversations").doc(params.id).get();
  if (!snap.exists || snap.data()?.uid !== uid) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  return NextResponse.json({ conversation: snap.data() });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { messages } = await req.json().catch(() => ({}));
  if (!Array.isArray(messages)) return NextResponse.json({ error: "messages requis" }, { status: 400 });

  const ref = adminDb.collection("conversations").doc(params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== uid) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const currentTitle = snap.data()?.title;
  let title = currentTitle;
  if (!currentTitle || currentTitle === "Nouvelle conversation") {
    const firstUserMsg = messages.find((m: { role: string }) => m.role === "user");
    const text =
      typeof firstUserMsg?.content === "string"
        ? firstUserMsg.content
        : firstUserMsg?.content?.find?.((b: { type: string }) => b.type === "text")?.text ?? "Conversation";
    title = text.slice(0, 60) || "Nouvelle conversation";
  }

  await ref.update({ messages, title, updatedAt: Date.now() });
  return NextResponse.json({ success: true, title });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getCurrentUid();
  if (!uid) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ref = adminDb.collection("conversations").doc(params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== uid) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  await ref.delete();
  return NextResponse.json({ success: true });
}