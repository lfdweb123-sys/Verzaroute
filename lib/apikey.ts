/**
 * Génération et hashage des clés API VerzaRoute.
 * Format : vzr_sk_<43 caractères aléatoires base64url>
 * Seul le HASH (HMAC-SHA256) est stocké en Firestore. La clé en clair
 * n'est montrée qu'une seule fois à l'utilisateur, au moment de la création.
 */
import { randomBytes, createHmac, timingSafeEqual } from "crypto";

const PREFIX = "vzr_sk_";

export function generateApiKey(): { key: string; prefix: string } {
  const raw = randomBytes(32).toString("base64url"); // ~43 chars
  const key = `${PREFIX}${raw}`;
  const prefix = key.slice(0, 12); // affichable dans le dashboard, ex: vzr_sk_ab12
  return { key, prefix };
}

export function hashApiKey(key: string): string {
  const secret = process.env.API_KEY_HASH_SECRET;
  if (!secret) throw new Error("API_KEY_HASH_SECRET manquant dans l'environnement");
  return createHmac("sha256", secret).update(key).digest("hex");
}

export function isValidKeyFormat(key: string): boolean {
  return typeof key === "string" && key.startsWith(PREFIX) && key.length > PREFIX.length + 20;
}

export function safeCompareHash(hashA: string, hashB: string): boolean {
  const bufA = Buffer.from(hashA, "hex");
  const bufB = Buffer.from(hashB, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
