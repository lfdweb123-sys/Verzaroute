/**
 * Script à exécuter UNE FOIS après la création du projet Firebase, en local :
 *   npx tsx scripts/seed.ts
 *
 * Il faut que les variables FIREBASE_ADMIN_* soient présentes dans .env.local
 * (charge via `dotenv` ci-dessous).
 *
 * Actions effectuées :
 * 1. Seed de la collection `models` avec le catalogue de MODELS_CATALOG
 * 2. Création du document `settings/platform` avec les valeurs par défaut (thème noir/or)
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { adminDb } from "../lib/firebase/admin";
import { MODELS_CATALOG } from "../lib/models-catalog";

async function seedModels() {
  const batch = adminDb.batch();
  for (const model of MODELS_CATALOG) {
    const id = model.displayName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const ref = adminDb.collection("models").doc(id);
    batch.set(ref, { ...model, id }, { merge: true });
  }
  await batch.commit();
  console.log(`✅ ${MODELS_CATALOG.length} modèles insérés/mis à jour dans Firestore.`);
}

async function seedPlatformSettings() {
  const ref = adminDb.collection("settings").doc("platform");
  const snap = await ref.get();
  if (snap.exists) {
    console.log("ℹ️  settings/platform existe déjà, aucune modification.");
    return;
  }
  await ref.set({
    creditToUsdRate: 0.001,
    fcfaToUsdRate: 610,
    minPurchaseFcfa: 1000,
    theme: {
      primaryColor: "#D4AF37",
      primaryColorDark: "#C9A227",
      backgroundColor: "#0a0a0a",
      surfaceColor: "#121212",
      accentColor: "#F0D878",
      updatedAt: Date.now(),
      updatedBy: "seed-script",
    },
  });
  console.log("✅ settings/platform initialisé (thème noir/or par défaut).");
}

async function main() {
  console.log("🌱 Initialisation de Firestore pour VerzaRoute...");
  await seedModels();
  await seedPlatformSettings();
  console.log("🎉 Terminé. Vous pouvez maintenant lancer l'application.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erreur lors du seed:", err);
  process.exit(1);
});
