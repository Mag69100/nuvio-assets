/**
 * Saisons d'une série comptées comme Cinemeta. TMDB range parfois un anime entier en une saison (Jujutsu Kaisen :
 * une « saison 1 » de 59 épisodes, Frieren, Solo Leveling) ou le découpe autrement (One Piece, Naruto), alors que
 * Cinemeta (IMDb/TVDB) a les saisons de la diffusion. Les addons de sources (Torrentio…) cherchent les épisodes
 * d'après Cinemeta (tt…:2:1) : avec la numérotation de TMDB, la fiche montrait une seule saison et les épisodes
 * après le 24e ne trouvaient pas leurs sources.
 *
 * Les épisodes sont mis bout à bout des deux côtés (spéciaux à part) : le n-ième de TMDB prend la saison et le
 * numéro du n-ième de Cinemeta. Les épisodes que Cinemeta a en plus à la fin (saison annoncée) restent à ajouter ;
 * ceux que TMDB a en plus continuent la dernière saison de Cinemeta, ou en ouvrent une s'ils commencent une
 * nouvelle saison chez TMDB.
 */
import { CINEMETA } from "./cinemeta.js";

const CINEMETA_WAIT_MS = 2500;

/** Les épisodes d'une série chez Cinemeta (gardés un jour par Cloudflare) : [] s'il ne la connaît pas, null en panne. */
export async function videosCinemeta(imdb) {
  try {
    const r = await fetch(`${CINEMETA}/meta/series/${imdb}.json`, {
      cf: { cacheTtl: 86400, cacheEverything: true }, signal: AbortSignal.timeout(CINEMETA_WAIT_MS),
    });
    if (r.status === 404) return [];
    if (!r.ok) return null;
    const j = await r.json();
    return (j && j.meta && Array.isArray(j.meta.videos)) ? j.meta.videos : [];
  } catch (e) {
    return null;
  }
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

/**
 * La fiche TMDB d'une série vue avec ce découpage : saisons, dernier et prochain épisode renumérotés, pour que
 * « Saison 3 terminée », « Saison 4 annoncée » ou le rappel de la saison d'avant parlent des mêmes saisons que
 * la liste des épisodes. Le type « finale » de TMDB est oublié : il marquait la fin de sa saison à lui.
 */
export function ficheRecomptee(d, decoupage) {
  const renum = (e) => {
    if (!e) return e;
    const p = decoupage.place(e.season_number, e.episode_number);
    return { ...e, season_number: p.season, episode_number: p.episode, episode_type: undefined };
  };
  return {
    ...d,
    seasons: decoupage.saisons,
    number_of_seasons: decoupage.saisons.filter((s) => s.season_number > 0).length,
    last_episode_to_air: renum(d.last_episode_to_air),
    next_episode_to_air: renum(d.next_episode_to_air),
  };
}
