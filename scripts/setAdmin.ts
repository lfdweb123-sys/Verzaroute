/**
 * Utilisation : npx tsx scripts/setAdmin.ts user@example.com
 * Attribue le rôle "admin" à un utilisateur existant, via son email.
 *
 * IMPORTANT : import dynamique de lib/firebase/admin APRÈS dotenv.config(),
 * pour la même raison que dans scripts/seed.ts (voir commentaire là-bas) :
 * les imports statiques sont hissés avant l'exécution de dotenv.config().
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/setAdmin.ts <email>");
    process.exit(1);
  }

  const { adminAuth, setUserRole } = await import("../lib/firebase/admin");

  const user = await adminAuth.getUserByEmail(email);
  await setUserRole(user.uid, "admin");
  console.log(`✅ ${email} (uid: ${user.uid}) est maintenant administrateur.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});