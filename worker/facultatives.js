/**
 * Rangées de l'addon pour les collections facultatives : ce que Nuvio ne sait pas demander seul à TMDB.
 *   - Récompenses : lauréats (Oscar et César du meilleur film, Palme d'or) depuis data/recompenses.json
 *     (scripts/build_recompenses.py : Wikidata, fiches TMDB en français ; pas un appel TMDB par lauréat ici).
 *   - Selon le temps : films de moins de 90 minutes (durée) et mini-séries (type de série), en direct depuis TMDB.
 * Dans le manifest seulement si leur collection est cochée (showInHome: false : pas sur l'accueil).
 */
import SAGAS from "../data/sagas.json";

/**
 * Sagas : TMDB rend certaines sagas dans le désordre (Rocky Balboa avant Rocky, Bad Boys for Life avant Bad Boys) et
 * Nuvio ne sait trier une saga que du plus récent au plus ancien : l'addon sert chaque saga dans l'ordre de sortie
 * (catalogue « saga », la saga en « genre », son nom dans data/sagas.json).
 */
export const SAGA_IDS = new Map(SAGAS.flatMap((t) => t.sagas.map((s) => [s.title, s.id])));

/** Catalogue « saga » du manifest, si Sagas ou Grands univers est cochée (filtre : le nom de la saga). */
export function sagaCatalog(cfg, pageSize) {
  if (!cfg.c.includes("sagas") && !cfg.c.includes("univers")) return [];   // Grands univers : leurs sagas aussi
  const names = [...SAGA_IDS.keys()];
  return [{ type: "movie", id: "saga", name: "Saga", showInHome: false, pageSize, genres: names,
    extra: [{ name: "genre", isRequired: true, options: names }, { name: "skip" }],
    extraRequired: ["genre"], extraSupported: ["genre", "skip"] }];
}

/** Films d'une saga dans l'ordre de sortie ; sans date (annoncés) à la fin. */
export const inReleaseOrder = (parts) => [...parts].sort((a, b) =>
  (a.release_date ? 0 : 1) - (b.release_date ? 0 : 1) || String(a.release_date || "").localeCompare(String(b.release_date || "")));

export const ROWS = [
  { id: "fac-oscars", type: "movie", name: "Oscars du meilleur film", collection: "recompenses", list: "oscars" },
  { id: "fac-palmes", type: "movie", name: "Palmes d'or", collection: "recompenses", list: "palmes" },
  { id: "fac-cesars", type: "movie", name: "Césars du meilleur film", collection: "recompenses", list: "cesars" },
  { id: "fac-moins-90", type: "movie", name: "Moins de 90 minutes", collection: "temps",
    discover: { "with_runtime.lte": 90, "with_runtime.gte": 60, sort_by: "popularity.desc", "vote_count.gte": 300 } },
  { id: "fac-mini-series", type: "series", name: "Mini-séries", collection: "temps",
    discover: { with_type: "2", sort_by: "popularity.desc", "vote_average.gte": 7.3, "vote_count.gte": 200 } },
];

/** Catalogues du manifest pour les collections facultatives cochées. */
export function facultativeCatalogs(cfg, pageSize) {
  return ROWS.filter((r) => cfg.c.includes(r.collection)).map((r) => ({
    type: r.type, id: r.id, name: r.name, showInHome: false, pageSize, extra: [{ name: "skip" }], extraSupported: ["skip"],
  }));
}

/** Lauréats d'un prix qui passent les filtres (keep), page qui commence à « skip » (résultats TMDB, pour toMetas). */
export async function laureats(assets, list, skip, size, keep = () => true) {
  const res = await fetch(`${assets}/data/recompenses.json`, { cf: { cacheTtl: 86400, cacheEverything: true } });
  const data = res.ok ? await res.json() : {};
  return (data[list] || []).filter(keep).slice(skip, skip + size);
}
