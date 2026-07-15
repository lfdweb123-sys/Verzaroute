/**
 * Utilisation : npx tsx scripts/setAdmin.ts user@example.com
 * Attribue le rôle "admin" à un utilisateur existant, via son email.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { adminAuth, setUserRole } from "../lib/firebase/admin";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/setAdmin.ts <email>");
    process.exit(1);
  }

  const user = await adminAuth.getUserByEmail(email);
  await setUserRole(user.uid, "admin");
  console.log(`✅ ${email} (uid: ${user.uid}) est maintenant administrateur.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});
