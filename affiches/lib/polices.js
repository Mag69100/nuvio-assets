/**
 * Les polices des affiches (fichiers de fonts/), et les lettres que chacune sait écrire, lues dans sa table « cmap ».
 * satori prend une autre police pour une lettre absente (Ş, Ř, Ğ manquent aux sous-ensembles latins d'Oswald et de
 * Playfair) et écrit des carrés vides pour une lettre qu'aucune n'a (★, émojis) : on vérifie avant d'écrire un texte.
 */
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const fichier = (nom) => readFileSync(new URL(`../fonts/${nom}`, import.meta.url));

export const FONTS = [
  { name: "Inter", data: fichier("Inter-Medium.ttf"), weight: 500, style: "normal" },
  { name: "Inter", data: fichier("Inter-SemiBold.ttf"), weight: 600, style: "normal" },
  { name: "Inter", data: fichier("Inter-ExtraBold.ttf"), weight: 800, style: "normal" },
  { name: "Bebas Neue", data: fichier("BebasNeue-Regular.ttf"), weight: 400, style: "normal" },
  // Régie v3 : Élégante (Playfair Display), Arrondie (Nunito), Condensée (Oswald) — sous-ensembles latins (accents compris).
  ...[["Playfair Display", "PlayfairDisplay", [500, 600, 800]], ["Nunito", "Nunito", [500, 600, 800]], ["Oswald", "Oswald", [500, 600, 700]]]
    .flatMap(([name, nom, poids]) => poids.map((weight) => ({ name, data: fichier(`${nom}-${weight}.woff`), weight, style: "normal" }))),
];

// Police choisie dans la régie (r.texte.police) → nom de la famille (comme POLICES de lib/dessin.js).
export const FAMILLES = { inter: "Inter", bebas: "Bebas Neue", elegante: "Playfair Display", arrondie: "Nunito", condensee: "Oswald" };

/** La table d'un fichier TTF/OTF ou WOFF 1.0 (décompressée), ou null. */
function table(buf, tag) {
  const woff = buf.toString("latin1", 0, 4) === "wOFF";
  const n = buf.readUInt16BE(woff ? 12 : 4);
  for (let i = 0; i < n; i++) {
    const e = woff ? 44 + i * 20 : 12 + i * 16;
    if (buf.toString("latin1", e, e + 4) !== tag) continue;
    if (!woff) return buf.subarray(buf.readUInt32BE(e + 8), buf.readUInt32BE(e + 8) + buf.readUInt32BE(e + 12));
    const debut = buf.readUInt32BE(e + 4), comp = buf.readUInt32BE(e + 8), orig = buf.readUInt32BE(e + 12);
    const brut = buf.subarray(debut, debut + comp);
    return comp < orig ? inflateSync(brut) : brut;
  }
  return null;
}

/** Les points de code qu'une police sait écrire (sous-tables Unicode de sa cmap, formats 4 et 12). */
export function lettresDe(buf) {
  const cmap = table(buf, "cmap"), lettres = new Set();
  if (!cmap) return lettres;
  const n = cmap.readUInt16BE(2);
  for (let i = 0; i < n; i++) {
    const plateforme = cmap.readUInt16BE(4 + i * 8), codage = cmap.readUInt16BE(6 + i * 8);
    if (!(plateforme === 0 || (plateforme === 3 && (codage === 1 || codage === 10)))) continue;
    const o = cmap.readUInt32BE(8 + i * 8), format = cmap.readUInt16BE(o);
    if (format === 4) {
      const segs = cmap.readUInt16BE(o + 6) / 2, fins = o + 14, debuts = fins + segs * 2 + 2, deltas = debuts + segs * 2, decalages = deltas + segs * 2;
      for (let s = 0; s < segs; s++) {
        const fin = cmap.readUInt16BE(fins + s * 2), debut = cmap.readUInt16BE(debuts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2), decalage = cmap.readUInt16BE(decalages + s * 2);
        for (let c = debut; c <= fin && c !== 0xffff; c++) {
          let glyphe;
          if (decalage === 0) glyphe = (c + delta) & 0xffff;
          else {
            const g = cmap.readUInt16BE(decalages + s * 2 + decalage + (c - debut) * 2);
            glyphe = g === 0 ? 0 : (g + delta) & 0xffff;
          }
          if (glyphe) lettres.add(c);
        }
      }
    } else if (format === 12) {
      const groupes = cmap.readUInt32BE(o + 12);
      for (let g = 0; g < groupes; g++) {
        const p = o + 16 + g * 12, debut = cmap.readUInt32BE(p), fin = cmap.readUInt32BE(p + 4);
        for (let c = debut; c <= fin; c++) lettres.add(c);
      }
    }
  }
  return lettres;
}

// Lettres de chaque famille : celles que tous ses fichiers (graisses) savent écrire.
const LETTRES = {};
for (const nom of new Set(FONTS.map((f) => f.name))) {
  const jeux = FONTS.filter((f) => f.name === nom).map((f) => lettresDe(f.data));
  LETTRES[nom] = new Set([...jeux[0]].filter((c) => jeux.every((j) => j.has(c))));
}

// Ce qu'on accepte d'écrire : lettres latines, cyrilliques et grecques, chiffres, ponctuation, espaces, accents, et
// quelques symboles courants dans les titres. Pas les autres symboles (★, ♥, émojis…), qu'on écrirait mal.
const PERMIS = /^[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{N}\p{P}\p{Zs}\p{M}&+=$€£¥%°©®™×½¼¾²³~<>|^`´¨¸¯˘˙˚˛ˆˇ]+$/u;

/** Une famille sait-elle écrire tout le texte ? (les espaces aussi) */
const sait = (famille, texte) => [...texte].every((ch) => LETTRES[famille] && LETTRES[famille].has(ch.codePointAt(0)));

/**
 * La police dans laquelle écrire un texte (titre, petite ligne) : la police choisie (clé de la régie) si elle sait
 * tout écrire, sinon "inter" pour tout le texte (jamais un mélange de deux polices au milieu d'un mot), ou null si
 * le texte n'est pas écrivable (écriture japonaise, symbole, émoji…). Le texte est vérifié aussi en majuscules
 * (le titre est écrit en majuscules, la petite ligne peut l'être).
 */
export function policePour(texte, cle = "inter") {
  const t = String(texte || "").normalize("NFC");
  if (!t.trim() || !PERMIS.test(t)) return null;
  const formes = [t, t.toUpperCase()];
  const famille = FAMILLES[cle] || "Inter";
  if (formes.every((f) => sait(famille, f))) return FAMILLES[cle] ? cle : "inter";
  return formes.every((f) => sait("Inter", f)) ? "inter" : null;
}
