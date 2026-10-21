/**
 * Le canari (.github/workflows/canari.yml) : toutes les 30 minutes, il appelle le site comme le ferait Nuvio
 * (manifest, une rangée, la recherche, une affiche) et lit le bilan de la salle des machines (/etat.json).
 * Chaque contrôle raté est réessayé une fois, 10 secondes plus tard : une seconde d'absence n'est pas une panne.
 *
 *   node scripts/canari.mjs [adresse du site]
 *
 * Écrit « pannes=… » (les contrôles en panne, séparés par des virgules ; vide si tout va bien) dans $GITHUB_OUTPUT
 * quand il existe, et sort toujours avec le code 0 : c'est le workflow qui décide quoi en faire.
 */
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const SITE = "https://nuvio-assets.xnzxflix.workers.dev";
const DELAI_MS = 20000;

const json = async (r) => { if (!r.ok) throw new Error(`réponse ${r.status}`); return r.json(); };
export const CONTROLES = [
  ["manifest", "/manifest.json", async (r) => { const d = await json(r); if (!Array.isArray(d.catalogs) || !d.catalogs.length) throw new Error("aucune rangée"); }],
  ["rangée", "/catalog/movie/accueil-top10.json", async (r) => { const d = await json(r); if (!Array.isArray(d.metas) || !d.metas.length) throw new Error("rangée vide"); }],
  ["recherche", "/catalog/movie/recherche-films/search=dune.json", async (r) => { const d = await json(r); if (!Array.isArray(d.metas) || !d.metas.length) throw new Error("aucun résultat"); }],
  ["affiche", "/affiche/movie/poster/tt0111161", async (r) => { if (!r.ok) throw new Error(`réponse ${r.status}`); if (!/^image\//.test(r.headers.get("Content-Type") || "")) throw new Error("pas une image"); await r.arrayBuffer(); }],
  ["salle des machines", "/etat.json", async (r) => {
    const d = await json(r);
    if (d.global === "rouge") throw new Error("bilan rouge : " + (d.controles || []).filter((c) => c.etat === "rouge").map((c) => c.nom).join(", "));
  }],
];

const essai = async (base, chemin, test, f) => {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), DELAI_MS);
  try { await test(await f(base + chemin, { signal: ctl.signal, headers: { "User-Agent": "canari-catalogue-fr" } })); return null; }
  catch (e) { return String((e && e.message) || e); }
  finally { clearTimeout(t); }
};

/** Les contrôles en panne : [{ nom, erreur }] (vide si tout va bien). attente : le délai avant le second essai. */
export async function verifier(base = SITE, f = fetch, attente = 10000) {
  const res = await Promise.all(CONTROLES.map(async ([nom, chemin, test]) => {
    let erreur = await essai(base, chemin, test, f);
    if (erreur) { await new Promise((ok) => setTimeout(ok, attente)); erreur = await essai(base, chemin, test, f); }
    return erreur ? { nom, erreur } : null;
  }));
  return res.filter(Boolean);
}

// Lancé directement (pas importé par les tests).
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const base = (process.argv[2] || SITE).replace(/\/+$/, "");
  const pannes = await verifier(base);
  for (const p of pannes) console.log(`::warning::${p.nom} : ${p.erreur}`);
  console.log(pannes.length ? `En panne : ${pannes.map((p) => p.nom).join(", ")}` : "Tout répond.");
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `pannes=${pannes.map((p) => p.nom).join(", ")}\n`);
}
