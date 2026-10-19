/**
 * Les feuilles de style et les scripts communs aux pages du site (hall, guide, salle 2), servis à part
 * sur /statique/<nom>?v=<empreinte> au lieu d'être recopiés dans chaque page : le navigateur les garde
 * en cache (un an) et ne les retélécharge plus d'une salle à l'autre, ni à la visite suivante.
 * L'empreinte change avec le contenu : une nouvelle version du site est redemandée tout de suite.
 */
import { STAGE_CSS, STAGE_JS } from "./stage.js";
import { APERCU_CSS, APERCU_JS } from "./apercu.js";
import { NUVIO_CSS, NUVIO_JS } from "./nuvio.js";
import { REGLAGES_CSS, REGLAGES_JS } from "./reglages.js";
import { LIENS_JS } from "./liens.js";

const FICHIERS = {
  "scene.css": STAGE_CSS, "scene.js": STAGE_JS,
  "nuvio.css": NUVIO_CSS, "nuvio.js": NUVIO_JS,
  "apercu.css": APERCU_CSS, "apercu.js": APERCU_JS,
  "reglages.css": REGLAGES_CSS, "reglages.js": REGLAGES_JS,
  "liens.js": LIENS_JS,
};
const TYPES = { css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8" };

// FNV-1a sur le texte : calculée une fois par fichier, au premier besoin.
const empreintes = {};
const empreinte = (nom) => {
  if (!empreintes[nom]) {
    let h = 0x811c9dc5;
    const s = FICHIERS[nom];
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    empreintes[nom] = (h >>> 0).toString(36);
  }
  return empreintes[nom];
};

// Adresses depuis la racine : valables aussi sur les anciens liens /<config>/ et sur les copies.
const adresse = (nom) => `/statique/${nom}?v=${empreinte(nom)}`;
/** Les balises à écrire dans la page, à la place du contenu, dans le même ordre. */
export const feuilles = (...noms) => noms.map((n) => `<link rel="stylesheet" href="${adresse(n)}">`).join("\n");
export const scripts = (...noms) => noms.map((n) => `<script src="${adresse(n)}"></script>`).join("\n");

/** Réponse à /statique/<nom> ; null si le fichier n'existe pas. */
export function statique(nom, version) {
  if (!Object.hasOwn(FICHIERS, nom)) return null;
  // Ancienne empreinte (page restée ouverte pendant une mise à jour) : contenu actuel, gardé une minute seulement.
  const cache = version === empreinte(nom) ? "public, max-age=31536000, immutable" : "public, max-age=60";
  return new Response(FICHIERS[nom], { headers: { "Content-Type": TYPES[nom.split(".").pop()], "Cache-Control": cache } });
}
