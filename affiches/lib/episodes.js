/**
 * Saisons d'une série comptées comme Cinemeta, pour le statut des affiches (« SAISON 4 BIENTÔT », « NOUVELLE
 * SAISON », « S3 · ÉP. 4/12 », « 3 saisons ») et la qualité lue chez Torrentio (1er épisode de la dernière saison).
 * TMDB range parfois un anime entier en une saison (Jujutsu Kaisen : une « saison 1 » de 59 épisodes) ou le découpe
 * autrement (One Piece) ; la fiche de l'addon prend déjà les saisons de Cinemeta (worker/episodes.js, même calcul :
 * tests/episodes.test.js vérifie que les deux copies répondent pareil).
 *
 * Seulement pour les séries d'animation : la fiche Cinemeta d'un long anime pèse plus d'un Mo (One Piece), à lire
 * sur le budget de calcul. Gardée réduite (saison, épisode, date) 6 h dans la mémoire de l'instance.
 */
export const CINEMETA = "https://v3-cinemeta.strem.io";
const DELAI_MS = 2500;
const MEMO_MS = 6 * 3600e3, MAX_MEMO = 500;
let memo = new Map();
export function resetMemo() { memo = new Map(); }

/** Les épisodes d'une série chez Cinemeta, réduits : [] s'il ne la connaît pas, null en panne (pas gardé). */
export async function videosCinemeta(imdb, fetchImpl = fetch) {
  const m = memo.get(imdb);
  if (m && Date.now() - m.at < MEMO_MS) return m.videos;
  let videos;
  try {
    const r = await fetchImpl(`${CINEMETA}/meta/series/${imdb}.json`, { signal: AbortSignal.timeout(DELAI_MS) });
    if (r.status !== 404 && !r.ok) return null;
    const j = r.status === 404 ? null : await r.json();
    videos = ((j && j.meta && Array.isArray(j.meta.videos)) ? j.meta.videos : [])
      .map((v) => ({ season: v.season, episode: v.episode, released: v.released || null }));
  } catch (e) {
    return null;
  }
  memo.set(imdb, { at: Date.now(), videos });
  while (memo.size > MAX_MEMO) memo.delete(memo.keys().next().value);
  return videos;
}

const ordre = (a, b) => a.season - b.season || a.episode - b.episode;

/**
 * seasons = d.seasons de TMDB, videos = celles de Cinemeta → null (même découpage, ou Cinemeta trop incomplet
 * pour s'y fier), ou { place(saison, épisode) de TMDB → { season, episode }, restants : vidéos de Cinemeta sans
 * épisode TMDB, saisons : comme d.seasons, recomptées }.
 */
export function decoupageCinemeta(seasons, videos) {
  const leurs = (videos || []).filter((v) => v && v.season > 0 && v.episode > 0).sort(ordre);
  const nos = (seasons || []).filter((s) => s.season_number > 0).sort((a, b) => a.season_number - b.season_number);
  const total = nos.reduce((t, s) => t + (s.episode_count || 0), 0);
  if (!leurs.length || !total || leurs.length < total / 2) return null;
  const debut = {}, taille = {};
  let k = 0;
  const notre = [];
  for (const s of nos) {
    debut[s.season_number] = k;
    taille[s.season_number] = s.episode_count || 0;
    for (let e = 1; e <= (s.episode_count || 0); e++, k++) notre.push({ season: s.season_number, episode: e });
  }
  const n = Math.min(notre.length, leurs.length);
  if (notre.slice(0, n).every((x, i) => x.season === leurs[i].season && x.episode === leurs[i].episode)) return null;

  const dernier = leurs[leurs.length - 1];
  const charniere = notre[leurs.length - 1];   // l'épisode TMDB placé sur le dernier de Cinemeta, s'il existe
  const place = (season, episode) => {
    if (season === 0 || !(season in debut)) return { season, episode };
    // TMDB numérote parfois tout l'anime d'un bout à l'autre (One Piece : la saison 2 commence au 62).
    const rang = episode > taille[season] && episode > debut[season] ? episode - debut[season] : episode;
    const i = debut[season] + rang - 1;
    if (i < leurs.length) return { season: leurs[i].season, episode: leurs[i].episode };
    if (!charniere) return { season, episode: rang };
    return season === charniere.season
      ? { season: dernier.season, episode: dernier.episode + rang - charniere.episode }
      : { season: dernier.season + season - charniere.season, episode: rang };
  };

  // Saisons recomptées : celles de Cinemeta (date de leur premier épisode), allongées des épisodes TMDB en plus.
  const compte = new Map();
  for (const v of leurs) {
    const s = compte.get(v.season) || { season_number: v.season, episode_count: 0, air_date: v.released ? v.released.slice(0, 10) : null };
    s.episode_count = Math.max(s.episode_count, v.episode);
    compte.set(v.season, s);
  }
  for (const x of notre.slice(leurs.length)) {
    const p = place(x.season, x.episode);
    const s = compte.get(p.season) || { season_number: p.season, episode_count: 0, air_date: (nos.find((o) => o.season_number === x.season) || {}).air_date || null };
    s.episode_count = Math.max(s.episode_count, p.episode);
    compte.set(p.season, s);
  }
  const speciaux = (seasons || []).filter((s) => s.season_number === 0);
  return {
    place,
    restants: leurs.slice(notre.length),
    saisons: [...speciaux, ...[...compte.values()].sort((a, b) => a.season_number - b.season_number)],
  };
}


/** Les faits d'une série (lib/tmdb.js) avec ce découpage : saisons, nombre de saisons, dernier et prochain épisode. */
export function faitsRecomptes(facts, decoupage) {
  const place = (s, e) => (Number.isInteger(s) && Number.isInteger(e) ? decoupage.place(s, e) : { season: s, episode: e });
  const last = place(facts.lastSeason, facts.lastEpisodeNumber), next = place(facts.nextSeason, facts.nextEpisodeNumber);
  const seasons = decoupage.saisons.map((s) => ({ season_number: s.season_number, air_date: s.air_date || "", episode_count: s.episode_count ?? null }));
  return {
    ...facts,
    seasons,
    // Les saisons déjà datées (pas la saison annoncée de Cinemeta, sans date).
    seasonsCount: seasons.filter((s) => s.season_number >= 1 && s.air_date).length || null,
    lastSeason: last.season, lastEpisodeNumber: last.episode,
    nextSeason: next.season, nextEpisodeNumber: next.episode,
  };
}
