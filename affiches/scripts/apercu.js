/**
 * Dessine de vraies affiches pour les relire à l'œil (ne fait pas partie du service).
 *   node scripts/apercu.js <dossier de sortie> <fichier contenant TMDB_API_KEY=…> [--s=<codes>]… [type:id …]
 * Chaque --s=<codes> (format de lib/lien-affiches.js, sans « 1. » ; --s= vide = réglages par défaut) donne
 * une série d'affiches. Sans titres donnés : quelques titres connus, plus le n°1 des tendances du jour.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { titleFacts, tmdbGet } from "../lib/tmdb.js";
import { ratingOf } from "../lib/notes.js";
import { trendingRank } from "../lib/tendances.js";
import { qualityOf } from "../lib/qualite.js";
import { posterContent } from "../lib/contenu.js";
import { draw } from "../lib/dessin.js";
import { lireReglages } from "../lib/lien-affiches.js";

const [sortie, fichierCle, ...args] = process.argv.slice(2);
const cle = /TMDB_API_KEY\s*=\s*"?([A-Za-z0-9]+)/.exec(readFileSync(fichierCle, "utf8"));
if (!cle) throw new Error("TMDB_API_KEY introuvable dans " + fichierCle);
const env = { TMDB_API_KEY: cle[1] };
mkdirSync(sortie, { recursive: true });

const styles = args.filter((a) => a.startsWith("--s=")).map((a) => a.slice(4));
if (!styles.length) styles.push("");
const demandes = args.filter((a) => !a.startsWith("--"));
const titres = demandes.length ? demandes : ["movie:tt15239678", "movie:tt15398776", "series:tt11126994", "series:tt14452776"];
if (!demandes.length) {
  for (const [type, chemin] of [["movie", "/trending/movie/day"], ["series", "/trending/tv/day"]]) {
    const d = await tmdbGet(env, chemin, { page: "1" }, fetch);
    titres.push(`${type}:tmdb:${d.results[0].id}`);
  }
}

const lignes = [];
for (const t of titres) {
  const [type, ...reste] = t.split(":");
  const id = reste.join(":");
  const facts = await titleFacts(env, { type, id, imdb: "" });
  if (!facts) { console.log(t, "inconnu"); continue; }
  const [imdbRating, rank, quality] = await Promise.all([
    ratingOf(facts.imdbId), trendingRank(env, type, facts.tmdbId), qualityOf(type, facts.imdbId, facts.lastSeason),
  ]);
  for (const s of styles) {
    const reglages = lireReglages(new URLSearchParams(s ? "s=1." + s : ""));
    for (const shape of ["poster", "landscape"]) {
      const c = posterContent(facts, { imdbRating, rank, quality }, shape, reglages);
      if (!c) { console.log(t, shape, "sans image"); continue; }
      const t0 = Date.now();
      const jpg = await draw(c);
      const nom = `${s || "maison"}-${type}-${id.replace(":", "-")}-${shape}.jpg`;
      writeFileSync(`${sortie}/${nom}`, jpg);
      lignes.push({ nom, shape, style: s || "maison", titre: t });
      console.log(nom, `${Date.now() - t0} ms`, JSON.stringify({ full: c.full, statut: c.statut, gris: c.gris, line: c.line, rank: c.rank, quality: c.quality }));
    }
  }
}
writeFileSync(`${sortie}/liste.json`, JSON.stringify(lignes, null, 2));
