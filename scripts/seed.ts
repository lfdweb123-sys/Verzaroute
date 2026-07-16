/**
 * Script à exécuter après une mise à jour du catalogue de modèles, en local :
 *   npx tsx scripts/seed.ts
 *
 * Il faut que les variables FIREBASE_ADMIN_* soient présentes dans .env.local
 * (chargé via `dotenv` ci-dessous).
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
 * 1. Suppression des anciens documents de modèles devenus obsolètes (slugs
 *    générés depuis d'anciens displayName contenant des identifiants de modèle
 *    invalides) — sinon ils restent en base comme doublons cassés à côté des
 *    nouveaux documents corrigés, puisque le slug (donc l'id du document)
 *    change quand le displayName change.
 * 2. Seed de la collection `models` avec le catalogue à jour de MODELS_CATALOG
 * 3. Création du document `settings/platform` avec les valeurs par défaut (thème noir/or)
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Anciens identifiants de documents (slugs) à supprimer car issus de displayName
// désormais renommés — sans ce nettoyage, ils resteraient en base comme entrées
// mortes utilisant des identifiants de modèle invalides côté fournisseur.
const OBSOLETE_MODEL_IDS = [
  "mistral-large-2",
  "gemini-2-5-flash",
  "gemini-2-5-pro",
  "veo-3",
  "kimi-k2",
  "glm-4-6-z-ai", // ancien slug si le displayName incluait "(Z.ai)"
];

async function main() {
  console.log("🌱 Initialisation de Firestore pour VerzaRoute...");

  const { adminDb } = await import("../lib/firebase/admin");
  const { MODELS_CATALOG } = await import("../lib/models-catalog");

  // --- Nettoyage des anciens documents obsolètes ---
  const cleanupBatch = adminDb.batch();
  let cleanupCount = 0;
  for (const oldId of OBSOLETE_MODEL_IDS) {
    const ref = adminDb.collection("models").doc(oldId);
    const snap = await ref.get();
    if (snap.exists) {
      cleanupBatch.delete(ref);
      cleanupCount++;
      console.log(`🗑️  Suppression de l'ancien document obsolète: ${oldId}`);
    }
  }
  if (cleanupCount > 0) {
    await cleanupBatch.commit();
    console.log(`✅ ${cleanupCount} ancien(s) document(s) obsolète(s) supprimé(s).`);
  } else {
    console.log("ℹ️  Aucun document obsolète à nettoyer.");
  }

  // --- Seed des modèles à jour ---
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