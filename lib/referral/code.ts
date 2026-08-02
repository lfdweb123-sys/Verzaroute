/** Génère un code de parrainage court, lisible et unique (vérifié en base). */
import { adminDb } from "@/lib/firebase/admin";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus (0/O, 1/I/l)

function randomCode(length = 7): string {
  let code = "";
  for (let i = 0; i < length; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await adminDb.collection("users").where("referralCode", "==", code).limit(1).get();
    if (existing.empty) return code;
  }
  throw new Error("Impossible de générer un code de parrainage unique après plusieurs tentatives");
}
