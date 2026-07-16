/**
 * Script à exécuter UNE FOIS après la création du projet Firebase, en local :
 *   npx tsx scripts/seed.ts
 *
 * Il faut que les variables FIREBASE_ADMIN_* soient présentes dans .env.local
 * (charge via `dotenv` ci-dessous).
 *
 * IMPORTANT : en ESM/TypeScript, les `import` statiques sont hissés en haut du
 * fichier et exécutés avant le reste du code, même s'ils sont écrits après
 * dotenv.config() dans le texte. Comme lib/firebase/admin.ts initialise le SDK
 * Admin dès son chargement (buildAdminApp() s'exécute à l'import), il faut
 * l'importer dynamiquement (via import()) APRÈS avoir appelé dotenv.config(),
 * sinon process.env est encore vide au moment où buildAdminApp() s'exécute et
 * l'erreur "Variables d'environnement manquantes" apparaît même si .env.local
 * est correct.
 *
 * Actions effectuées :
 * 1. Seed de la collection `models` avec le catalogue de MODELS_CATALOG
 * 2. Création du document `settings/platform` avec les valeurs par défaut (thème noir/or)
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("🌱 Initialisation de Firestore pour VerzaRoute...");

  const { adminDb } = await import("../lib/firebase/admin");
  const { MODELS_CATALOG } = await import("../lib/models-catalog");

  // --- Nettoyage de l'ancien document orphelin "imagen-4" ---
  // Ce document a été créé quand le modèle s'appelait "Imagen 4" (apiModelId
  // imagen-4.0-generate-001, déprécié par Google). Il a été renommé en "Gemini
  // Flash Image" (apiModelId gemini-2.5-flash-image), ce qui change le slug/id du
  // document — l'ancien reste donc orphelin en base et continue d'être utilisé
  // tant qu'il n'est pas supprimé explicitement.
  const obsoleteImagenRef = adminDb.collection("models").doc("imagen-4");
  const obsoleteImagenSnap = await obsoleteImagenRef.get();
  if (obsoleteImagenSnap.exists) {
    await obsoleteImagenRef.delete();
    console.log("🗑️  Ancien document obsolète 'imagen-4' supprimé.");
  }

  // --- Seed des modèles ---
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

  // --- Seed des réglages de la plateforme ---
  const settingsRef = adminDb.collection("settings").doc("platform");
  const settingsSnap = await settingsRef.get();
  if (settingsSnap.exists) {
    console.log("ℹ️  settings/platform existe déjà, aucune modification.");
  } else {
    await settingsRef.set({
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

  console.log("🎉 Terminé. Vous pouvez maintenant lancer l'application.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erreur lors du seed:", err);
  process.exit(1);
});