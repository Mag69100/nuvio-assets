/**
 * Rangées de l'addon pour les collections facultatives : ce que Nuvio ne sait pas demander seul à TMDB.
 *   - Récompenses : lauréats (Oscar et César du meilleur film, Palme d'or) depuis data/recompenses.json
 *     (scripts/build_recompenses.py : Wikidata, fiches TMDB en français ; pas un appel TMDB par lauréat ici).
 *   - Selon le temps : films de moins de 90 minutes (durée) et mini-séries (type de série), en direct depuis TMDB.
 * Dans le manifest seulement si leur collection est cochée (showInHome: false : pas sur l'accueil).
 */
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
