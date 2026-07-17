/**
 * Filigrane Unicode invisible, injecté dans le texte au moment du copier-coller.
 *
 * Principe : on encode un identifiant (uid + timestamp) en binaire, puis on
 * représente chaque bit par un caractère invisible :
 *   0 -> U+200B (ZERO WIDTH SPACE)
 *   1 -> U+200C (ZERO WIDTH NON-JOINER)
 * La séquence est entourée de U+2060 (WORD JOINER) comme marqueurs de début/fin,
 * et insérée une seule fois en tête du texte copié.
 *
 * Important, à annoncer honnêtement à l'utilisateur (toi) :
 * - Ceci NE bloque PAS la copie ni la reproduction. Rien côté web ne le peut.
 * - Ça permet de tracer une fuite a posteriori si le texte copié refait surface.
 * - Certains éditeurs / IA normalisent le Unicode (NFKC) et peuvent supprimer
 *   ces caractères — ce n'est donc pas garanti à 100%, mais ça ne coûte rien
 *   d'essayer et ça ne gêne jamais la lecture normale (invisible et ignoré
 *   par les lecteurs d'écran car placé hors du flux sémantique visible).
 */

const ZW_ZERO = "\u200B"; // bit 0
const ZW_ONE = "\u200C"; // bit 1
const MARKER = "\u2060"; // délimiteur début/fin

function textToBits(text: string): string {
  return Array.from(text)
    .map((ch) => ch.charCodeAt(0).toString(2).padStart(16, "0"))
    .join("");
}

function bitsToZeroWidth(bits: string): string {
  return bits
    .split("")
    .map((b) => (b === "0" ? ZW_ZERO : ZW_ONE))
    .join("");
}

/**
 * Construit un identifiant compact "uid_court:timestamp_base36" et le
 * transforme en séquence de caractères invisibles.
 */
export function buildInvisibleWatermark(uidOrLabel: string): string {
  const shortId = uidOrLabel.slice(0, 12);
  const ts = Date.now().toString(36);
  const payload = `${shortId}:${ts}`;
  const bits = textToBits(payload);
  return `${MARKER}${bitsToZeroWidth(bits)}${MARKER}`;
}

/**
 * Décode un filigrane précédemment injecté, à partir d'un texte suspect
 * (ex: contenu retrouvé publié ailleurs). Retourne null si aucun filigrane
 * valide n'est trouvé.
 */
export function decodeInvisibleWatermark(suspectText: string): string | null {
  const match = suspectText.match(
    new RegExp(`${MARKER}([${ZW_ZERO}${ZW_ONE}]+)${MARKER}`)
  );
  if (!match) return null;

  const bits = match[1]
    .split("")
    .map((c) => (c === ZW_ZERO ? "0" : "1"))
    .join("");

  let decoded = "";
  for (let i = 0; i + 16 <= bits.length; i += 16) {
    const code = parseInt(bits.slice(i, i + 16), 2);
    decoded += String.fromCharCode(code);
  }
  return decoded || null;
}