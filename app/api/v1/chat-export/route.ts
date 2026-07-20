/**
 * Génère et renvoie un fichier PDF ou Word à partir du contenu d'une réponse de chat.
 * Le fichier est renvoyé directement en pièce jointe téléchargeable (pas de stockage).
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { generateChatPdf, generateChatDocx } from "@/lib/export/chat-export";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = cookies().get("session")?.value;
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const decoded = await adminAuth.verifySessionCookie(session, true).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const { content, format, title } = await req.json().catch(() => ({}));
  if (!content || (format !== "pdf" && format !== "docx")) {
    return NextResponse.json({ error: "Champs 'content' et 'format' ('pdf' ou 'docx') requis" }, { status: 400 });
  }

  const safeTitle = (title ?? "Réponse VerzaRoute").toString().slice(0, 80);

  try {
    if (format === "pdf") {
      const bytes = await generateChatPdf(safeTitle, content);
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="verzaroute-reponse.pdf"`,
        },
      });
    }

    const buffer = await generateChatDocx(safeTitle, content);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="verzaroute-reponse.docx"`,
      },
    });
  } catch (err) {
    console.error("[VZR-EXPORT] Erreur génération fichier:", err);
    return NextResponse.json({ error: "Échec de la génération du fichier" }, { status: 500 });
  }
}