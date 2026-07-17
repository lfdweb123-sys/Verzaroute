// scripts/create-admin.ts
// Usage : npx tsx scripts/create-admin.ts admin@example.com

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/create-admin.ts <email>");
    process.exit(1);
  }

  // Import dynamique APRÈS dotenv.config(), sinon buildAdminApp()
  // s'exécute avec process.env encore vide.
  const { adminAuth, adminDb, setUserRole } = await import("../lib/firebase/admin");

  console.log("[CREATE-ADMIN] Recherche du compte pour:", email);

  const userRecord = await adminAuth.getUserByEmail(email).catch((err) => {
    console.error("[CREATE-ADMIN] Utilisateur introuvable. Il doit d'abord s'être inscrit via /register.", err.message);
    process.exit(1);
  });

  if (!userRecord) return;

  console.log("[CREATE-ADMIN] uid trouvé:", userRecord.uid);

  await setUserRole(userRecord.uid, "admin");
  console.log("[CREATE-ADMIN] Custom claim 'admin' attribué.");

  await adminDb.collection("users").doc(userRecord.uid).set(
    { role: "admin", updatedAt: Date.now() },
    { merge: true }
  );
  console.log("[CREATE-ADMIN] Document Firestore mis à jour.");

  console.log("[CREATE-ADMIN] Terminé. Déconnecte-toi puis reconnecte-toi pour obtenir un nouveau cookie avec le claim à jour.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});