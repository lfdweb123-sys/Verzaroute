import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/requireAdmin";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const snap = await adminDb.collection("users").orderBy("createdAt", "desc").limit(200).get();
  const users = snap.docs.map((d) => d.data());
  return NextResponse.json({ users });
}

/** Actions admin sur un utilisateur : changer le rôle, ajuster le solde, activer/désactiver */
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { uid, action, value } = await req.json().catch(() => ({}));
  if (!uid || !action) return NextResponse.json({ error: "uid et action requis" }, { status: 400 });

  const userRef = adminDb.collection("users").doc(uid);

  switch (action) {
    case "setRole": {
      if (value !== "admin" && value !== "user") {
        return NextResponse.json({ error: "value doit être 'admin' ou 'user'" }, { status: 400 });
      }
      await adminAuth.setCustomUserClaims(uid, { role: value });
      await userRef.update({ role: value, updatedAt: Date.now() });
      break;
    }
    case "adjustCredits": {
      const amount = Number(value);
      if (Number.isNaN(amount)) return NextResponse.json({ error: "value doit être un nombre" }, { status: 400 });
      await userRef.update({ creditsBalance: FieldValue.increment(amount), updatedAt: Date.now() });
      await adminDb.collection("transactions").add({
        uid,
        type: "adjustment",
        amountCredits: amount,
        status: "completed",
        createdAt: Date.now(),
        description: `Ajustement manuel par un administrateur (${guard.uid})`,
      });
      break;
    }
    case "setDisabled": {
      await userRef.update({ disabled: Boolean(value), updatedAt: Date.now() });
      await adminAuth.updateUser(uid, { disabled: Boolean(value) });
      break;
    }
    default:
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
