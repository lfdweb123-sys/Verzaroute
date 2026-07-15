/**
 * Injecte les vraies valeurs NEXT_PUBLIC_FIREBASE_* dans public/firebase-messaging-sw.js
 * au moment du build, car les service workers ne peuvent pas lire process.env directement.
 * Appelé automatiquement via le hook "prebuild" (voir package.json) - à ajouter :
 *   "prebuild": "node scripts/generate-sw-config.js"
 */
const fs = require("fs");
const path = require("path");

const swPath = path.join(__dirname, "..", "public", "firebase-messaging-sw.js");
let content = fs.readFileSync(swPath, "utf-8");

const replacements = {
  "__NEXT_PUBLIC_FIREBASE_API_KEY__": process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  "__NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN__": process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  "__NEXT_PUBLIC_FIREBASE_PROJECT_ID__": process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  "__NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET__": process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  "__NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID__": process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  "__NEXT_PUBLIC_FIREBASE_APP_ID__": process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

for (const [placeholder, value] of Object.entries(replacements)) {
  content = content.split(placeholder).join(value);
}

fs.writeFileSync(swPath, content);
console.log("[generate-sw-config] firebase-messaging-sw.js mis à jour avec les variables d'environnement.");
