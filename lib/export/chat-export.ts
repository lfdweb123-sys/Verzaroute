/**
 * Export d'une réponse de chat en PDF ou Word (.docx) — génération CÔTÉ SERVEUR.
 * PDF via pdf-lib (déjà utilisé pour les factures), Word via la lib "docx" (npm).
 * Rendu minimal : pas de mise en forme Markdown avancée (gras/listes rendus en
 * texte brut) — suffisant pour "sauvegarder cette réponse", pas un moteur de
 * mise en page complet.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, "").replace(/```/g, ""))
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ");
}

export async function generateChatPdf(title: string, content: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  const maxWidth = width - margin * 2;
  let y = height - margin;

  page.drawText(title.slice(0, 80), { x: margin, y, size: 16, font: fontBold, color: rgb(0.831, 0.686, 0.216) });
  y -= 30;

  const clean = stripMarkdown(content);
  const paragraphs = clean.split("\n");

  for (const para of paragraphs) {
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, 11);
      if (testWidth > maxWidth && line) {
        if (y < margin + 20) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }
        page.drawText(line, { x: margin, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
        y -= 16;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (y < margin + 20) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
    }
    page.drawText(line, { x: margin, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 20;
  }

  return pdfDoc.save();
}

export async function generateChatDocx(title: string, content: string): Promise<Buffer> {
  const clean = stripMarkdown(content);
  const paragraphs = clean.split("\n").map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line, size: 22 })],
        spacing: { after: 160 },
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
          }),
          ...paragraphs,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}