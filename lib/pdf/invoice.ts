/**
 * Génère une facture PDF pour un achat de crédits, envoyée par email après
 * confirmation de paiement (voir app/api/webhooks/verzapay/route.ts).
 * Utilise pdf-lib (pur JS, sans dépendance native) — compatible fonctions
 * serverless Vercel, contrairement à une génération Python.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  amountFcfa: number;
  amountCredits: number;
  paymentId: string;
  date: Date;
}

const GOLD = rgb(0.831, 0.686, 0.216); // #D4AF37
const DARK = rgb(0.06, 0.06, 0.06);
const GRAY = rgb(0.45, 0.45, 0.45);

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 60;

  // En-tête
  page.drawText("VerzaRoute", { x: 50, y, size: 24, font: fontBold, color: GOLD });
  page.drawText("Facture", { x: width - 150, y, size: 20, font: fontBold, color: DARK });
  y -= 20;
  page.drawText("verzaroute.com", { x: 50, y, size: 9, font: fontRegular, color: GRAY });
  page.drawText(`N° ${data.invoiceNumber}`, { x: width - 150, y, size: 10, font: fontRegular, color: GRAY });
  y -= 50;

  // Ligne de séparation
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 30;

  // Infos client
  page.drawText("Facturé à", { x: 50, y, size: 10, font: fontBold, color: GRAY });
  y -= 16;
  page.drawText(data.customerName, { x: 50, y, size: 12, font: fontRegular, color: DARK });
  y -= 16;
  page.drawText(data.customerEmail, { x: 50, y, size: 11, font: fontRegular, color: GRAY });

  // Infos facture (colonne droite, alignée avec le bloc client)
  let yRight = y + 32;
  page.drawText("Date", { x: width - 200, y: yRight, size: 10, font: fontBold, color: GRAY });
  page.drawText(data.date.toLocaleDateString("fr-FR"), { x: width - 100, y: yRight, size: 10, font: fontRegular, color: DARK });
  yRight -= 16;
  page.drawText("Réf. paiement", { x: width - 200, y: yRight, size: 10, font: fontBold, color: GRAY });
  page.drawText(data.paymentId, { x: width - 200, y: yRight - 14, size: 8, font: fontRegular, color: DARK });

  y -= 60;

  // Tableau — en-tête
  const tableTop = y;
  page.drawRectangle({ x: 50, y: tableTop - 24, width: width - 100, height: 24, color: rgb(0.06, 0.06, 0.06) });
  page.drawText("Description", { x: 60, y: tableTop - 17, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Crédits", { x: width - 220, y: tableTop - 17, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Montant", { x: width - 120, y: tableTop - 17, size: 10, font: fontBold, color: rgb(1, 1, 1) });

  // Tableau — ligne
  const rowY = tableTop - 24 - 30;
  page.drawText("Achat de credits VerzaRoute", { x: 60, y: rowY, size: 10, font: fontRegular, color: DARK });
  page.drawText(data.amountCredits.toLocaleString("fr-FR"), { x: width - 220, y: rowY, size: 10, font: fontRegular, color: DARK });
  page.drawText(`${data.amountFcfa.toLocaleString("fr-FR")} FCFA`, { x: width - 120, y: rowY, size: 10, font: fontRegular, color: DARK });

  page.drawLine({
    start: { x: 50, y: rowY - 12 },
    end: { x: width - 50, y: rowY - 12 },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });

  // Total
  const totalY = rowY - 40;
  page.drawText("Total payé", { x: width - 220, y: totalY, size: 12, font: fontBold, color: DARK });
  page.drawText(`${data.amountFcfa.toLocaleString("fr-FR")} FCFA`, { x: width - 120, y: totalY, size: 12, font: fontBold, color: GOLD });

  // Pied de page
  page.drawText("Paiement traité via Verzapay. Merci de votre confiance.", {
    x: 50,
    y: 60,
    size: 9,
    font: fontRegular,
    color: GRAY,
  });
  page.drawText("contact@verzaroute.com", { x: 50, y: 46, size: 9, font: fontRegular, color: GRAY });

  return pdfDoc.save();
}