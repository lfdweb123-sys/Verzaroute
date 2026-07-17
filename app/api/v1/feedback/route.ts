/**
 * Reçoit les retours "j'aime"/"je n'aime pas" sur une réponse du chat.
 * Les "je n'aime pas" sont en plus envoyés par email via Brevo à contact@verzaroute.com.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { sendBrevoEmail } from "@/lib/email/brevo";

export async function POST(req: NextRequest) {
  const session = cookies().get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const decoded = await adminAuth.verifySessionCookie(session, true).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const { type, comment, model, userMessage, assistantMessage } = await req.json().catch(() => ({}));
  if (type !== "like" && type !== "dislike") {
    return NextResponse.json({ error: "type doit être 'like' ou 'dislike'" }, { status: 400 });
  }

  await adminDb.collection("feedback").add({
    uid: decoded.uid,
    email: decoded.email ?? null,
    type,
    comment: comment ?? "",
    model: model ?? null,
    userMessage: userMessage ?? null,
    assistantMessage: assistantMessage ?? null,
    createdAt: Date.now(),
  });

  if (type === "dislike") {
    try {
      await sendBrevoEmail({
        to: "contact@verzaroute.com",
        subject: `👎 Retour négatif VerzaRoute — ${model ?? "modèle inconnu"}`,
        htmlContent: `
          <h2>Nouveau retour négatif sur une réponse IA</h2>
          <p><strong>Utilisateur :</strong> ${decoded.email ?? decoded.uid}</p>
          <p><strong>Modèle :</strong> ${model ?? "inconnu"}</p>
          <p><strong>Commentaire :</strong> ${comment ? comment.replace(/</g, "&lt;") : "(aucun commentaire)"}</p>
          <hr/>
          <p><strong>Message utilisateur :</strong></p>
          <pre style="white-space:pre-wrap">${(userMessage ?? "").toString().replace(/</g, "&lt;")}</pre>
          <p><strong>Réponse assistant :</strong></p>
          <pre style="white-space:pre-wrap">${(assistantMessage ?? "").toString().replace(/</g, "&lt;")}</pre>
        `,
      });
    } catch (err) {
      console.error("[feedback] Échec de l'envoi de l'email Brevo:", err);
    }
  }

  return NextResponse.json({ success: true });
}