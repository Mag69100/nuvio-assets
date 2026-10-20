/**
 * Ce que TMDB dit d'un titre, pour dessiner son affiche : images (avec et sans texte), logo, genres,
 * année, note TMDB et dernière saison. Nuvio envoie « tt… » ou « tmdb:N » ; un « tt… » passe par /find.
 */
export const TMDB = "https://api.themoviedb.org/3";
const DELAI_MS = 3000;

// Correspondances « tt… » → identifiant TMDB, gardées en mémoire de l'instance (elles ne changent pas).
let memoFind = new Map();
export function resetMemo() { memoFind = new Map(); }

/** Appel TMDB : objet JSON, null si 404, erreur levée pour tout autre échec (réseau, 5xx…). */
export async function tmdbGet(env, path, params, fetchImpl) {
  const url = new URL(TMDB + path);
  url.searchParams.set("api_key", env.TMDB_API_KEY || "");
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
  const res = await fetchImpl(url.toString(), { signal: AbortSignal.timeout(DELAI_MS) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TMDB ${res.status} sur ${path}`);
  return res.json();
}

async function tmdbIdOf(env, type, imdbId, fetchImpl) {
  const key = `${type}:${imdbId}`;
  if (memoFind.has(key)) return memoFind.get(key);
  const d = await tmdbGet(env, `/find/${imdbId}`, { external_source: "imdb_id" }, fetchImpl);
  const hit = d && (type === "series" ? d.tv_results : d.movie_results) || [];
  const id = hit.length ? hit[0].id : null;
  memoFind.set(key, id);
  return id;
}

const first = (list, langs) => {
  for (const lang of langs) {
    const it = (list || []).find((x) => x.iso_639_1 === lang);
    if (it) return it.file_path;
  }
  return null;
};

/** Les faits d'un titre, ou null si TMDB ne le connaît pas. */
export async function titleFacts(env, { type, id, imdb }, fetchImpl = fetch) {
  const tmdbId = id.startsWith("tmdb:") ? Number(id.slice(5)) : await tmdbIdOf(env, type, id, fetchImpl);
  if (!tmdbId) return null;
  const d = await tmdbGet(env, `/${type === "series" ? "tv" : "movie"}/${tmdbId}`, {
    language: "fr-FR", append_to_response: "images,external_ids", include_image_language: "fr,en,null",
  }, fetchImpl);
  if (!d) return null;
  const images = d.images || {};
  const date = (type === "series" ? d.first_air_date : d.release_date) || "";
  return {
    tmdbId,
    type,
    imdbId: (d.external_ids && d.external_ids.imdb_id) || (id.startsWith("tt") ? id : null) || (/^tt\d+$/.test(imdb || "") ? imdb : null),
    genreIds: (d.genres || []).map((g) => g.id),
    year: /^\d{4}/.test(date) ? date.slice(0, 4) : null,
    vote: { average: d.vote_average || 0, count: d.vote_count || 0 },
    poster: d.poster_path || null,
    textlessPoster: first(images.posters, [null]),
    backdrop: d.backdrop_path || null,
    textlessBackdrop: first(images.backdrops, [null]),
    logo: first(images.logos, ["fr", "en"]),
    lastSeason: type === "series" && d.last_episode_to_air ? d.last_episode_to_air.season_number : null,
  };
}
