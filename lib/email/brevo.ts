/**
 * Client Brevo (ex-Sendinblue) — SERVEUR UNIQUEMENT.
 * Utilisé pour envoyer les retours "je n'aime pas" du chat, et les factures
 * PDF après achat de crédits, par email.
 */
export async function sendBrevoEmail(params: {
  to: string;
  subject: string;
  htmlContent: string;
  /** Pièces jointes optionnelles (ex: facture PDF), contenu encodé en base64. */
  attachments?: { name: string; contentBase64: string }[];
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY manquant dans l'environnement");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: "VerzaRoute", email: "no-reply@verzaroute.com" },
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.htmlContent,
      ...(params.attachments
        ? { attachment: params.attachments.map((a) => ({ name: a.name, content: a.contentBase64 })) }
        : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`[brevo] Erreur envoi email (${res.status}): ${errText}`);
  }
}