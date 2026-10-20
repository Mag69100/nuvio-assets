/**
 * « Catalogue FR » — addon Nuvio/Stremio en direct (Cloudflare Workers).
 *
 * Répond aux requêtes de Nuvio en interrogeant TMDB à la volée : pas de fichiers
 * précalculés, défilement sans limite (pagination TMDB), contenu toujours à jour.
 *
 *   /                           le hall : on choisit sa salle
 *   /guide                      guide de A à Z (salle 1)
 *   /configure                  page de personnalisation (salle 2)
 *   /lien#u=…                   page « Sur ton téléphone » ouverte par les QR codes du guide
 *   /manifest.json              réglages par défaut
 *   /<config>/manifest.json     réglages personnalisés (config encodée dans l'adresse)
 *   /<config>/collections.json  collections Nuvio filtrées selon la config
 *   /catalog/<type>/<id>.json
 *   /catalog/<type>/<id>/<genre=…&skip=…>.json
 *
 * Définitions des rangées et de Découvrir : ../catalogs.json (le même fichier qu'avant).
 * Secret requis : TMDB_API_KEY (clé API TMDB v3). L'IA (voir ai.js) tourne avec la clé Gemini que chacun
 * colle dans la salle 2. Facultatif : GEMINI_API_KEY, clé de l'instance pour /debug et, avec la
 * variable GEMINI_PUBLIC=on, pour tous les liens sans clé.
 *   /meta/<type>/<id>.json      fiche détaillée (résumé, casting, saisons, épisodes) en français
 */
import DEFS from "../catalogs.json";
import {
  PROVIDERS, COLLECTIONS, REGIONS, GENRES, LANGUAGES, SORTS, SEASON_KEYS, MAX_CUSTOM,
  decodeConfig, defaults, langOf, contentKey, hasGlobalFilters,
} from "./config.js";
import { configurePage } from "./page.js";
import { guidePage, NUVIO_TV_APK, POSTER_URL } from "./guide.js";
import { lienPage } from "./lien.js";
import { copiePage } from "./copie.js";
import { hallPage } from "./hall.js";
import { statique } from "./statique.js";
import { smartSearch, prepareWords, isExact, norm } from "./search.js";
import { imdbRating } from "./ratings.js";
import { isCopy, addonId, hostRoute, hasAlerts, pendingUpdate, updateInfo, updateCard, same, UPDATE_CATALOG } from "./hote.js";
import { looksDescriptive, aiTitles, aiMiss, resolveTitles, aiRecap, aiProfile, aiProfiles, aiRenewal, aiEnv, AI_WAIT_MS } from "./ai.js";

const VERSION = "5.25.3";
const PAGE = 20;                    // taille d'une page TMDB = taille d'une page de l'addon
const AI_MAX = 20;                  // 1re page d'une recherche par IA (sagas entières comprises)
// Cloudflare (offre gratuite) : 50 appels sortants au plus par requête, sinon tout échoue. Une
// recherche en garde 20 pour les fiches (un appel par titre affiché), quelques-uns pour le cache et
// Gemini, et SEARCH_BUDGET pour chercher dans TMDB : au-delà, ses appels renvoient vide.
const SEARCH_BUDGET = 22;
const ASSETS = "https://raw.githubusercontent.com/xnzx07/nuvio-assets/main";
// Version du logo (logo/addon.png) : Nuvio garde les images en cache selon leur adresse, donc un nouveau
// logo n'apparaît que si son adresse change. À augmenter à chaque nouveau logo.
const LOGO_V = 2;
const NOISE_TV = ["10763", "10764", "10766", "10767"]; // actualité, téléréalité, soap, talk-show

const CACHE_CATALOG_S = 3 * 3600;  // une page de catalogue reste 3 h dans le cache Cloudflare
const CACHE_CLIENT_S = 300;        // et 5 min seulement dans le cache de Nuvio
const CACHE_IMDB_S = 30 * 86400;    // correspondance TMDB → IMDb : 30 jours

// ---------- saisons ----------
const SEASONS = {
  // Halloween : uniquement de l'horreur (pas d'animation ni de films familiaux).
  halloween: { title: "Spécial Halloween", discover: { with_genres: "27", without_genres: "16|10751", "vote_count.gte": 300 } },
  noel: { title: "Spécial Noël", keywords: "207317|5570|260365" },
  "saint-valentin": { title: "Spécial Saint-Valentin", keywords: "160404" },
  paques: { title: "Spécial Pâques", keywords: "9921|9923" },
  ete: { title: "Spécial été", keywords: "14714" },
  "a-laffiche": { title: "À l'affiche" },
};

/** Date du jour à Paris, au format AAAA-MM-JJ. */
function parisToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Date de Pâques (algorithme de Meeus/Jones/Butcher). */
function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function pickSeason(today) {
  const year = Number(today.slice(0, 4)), md = today.slice(5);
  const e = easter(year);
  if (today >= addDays(e, -15) && today <= addDays(e, 8)) return "paques";
  if (md >= "10-01" && md <= "11-02") return "halloween";
  if (md >= "11-20" || md <= "01-06") return "noel";
  if (md >= "01-25" && md <= "02-15") return "saint-valentin";
  if (md >= "06-20" && md <= "08-31") return "ete";
  return "a-laffiche";
}

/** Décor du site : la saison du jour, ou celle demandée avec ?saison=… pour la prévisualiser. */
function decorSaison(url, today) {
  const voulu = url.searchParams.get("saison");
  return voulu && (voulu in SEASONS) ? voulu : pickSeason(today);
}

function seasonDef(today, cfg) {
  let key = pickSeason(today);
  if (cfg && key !== "a-laffiche" && !cfg.h.includes(key)) key = "a-laffiche";
  // Horreur masquée ou mode famille : Halloween version « citrouilles », sans horreur.
  if (cfg && key === "halloween" && (cfg.f || cfg.e.includes("Horreur"))) {
    return { id: "accueil-saison", type: "movie", name: SEASONS.halloween.title, home: true,
      discover: { sort_by: "popularity.desc", with_keywords: "3335|9694|232795", without_genres: "27", "vote_count.gte": 100 } };
  }
  const s = SEASONS[key];
  const source = key === "a-laffiche"
    ? { endpoint: "/movie/now_playing", params: { region: "FR" } }
    : { discover: { sort_by: "popularity.desc", ...(s.discover || { with_keywords: s.keywords }) } };
  return { id: "accueil-saison", type: "movie", name: s.title, home: true, ...source };
}

// ---------- définitions ----------
/** Toutes les rangées possibles : saison, rangées par défaut puis rangées facultatives. */
function allRows(today, cfg) {
  return [seasonDef(today, cfg), ...DEFS.catalogs.filter((d) => d.home || d.optional || d.defaultHome)];
}

/** Applique les plateformes choisies à une rangée (« Nouveautés sur tes plateformes »). */
function withProviders(def, providers) {
  const uses = (x) => x.discover && x.discover.with_watch_providers;
  if (!(def.mix || [def]).some(uses)) return def;
  if (!providers.length) return null;
  const set = (x) => (uses(x) ? { ...x, discover: { ...x.discover, with_watch_providers: providers.join("|") } } : x);
  return def.mix ? { ...def, mix: def.mix.map(set) } : set(def);
}

/** Une rangée sur mesure → définition TMDB « discover ». */
function customDef(x, i) {
  const kinds = x.t === 2 ? ["movie", "series"] : [x.t === 1 ? "series" : "movie"];
  const sub = (kind) => {
    const col = kind === "series" ? 2 : 1;
    const genres = x.g.map((gi) => GENRES[gi][col]).filter(Boolean);
    if (x.g.length && !genres.length) return null;           // genre qui n'existe pas pour ce type
    const d = {};
    if (genres.length) d.with_genres = [...new Set(genres)].join("|");
    if (x.w.length) {
      d.with_watch_providers = x.w.map((wi) => PROVIDERS[wi].id).join("|");
      d.watch_region = "FR";
      d.with_watch_monetization_types = "flatrate";
    }
    if (x.l) d.with_original_language = x.l;
    if (x.v) d["vote_average.gte"] = x.v;
    const out = { type: kind, discover: d };
    if (x.s === 1) { d.sort_by = "vote_average.desc"; d["vote_count.gte"] = kind === "series" ? 150 : 300; }
    else if (x.s === 2) { d.sort_by = kind === "series" ? "first_air_date.desc" : "primary_release_date.desc"; d["vote_count.gte"] = 20; out.untilToday = true; }
    else if (x.s === 3) { d.sort_by = "popularity.desc"; d["vote_count.gte"] = 100; out.rotateDaily = true; }
    else d.sort_by = "popularity.desc";
    // Téléréalité d'une langue : peu notée sur TMDB (Koh-Lanta, Les Marseillais…), le seuil habituel
    // la viderait. Toutes langues : seuil habituel, sinon des émissions coréennes au titre non traduit.
    if (genres.includes(10764) && x.l) d["vote_count.gte"] = x.s === 1 ? 10 : 1;
    // Téléréalité sans années choisies : émissions encore diffusées ces 5 dernières années, pas les
    // variétés d'antan que TMDB range aussi là (La Chance aux chansons, Midi Première…).
    if (genres.includes(10764) && !x.y[0] && !x.y[1]) out.airedSince = 5 * 365;
    if (x.y[0]) out.fromYear = x.y[0];
    if (x.y[1]) out.toYear = x.y[1];
    return out;
  };
  const subs = kinds.map(sub).filter(Boolean);
  if (!subs.length) return null;
  const base = { id: `perso-${i}`, name: x.n || `Ma rangée ${i + 1}`, custom: true };
  return subs.length > 1 ? { ...base, type: "movie", mix: subs } : { ...base, ...subs[0] };
}

/** Rangées d'accueil de cette config, dans l'ordre choisi, avec les noms choisis. */
function homeDefs(today, cfg) {
  const all = [...allRows(today, cfg), ...cfg.x.map(customDef)].filter(Boolean);
  return cfg.r
    .map((id) => all.find((d) => d.id === id))
    .filter(Boolean)
    .map((d) => withProviders(d, cfg.p))
    .filter(Boolean)
    .map((d) => (cfg.o[d.id] ? { ...d, name: cfg.o[d.id] } : d));
}

/** Taille d'une page : 20, ou 40 pour une rangée qui mélange films et séries (20 + 20). */
const pageSizeOf = (def) => (def.mix ? PAGE * def.mix.length : PAGE);

function manifest(today, cfg, cfgSeg, url, alerts) {
  const paging = { name: "skip" };
  const discover = DEFS.discover.filter((d) => cfg.d.includes(d.id)).map((d) => {
    const labels = d.options.map((o) => o.label);
    return {
      type: d.type, id: d.id, name: d.name, showInHome: false, pageSize: PAGE,
      // Filtre obligatoire : l'appli choisit d'office le 1er filtre (pas de liste vide « Tous les genres »).
      extra: [{ name: "genre", isRequired: true, options: labels }, paging],
      extraRequired: ["genre"], extraSupported: ["genre", "skip"], genres: labels,
    };
  });
  const home = homeDefs(today, cfg).map((d) => ({
    type: d.type, id: d.id, name: d.name, showInHome: true,
    pageSize: pageSizeOf(d), extra: [paging], extraSupported: ["skip"],
  }));
  return {
    id: addonId(url),
    version: VERSION,
    name: cfg.n,
    description: "Rangées d'accueil, Découvrir et saison en cours, en français, en direct depuis TMDB.",
    logo: `${ASSETS}/logo/addon.png?v=${LOGO_V}`,
    resources: ["catalog", { name: "meta", types: ["movie", "series"], idPrefixes: ["tt", "tmdb:", ...(alerts ? ["maj:"] : [])] }],
    types: ["movie", "series"],
    idPrefixes: ["tt", "tmdb:"],
    // Recherche : deux catalogues « Films » et « Séries » (titres en français), à la place
    // des « TMDB Search » de Discover Plus dont le nom ne se change pas.
    // Lien de l'hébergeur d'une copie : la rangée « Mise à jour » en tête (vide, donc masquée, sans mise à jour).
    catalogs: [...(alerts ? [UPDATE_CATALOG] : []), ...discover, ...home, ...SEARCH.map((c) => ({
      type: c.type, id: c.id, name: c.name, showInHome: false,
      extra: [{ name: "search", isRequired: true }, paging], extraRequired: ["search"], extraSupported: ["search", "skip"],
    }))],
    behaviorHints: { configurable: true, configurationRequired: false },
  };
}

// ---------- TMDB ----------
async function tmdb(env, path, params = {}, lang = "fr-FR") {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.search = new URLSearchParams({ api_key: env.TMDB_API_KEY, language: lang, ...params });
  // Erreur réseau ou limite d'appels de Cloudflare atteinte : une réponse vide, pas une page en erreur.
  try {
    const res = await fetch(url, { cf: { cacheTtl: CACHE_CATALOG_S, cacheEverything: true } });
    return res.ok ? await res.json() : {};
  } catch (e) {
    return {};
  }
}

/**
 * Infos complémentaires d'un titre : identifiant IMDb et, pour les films, dates de sortie
 * (cinéma et numérique) par pays ; pour les séries, dernier et prochain épisode. Un seul appel
 * TMDB par titre, gardé 1 jour par Cloudflare (dates numériques et épisodes bougent).
 */
async function extraInfo(env, kind, tmdbId) {
  const movie = kind !== "series";
  const url = new URL(`https://api.themoviedb.org/3/${movie ? "movie" : "tv"}/${tmdbId}`);
  // Même appel qu'avant, avec en plus les images : logo (en français si possible) et fond
  // sans texte en pleine définition pour le grand carrousel et le mode ambiant.
  url.search = new URLSearchParams({
    api_key: env.TMDB_API_KEY, language: "fr-FR", include_image_language: "fr,en,null", include_video_language: "fr,en",
    // Vidéos : la bande-annonce de l'accueil (Nuvio la prend dans la rangée, sans ouvrir la fiche).
    append_to_response: movie ? "release_dates,images,videos" : "external_ids,images,videos",
  });
  // Sans réponse (limite d'appels de Cloudflare…) : le titre s'affiche quand même, sans ces infos.
  const j = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } })
    .then((res) => (res.ok ? res.json() : null), () => null);
  if (!j) return { imdb: null };
  const logo = bestImage(j.images && j.images.logos, "fr");
  const backdrop = bestImage((j.images && j.images.backdrops || []).filter((b) => !b.iso_639_1), "fr");
  return {
    imdb: (movie ? j.imdb_id : j.external_ids && j.external_ids.imdb_id) || null,
    releases: movie ? (j.release_dates && j.release_dates.results) || [] : null,
    episode: movie ? null : { next: j.next_episode_to_air, last: j.last_episode_to_air, counts: seasonCounts(j.seasons), status: j.status },
    logo: logo ? `${IMG}w500${logo.file_path.replace(/\.svg$/, ".png")}` : undefined,
    backdrop: backdrop ? backdrop.file_path : null,
    trailers: trailersOf(j.videos && j.videos.results).slice(0, 2),
  };
}

/**
 * Un onglet d'une tuile de collection (une source TMDB), chargé comme Nuvio TV le fait
 * (TmdbCollectionSourceResolver) : « discover » page par page, ou les films d'une saga. Sert à l'aperçu du site.
 */
async function dossierSource(env, src, lang, page) {
  const tv = src.mediaType === "TV", kind = tv ? "series" : "movie";
  const toMeta = (it) => {
    const name = it.title || it.name || it.original_title || it.original_name;
    if (!name) return null;
    const date = (tv ? it.first_air_date : it.release_date) || "";
    return {
      id: `tmdb:${it.id}`, type: kind, name,
      poster: it.poster_path ? `${IMG}w500${it.poster_path}` : it.backdrop_path ? `${IMG}w780${it.backdrop_path}` : undefined,
      background: it.backdrop_path ? `${IMG}w1280${it.backdrop_path}` : undefined,
      description: it.overview || undefined, releaseInfo: date.slice(0, 4) || undefined, released: date ? `${date}T00:00:00.000Z` : undefined,
    };
  };
  if (src.tmdbSourceType === "COLLECTION") {
    if (page > 1) return { metas: [], hasMore: false };
    const d = await tmdb(env, `/collection/${Number(src.tmdbId)}`, {}, lang);
    return { metas: (d.parts || []).map(toMeta).filter(Boolean), hasMore: false };
  }
  const f = src.filters || {};
  const sort = src.sortBy || "popularity.desc";
  const p = { page: String(page), sort_by: tv ? sort.replace("primary_release_date.desc", "first_air_date.desc") : sort.replace("first_air_date.desc", "primary_release_date.desc") };
  const set = (k, v) => { if (v != null && v !== "") p[k] = String(v); };
  set("with_companies", f.withCompanies); set("vote_count.gte", f.voteCountGte); set("with_genres", f.withGenres); set("without_genres", f.withoutGenres);
  set("vote_average.gte", f.voteAverageGte); set("with_original_language", f.withOriginalLanguage);
  set(tv ? "first_air_date.gte" : "primary_release_date.gte", f.releaseDateGte); set(tv ? "first_air_date.lte" : "primary_release_date.lte", f.releaseDateLte);
  if (f.withWatchProviders) { set("watch_region", f.watchRegion || "US"); set("with_watch_providers", f.withWatchProviders); set("with_watch_monetization_types", "flatrate|free|ads|rent|buy"); }
  const d = await tmdb(env, `/discover/${tv ? "tv" : "movie"}`, p, lang);
  const seen = new Set();
  const metas = (d.results || []).map(toMeta).filter((m) => m && !seen.has(m.id) && seen.add(m.id));
  return { metas, hasMore: (d.page || page) < (d.total_pages || page) && metas.length > 0 };
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const shortDate = (iso) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
/** Ce qu'il faut savoir des épisodes d'une série TMDB, pour episodeNote et betweenSeasons. */
const episodeOf = (d) => ({ next: d.next_episode_to_air, last: d.last_episode_to_air, counts: seasonCounts(d.seasons), status: d.status });
/** { numéro de saison: nombre d'épisodes } d'après la liste des saisons TMDB. */
const seasonCounts = (seasons) => Object.fromEntries((seasons || []).map((x) => [x.season_number, x.episode_count]));
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const dayName = (iso) => DAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];

/**
 * Épisode d'une série à signaler :
 *   - saison finie (son dernier épisode est sorti, il y a moins d'un mois) : « Saison 1 terminée le
 *     15 oct. », ou « Série terminée le 7 oct. (dernier épisode) » si TMDB dit la série finie ;
 *   - épisode sorti ces 3 derniers jours : « Nouvel épisode sorti jeudi 15 oct. (S1 É8) » ;
 *   - épisode prévu dans les 7 prochains : « Prochain épisode mardi 20 oct. (S1 É3) », « Dernier
 *     épisode de la saison 1 mardi… », « Saison 3 : 1er épisode vendredi 7 nov. ».
 * ep = { next, last } de TMDB, counts = { saison: nombre d'épisodes }, status = statut TMDB.
 */
function episodeNote(ep, today) {
  if (!ep) return "";
  const { next, last, status } = ep;
  const when = (e) => (e.air_date === today ? "aujourd'hui" : `${dayName(e.air_date)} ${shortDate(e.air_date)}`);
  const tag = (e) => `(S${e.season_number} É${e.episode_number})`;
  if (betweenSeasons(ep, today) && last.air_date >= addDays(today, -30)) {
    if (status === "Ended") return `Série terminée le ${shortDate(last.air_date)} (dernier épisode)`;
    if (status === "Canceled") return `Série annulée, dernier épisode le ${shortDate(last.air_date)}`;
    return `Saison ${last.season_number} terminée le ${shortDate(last.air_date)}`;
  }
  if (last && last.air_date && last.air_date <= today && last.air_date >= addDays(today, -3)) {
    if (last.episode_number === 1) return `Saison ${last.season_number} : 1er épisode sorti ${when(last)}`;
    return `Nouvel épisode sorti ${when(last)} ${tag(last)}`;
  }
  if (next && next.air_date && next.air_date >= today && next.air_date <= addDays(today, 7)) {
    if (next.episode_number === 1) return `Saison ${next.season_number} : 1er épisode ${when(next)}`;
    if (isFinale(next, ep.counts)) return `Dernier épisode de la saison ${next.season_number} ${when(next)} ${tag(next)}`;
    return `Prochain épisode ${when(next)} ${tag(next)}`;
  }
  return "";
}

/** Dernier épisode de sa saison (TMDB le marque « finale », sinon son numéro = nombre d'épisodes). */
const isFinale = (e, counts = {}) => e.episode_type === "finale" || (e.episode_number > 1 && e.episode_number === counts[e.season_number]);

/** La saison en cours est finie (son dernier épisode est sorti) et la suivante n'a pas commencé. */
function betweenSeasons(ep, today) {
  const { next, last, counts } = ep || {};
  return !!(last && last.air_date && last.air_date <= today && isFinale(last, counts)
    && !(next && next.season_number === last.season_number));
}

/**
 * Quand le film sera visible chez soi : première sortie numérique (VOD, achat, location)
 * TOUS PAYS CONFONDUS, car c'est à ce moment que les sources apparaissent.
 *   « VOD le 27 oct. »          date connue, à venir
 *   « En VOD depuis le 9 oct. » sortie récente (moins de 60 jours)
 *   « VOD vers le 3 déc. »      pas encore de date : estimation (1re sortie salle + 45 jours)
 */
function releaseDates(releases, types, countries) {
  return (releases || [])
    .filter((r) => !countries || countries.includes(r.iso_3166_1))
    .flatMap((r) => r.release_dates || [])
    .filter((r) => types.includes(r.type))
    .map((r) => (r.release_date || "").slice(0, 10))
    .filter(Boolean)
    .sort();
}

/**
 * Première sortie numérique (VOD, achat, location), tous pays confondus : c'est à ce
 * moment que les sources apparaissent, en général avec une piste VF ou VFQ.
 */
const firstDigital = (releases) => releaseDates(releases, [4])[0] || "";

/**
 * Indice de VF : le film a une sortie (salle ou numérique) dans un pays francophone, ou il
 * est français. Les petits films sortis directement en VOD aux États-Unis n'ont souvent
 * aucune piste française.
 */
function likelyVf(releases, originalLanguage, today) {
  if (originalLanguage === "fr") return true;
  // Le doublage est fait pour la sortie francophone : tant que le film n'est sorti nulle part
  // en France, Belgique, Suisse ou au Canada, il n'y a en général pas encore de VF.
  const first = releaseDates(releases, [2, 3, 4, 5], ["FR", "BE", "CH", "LU", "CA"])[0];
  return Boolean(first && first <= today);
}

/** Sans date numérique annoncée : 1re sortie en salle + 45 jours (délai habituel). */
function digitalGuess(releases) {
  const cinema = releaseDates(releases, [2, 3])[0];
  return cinema ? addDays(cinema, 45) : "";
}

/**
 * Quand le film sera visible :
 *   « Dispo le 27 oct. »          date annoncée
 *   « Dispo depuis le 9 oct. »    sortie récente (moins de 60 jours)
 *   « Dispo vers le 3 déc. »      pas de date annoncée : estimation
 */
function releaseNote(releases, region, today) {
  if (!releases || !releases.length) return "";
  const known = firstDigital(releases);
  if (known) {
    if (known > today) return known <= addDays(today, 200) ? `Dispo le ${shortDate(known)}` : "";
    return known >= addDays(today, -60) ? `Dispo depuis le ${shortDate(known)}` : "";
  }
  const guess = digitalGuess(releases);
  if (!guess || guess < addDays(today, -120)) return "";
  return `Dispo vers le ${shortDate(guess > today ? guess : addDays(today, 7))}`;
}

/**
 * Film pas encore sorti (« Les plus attendus ») : sa sortie au cinéma dans le pays choisi, sinon
 * sa première sortie ailleurs. L'année n'est ajoutée que si ce n'est pas l'année en cours.
 *   « Au cinéma le 3 déc. »   « Sortie le 12 mars 2027 »   « Date de sortie pas encore annoncée »
 */
function cinemaNote(releases, region, date, today) {
  const withYear = (iso) => shortDate(iso) + (iso.slice(0, 4) === today.slice(0, 4) ? "" : ` ${iso.slice(0, 4)}`);
  const here = cinemaHere(releases, region, today);
  if (here) return `Au cinéma le ${withYear(here)}`;
  const first = releaseDates(releases, [1, 2, 3, 4]).find((d) => d > today) || (date > today ? date : "");
  return first ? `Sortie le ${withYear(first)}` : "Date de sortie pas encore annoncée";
}
const cinemaHere = (releases, region, today) => releaseDates(releases, [2, 3], [region]).find((d) => d > today) || "";

const IMG = "https://image.tmdb.org/t/p/";

// Genres TMDB en français (affichés sous le titre dans le grand carrousel).
const GENRE_NAMES = {
  28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime", 99: "Documentaire",
  18: "Drame", 10751: "Familial", 14: "Fantastique", 36: "Histoire", 27: "Horreur", 10402: "Musique",
  9648: "Mystère", 10749: "Romance", 878: "Science-fiction", 10770: "Téléfilm", 53: "Thriller",
  10752: "Guerre", 37: "Western", 10759: "Action & Aventure", 10762: "Enfants", 10763: "Actualité",
  10764: "Téléréalité", 10765: "SF & Fantastique", 10766: "Feuilleton", 10767: "Talk-show",
  10768: "Guerre & Politique",
};

/**
 * Une fiche par résultat, sans en retirer aucun : la pagination reste exacte
 * (20 résultats TMDB = 20 fiches, donc « skip » tombe toujours sur la bonne page).
 * Sans identifiant IMDb, on se rabat sur « tmdb:<id> », que la fiche (/meta) sait ouvrir.
 */
async function toMetas(env, ctx, results, kind, opts, today) {
  // « Pour qui » de toute la page préparés en arrière-plan (pas pendant la recherche, au budget compté).
  if (!opts.search) prefetchProfiles(env, ctx, results, kind);
  // Infos déjà lues pour trier la page (Tendances) : pas un second appel par titre.
  const infos = await Promise.all(results.map((it) => (opts.infos && opts.infos.get(it.id)) || extraInfo(env, kind, it.id)));
  const ids = infos.map((x) => x.imdb);
  // VF déjà trouvée par une fiche (Allociné + YouTube) : un seul appel pour toute la page, pas pendant
  // la recherche (son budget d'appels est compté au plus juste).
  const vfIndex = opts.search ? {} : await (opts.vfIndex = opts.vfIndex || readVfIndex());
  return results.map((it, i) => {
    const date = it.release_date || it.first_air_date || "";
    // Films : quand ils deviennent regardables (« Les plus attendus » : quand ils sortent au cinéma) ;
    // séries : l'épisode de la semaine.
    const note = kind !== "movie" ? episodeNote(infos[i].episode, today)
      : opts.upcoming ? cinemaNote(infos[i].releases, opts.region, date, today)
      : releaseNote(infos[i].releases, opts.region, today);
    // Pas encore regardable : la date affichée par Nuvio (carrousel, « date de sortie
    // complète ») devient la date de dispo plutôt que la sortie en salle.
    const dispo = kind === "movie" ? (firstDigital(infos[i].releases) || digitalGuess(infos[i].releases)) : "";
    const shownDate = opts.upcoming ? cinemaHere(infos[i].releases, opts.region, today) || date
      : dispo && dispo > today ? dispo : date;
    // Séries : identifiant TMDB direct. Avec l'identifiant IMDb, Nuvio refait la
    // correspondance IMDb → TMDB et tombe parfois sur une autre série (fiches TMDB
    // en double, ex. « Frères d'armes » affiché avec l'image d'une telenovela).
    const meta = {
      id: kind === "series" || !ids[i] ? `tmdb:${it.id}` : ids[i],
      imdb_id: ids[i] || undefined,
      type: kind,
      name: (it.title || it.name || "").replace(/^[‎‏\s]+|[‎‏\s]+$/g, ""),
      poster: it.poster_path ? `${IMG}w500${it.poster_path}` : undefined,
      // Fond en Full HD (w1920) : aussi net que l'original sur une TV 1080p, mais 2 à 5 fois plus léger
      // (l'original est souvent en 4K, plusieurs Mo par image). Le w1280 paraît flou en plein écran.
      background: infos[i].backdrop || it.backdrop_path ? `${IMG}w1920${infos[i].backdrop || it.backdrop_path}` : undefined,
      logo: infos[i].logo,
      description: [note ? `${kind === "movie" ? "📅" : "📺"} ${note}${note.endsWith(".") ? "" : "."}` : "", it.overview || ""].filter(Boolean).join("\n") || undefined,
      // Séries : l'épisode de la semaine seulement dans le résumé (le hero affiche aussi cette ligne :
      // il apparaissait deux fois, et coupé ici).
      releaseInfo: [date.slice(0, 4), kind === "movie" ? note : ""].filter(Boolean).join(" · ") || undefined,
      released: shownDate ? `${shownDate}T00:00:00.000Z` : undefined,
      genres: (it.genre_ids || []).map((g) => GENRE_NAMES[g]).filter(Boolean).slice(0, 3),
      imdbRating: imdbRating(ids[i]),   // vraie note IMDb (rien si IMDb n'en a pas assez)
      ...catalogTrailers(infos[i].trailers || [], vfIndex[`${kind}:${ids[i]}`]),
      _digital: firstDigital(infos[i].releases),
      _guess: digitalGuess(infos[i].releases),
      _vf: likelyVf(infos[i].releases, it.original_language, today),
    };
    return meta;
  });
}

/** Paramètres TMDB d'une recherche « discover », avec les règles de qualité communes
 *  et les réglages de la config (pays, genres masqués, note et année minimales, famille). */
function discoverParams(def, kind, today, opts) {
  const p = { ...def.discover };
  const cfg = opts.cfg;
  if (p["vote_count.gte"] === undefined) p["vote_count.gte"] = 50;   // pas de titres confidentiels
  const excluded = new Set(String(p.without_genres || "").split(/[|,]/).filter(Boolean));
  // Téléréalité, talk-shows… masqués, sauf dans une rangée sur mesure qui les demande.
  const wanted = String(p.with_genres || "").split(/[|,]/);
  if (kind === "series") NOISE_TV.filter((g) => !wanted.includes(g)).forEach((g) => excluded.add(g));
  const col = kind === "series" ? 2 : 1;
  for (const name of cfg.e) { const g = GENRES.find(([n]) => n === name); if (g && g[col]) excluded.add(String(g[col])); }
  if (cfg.f) {
    if (kind === "series") { p.with_genres = p.with_genres ? p.with_genres : "10751|10762|16"; ["80", "10768", "9648"].forEach((g) => excluded.add(g)); }
    else { p.certification_country = "FR"; p["certification.lte"] = "10"; excluded.add("27"); }
  }
  if (excluded.size) p.without_genres = [...excluded].join("|");
  if (p.watch_region) p.watch_region = opts.region;
  if (p.region) p.region = opts.region;
  if (cfg.m) p["vote_average.gte"] = Math.max(Number(p["vote_average.gte"]) || 0, cfg.m);
  const gte = kind === "series" ? "first_air_date.gte" : "primary_release_date.gte";
  const lte = kind === "series" ? "first_air_date.lte" : "primary_release_date.lte";
  if (def.lastDays) { p[gte] = addDays(today, -def.lastDays); p[lte] = today; }
  if (def.nextDays) { p[gte] = today; p[lte] = addDays(today, def.nextDays); }
  if (def.untilToday) p[lte] = today;
  if (def.fromYear) p[gte] = maxDate(p[gte], `${def.fromYear}-01-01`);
  if (def.toYear) p[lte] = minDate(p[lte], `${def.toYear}-12-31`);
  if (def.digital) {
    // Sorties numériques (VOD, achat, location) dans le pays choisi, sur une fenêtre de dates.
    delete p[gte]; delete p[lte];
    p.with_release_type = "4";
    p.region = opts.region;
    p["release_date.gte"] = addDays(today, def.digital[0]);
    p["release_date.lte"] = addDays(today, def.digital[1]);
    // Seulement les films récents : sans ça, TMDB renvoie aussi les vieux films
    // ressortis en numérique (rééditions, versions restaurées…).
    p["primary_release_date.gte"] = addDays(today, -365);
  }
  if (def.airedSince) p["air_date.gte"] = addDays(today, -def.airedSince);
  if (def.airDays !== undefined) { p["air_date.gte"] = addDays(today, -def.airDays); p["air_date.lte"] = addDays(today, def.airDays); }
  if (cfg.a) {
    p[gte] = maxDate(p[gte], `${cfg.a}-01-01`);
    const yearKey = kind === "series" ? "first_air_date_year" : "primary_release_year";
    if (p[yearKey] && Number(p[yearKey]) < cfg.a) p[yearKey] = cfg.a;   // année demandée trop ancienne : liste vide
  }
  return p;
}
const maxDate = (a, b) => (!a || b > a ? b : a);
const minDate = (a, b) => (!a || b < a ? b : a);

/**
 * Listes « toutes faites » de TMDB (tendances, à l'affiche…) : elles n'acceptent aucun
 * filtre. Quand des filtres globaux sont actifs, on les remplace par l'équivalent « discover ».
 */
function endpointAsDiscover(def) {
  const map = {
    "/trending/movie/week": { lastDays: 365 }, "/trending/tv/week": { lastDays: 365 },
    "/trending/movie/day": { lastDays: 120 }, "/trending/tv/day": { lastDays: 120 },
    "/movie/now_playing": { lastDays: 45, discover: { with_release_type: "2|3", region: "FR" } },
    "/movie/upcoming": { nextDays: 90, discover: { with_release_type: "2|3", region: "FR" } },
    "/tv/on_the_air": { airDays: 7 }, "/tv/airing_today": { airDays: 0 },
  };
  const m = map[def.endpoint];
  if (!m) return def;
  const { endpoint, params, ...rest } = def;
  return { ...rest, ...m, discover: { sort_by: "popularity.desc", "vote_count.gte": 10, ...(m.discover || {}) } };
}

/** Une page (1, 2, 3…) d'une définition de liste. */
async function fetchPage(env, ctx, def, kind, page, today, opts) {
  if (def.mix) {
    // Rangée mélangée : page N des films + page N des séries, en alternance.
    const lists = await Promise.all(def.mix.map((sub) => fetchPage(env, ctx, sub, sub.type, page, today, opts)));
    const out = [];
    for (let i = 0; i < Math.max(...lists.map((l) => l.length)); i++) {
      lists.forEach((l) => { if (l[i]) out.push(l[i]); });
    }
    return out;
  }
  if (def.digital) return fetchVfPage(env, ctx, def, kind, page, today, opts);
  if (def.upcoming) return fetchUpcomingPage(env, ctx, kind, page, today, opts);
  if (def.endpoint && opts.filtered) def = endpointAsDiscover(def);
  if (def.endpoint && def.endpoint.startsWith("/trending/") && !opts.cfg.u) return fetchReleasedPage(env, ctx, def, kind, page, today, opts);
  let data;
  if (def.endpoint) {
    const params = { ...(def.params || {}) };
    if (params.region) params.region = opts.region;
    data = await tmdb(env, def.endpoint, { ...params, page }, opts.lang);
  } else {
    const endpoint = `/discover/${kind === "series" ? "tv" : "movie"}`;
    const params = discoverParams(def, kind, today, opts);
    let p = page;
    if (def.rotateDaily) {
      // Sélection différente chaque jour : on démarre plus loin dans la liste selon la date.
      const dayIndex = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86400000);
      p = page + (dayIndex % 15);
    }
    data = await tmdb(env, endpoint, { ...params, page: p }, opts.lang);
  }
  if (!data.results || page > (data.total_pages || 0)) return [];
  const metas = await toMetas(env, ctx, data.results, kind, opts, today);
  return metas.map(({ _digital, _guess, _vf, ...m }) => m);
}

/**
 * Tendances avec seulement ce qu'on peut déjà regarder chez soi : TMDB y classe aussi les films
 * attendus dès leur bande-annonce (Godzilla Minus Zero, voir « Les plus attendus ») et ceux qui
 * ne sont encore qu'au cinéma (Street Fighter, voir « Bientôt dispo »). Séries : déjà diffusées.
 * Pages pleines (20) : la page N part de la page N de TMDB et se complète avec la suivante. Nuvio
 * demande la suite avec skip = titres déjà reçus et ignore les doublons : rien ne manque ni ne
 * s'affiche deux fois. Les infos lues pour trier (dates de sortie) resservent pour les fiches.
 */
const MAX_CHECKED = 40;   // fiches TMDB lues au plus par page (limite d'appels de Cloudflare)
async function fetchReleasedPage(env, ctx, def, kind, page, today, opts) {
  const [ranks, ...lists] = await Promise.all([
    def.endpoint.endsWith("/day") ? postersPlusRanks(kind) : new Map(),
    ...[page, page + 1].map((p) => tmdb(env, def.endpoint, { ...(def.params || {}), page: p }, opts.lang)),
  ]);
  // Sans rang chez Posters+ : sa place chez TMDB (juste après le rang égal), pas la fin de la
  // liste, d'où il sortirait de la page sans revenir à la suivante. Un titre passé d'une page de
  // TMDB à l'autre entre deux lectures n'est gardé qu'une fois.
  const pos = new Map();
  const released = lists.flatMap((d) => d.results || [])
    .map((it, i) => { pos.set(it, ranks.get(it.id) || (page - 1) * PAGE + i + 1.5); return it; })
    .filter((it, i, all) => all.findIndex((x) => x.id === it.id) === i)
    .filter((it) => { const date = it.release_date || it.first_air_date; return date && date <= today; })
    .sort((a, b) => pos.get(a) - pos.get(b));
  let picked = released.slice(0, PAGE);
  if (kind === "movie") {
    const infos = new Map();
    picked = [];
    for (let i = 0; i < released.length && picked.length < PAGE && infos.size < MAX_CHECKED;) {
      const batch = released.slice(i, i + Math.min(PAGE - picked.length + 4, MAX_CHECKED - infos.size));
      i += batch.length;
      const got = await Promise.all(batch.map((it) => extraInfo(env, kind, it.id)));
      batch.forEach((it, k) => {
        infos.set(it.id, got[k]);
        if (picked.length < PAGE && watchable(got[k], it.release_date, today)) picked.push(it);
      });
    }
    opts = { ...opts, infos };
  }
  if (!picked.length) return [];
  const metas = await toMetas(env, ctx, picked, kind, opts, today);
  return metas.map(({ _digital, _guess, _vf, ...m }) => m);
}

/**
 * Rang de chaque titre (identifiant TMDB → 1, 2, 3…) dans le classement « TMDB aujourd'hui » de
 * Posters+, celui de son badge « #1 aujourd'hui » sur les affiches : les Tendances du jour suivent
 * cet ordre plutôt que celui de TMDB, qui a déjà bougé quand Posters+ relit le sien. Les animés
 * (classés par AniList) n'y sont pas. Posters+ injoignable : liste vide, l'ordre de TMDB reste.
 */
const PP_TRENDING = "https://postersplus.stremio.ru/trending/catalog";
async function postersPlusRanks(kind) {
  const url = `${PP_TRENDING}/${kind === "series" ? "series/pp.trending.series" : "movie/pp.trending.movie"}.json`;
  const d = await fetch(url, { cf: { cacheTtl: 3600, cacheEverything: true } })
    .then((res) => (res.ok ? res.json() : null), () => null).catch(() => null);
  const ranks = new Map();
  ((d && d.metas) || []).forEach((m, i) => {
    const id = /^tmdb:(\d+)$/.exec(m.id || "");
    if (id && !ranks.has(Number(id[1]))) ranks.set(Number(id[1]), i + 1);
  });
  return ranks;
}

/** Film regardable chez soi : sorti en numérique (ou salle + 45 jours passés). Sans infos : gardé. */
function watchable(info, date, today) {
  if (!info.releases) return true;
  const dispo = firstDigital(info.releases) || digitalGuess(info.releases);
  return dispo ? dispo <= today : date <= addDays(today, -45);
}

/**
 * Rangée « Les plus attendus » : les films pas encore sortis que les Tendances écartent, dans le
 * même ordre (le buzz). Ils sont rares (2 ou 3 sur 20) : une seule page, lue sur les 10 premières
 * pages des tendances. Avec des filtres globaux (les tendances n'en acceptent pas) : les films à
 * venir les plus populaires d'après « discover ».
 */
const UPCOMING_PAGES = 10;
async function fetchUpcomingPage(env, ctx, kind, page, today, opts) {
  if (page > 1) return [];
  let found;
  if (opts.filtered) {
    const params = discoverParams({ discover: { sort_by: "popularity.desc", "vote_count.gte": 0 } }, kind, today, opts);
    params["primary_release_date.gte"] = maxDate(params["primary_release_date.gte"], addDays(today, 1));
    found = (await tmdb(env, "/discover/movie", params, opts.lang)).results || [];
  } else {
    const pages = await Promise.all(Array.from({ length: UPCOMING_PAGES }, (_, i) =>
      tmdb(env, "/trending/movie/week", { page: i + 1 }, opts.lang)));
    const seen = new Set();
    found = pages.flatMap((d) => d.results || [])
      .filter((it) => !(it.release_date && it.release_date <= today) && !seen.has(it.id) && seen.add(it.id));
  }
  if (!found.length) return [];
  const metas = await toMetas(env, ctx, found.slice(0, PAGE), kind, { ...opts, upcoming: true }, today);
  return metas.map(({ _digital, _guess, _vf, ...m }) => m);
}

/**
 * Rangées « Dispo depuis peu » / « Bientôt dispo » : films dont la PREMIÈRE sortie
 * numérique (tous pays) tombe dans la fenêtre. Pour « Bientôt », on ajoute les films
 * encore sans date annoncée dont l'estimation (salle + 45 jours) tombe dans la fenêtre.
 */
async function fetchVfPage(env, ctx, def, kind, page, today, opts) {
  const future = def.digital[0] > 0;
  // Filtres de la config (genres masqués, note mini, famille…) appliqués comme ailleurs.
  const base = { ...discoverParams({ ...def, digital: null }, kind, today, opts), page };
  base["primary_release_date.gte"] = maxDate(base["primary_release_date.gte"], addDays(today, -365));
  const reqs = [tmdb(env, "/discover/movie", { ...base, with_release_type: "4",
    "release_date.gte": addDays(today, def.digital[0]), "release_date.lte": addDays(today, def.digital[1]) }, opts.lang)];
  if (future) reqs.push(tmdb(env, "/discover/movie", { ...base, with_release_type: "3|2",
    "release_date.gte": addDays(today, def.digital[0] - 45), "release_date.lte": addDays(today, def.digital[1] - 45) }, opts.lang));
  // « Bientôt » : aussi les films des tendances encore au cinéma (retirés des Tendances), que
  // « discover » laisse parfois passer (trop peu de votes). Pas avec des filtres : les tendances
  // n'en acceptent pas.
  const trending = future && page === 1 && !opts.filtered;
  if (trending) [1, 2].forEach((p) => reqs.push(tmdb(env, "/trending/movie/week", { page: p }, opts.lang)));
  const lists = await Promise.all(reqs);
  if (trending) lists.slice(-2).forEach((d) => {
    d.results = (d.results || []).filter((it) => it.release_date && it.release_date <= today && it.release_date >= addDays(today, -120));
  });
  const seen = new Set(), merged = [];
  lists.flatMap((d) => d.results || []).sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .forEach((it) => { if (!seen.has(it.id)) { seen.add(it.id); merged.push(it); } });
  if (!merged.length) return [];
  const metas = await toMetas(env, ctx, merged.slice(0, 36), kind, opts, today);
  const from = addDays(today, def.digital[0]), to = addDays(today, def.digital[1]);
  const when = (m) => m._digital || (future ? m._guess : "");
  return metas
    .filter((m) => when(m) && when(m) >= from && when(m) <= to)
    .filter((m) => future || m._vf)   // « Dispo depuis peu » : seulement ceux qui ont sûrement une VF
    .sort((a, b) => (future ? (when(a) < when(b) ? -1 : 1) : (when(a) > when(b) ? -1 : 1)))
    .map(({ _digital, _guess, _vf, ...m }) => m);
}

function parseExtra(segment) {
  const out = {};
  for (const part of (segment || "").split("&")) {
    const [k, ...v] = part.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v.join("="));
  }
  return out;
}

const SEARCH = [
  // Avec « Afficher le type de catalogue » désactivé (réglage du guide), Nuvio affiche le nom seul.
  { id: "recherche-films", type: "movie", name: "Films" },
  { id: "recherche-series", type: "series", name: "Séries" },
];

// Vocabulaire des titres connus, pour corriger les fautes de frappe de la recherche
// (data/search-words.json, refait chaque nuit) : chargé une fois par instance du Worker.
let WORDS = null;
function searchWords() {
  if (!WORDS) {
    WORDS = fetch(`${ASSETS}/data/search-words.json`, { cf: { cacheTtl: 6 * 3600, cacheEverything: true } })
      .then((r) => (r.ok ? r.json() : null))
      .then(prepareWords)
      .catch(() => { WORDS = null; return null; });
  }
  return WORDS;
}

/**
 * Recherche tolérante (sigles, fautes, année, suites, personnes, studios) : voir search.js.
 * Avec GEMINI_API_KEY, l'IA prend le relais pour les descriptions (« le film où… ») et les
 * requêtes que la recherche classique ne reconnaît pas : voir ai.js.
 */
async function runSearch(env, type, query, page, opts, trace) {
  const endpoint = `/search/${type === "series" ? "tv" : "movie"}`;
  let left = SEARCH_BUDGET;
  const none = Promise.resolve({});
  const search = (q, p, extra = {}) => {
    if (left-- <= 0) return none;
    const { language, ...rest } = extra;
    return tmdb(env, endpoint, { query: q, page: p, include_adult: "false", region: opts.region, ...rest }, language || opts.lang);
  };
  const api = (path, params = {}) => (left-- > 0 ? tmdb(env, path, params, opts.lang) : none);
  const stats = {};
  const classicSearch = () => smartSearch(query, page, search, type, api, { words: searchWords, region: opts.region, trace, stats });
  // Sans clé Gemini, l'IA ne fait que relire les réponses déjà en cache (aiTitles en lecture seule).
  if (page !== 1) {
    if (trace) trace.ai = "page suivante : recherche classique";
    return classicSearch();
  }
  // Une description : Gemini part tout de suite. Pas toute la recherche classique (une dizaine
  // d'appels TMDB pour rien) : seulement de quoi reconnaître un titre connu fait de ces mots
  // (« danse avec les loups »), qui garde alors la recherche classique.
  const descriptive = looksDescriptive(query);
  const aiOpts = { model: opts.aiModel, thinking: opts.aiThinking, fresh: opts.aiFresh };   // réglages de /debug/search
  const ai = descriptive ? aiTitles(env, opts.ctx, query, aiOpts) : null;
  let classic = [];
  if (descriptive) {
    const quick = await search(query, 1);
    if ((quick.results || []).some((it) => isExact(query, it) && it.vote_count >= 300)) {
      if (trace) trace.ai = { descriptive, why: null, titreConnu: true };
      return classicSearch();
    }
  } else {
    classic = await classicSearch();
  }
  // Titre connu, personne, saga ou studio : la recherche classique suffit, sans attendre Gemini
  // (s'il est déjà parti, il finit en arrière-plan et remplit son cache).
  const strong = stats.strong || new Set();
  const why = descriptive ? "description" : stats.sure ? null : !strong.size ? "rien de proche" : null;
  if (trace) trace.ai = { descriptive, sure: !!stats.sure, strong: strong.size, why };
  if (!why) return classic;
  const job = ai || aiTitles(env, opts.ctx, query, aiOpts);
  const answer = await Promise.race([job, new Promise((r) => setTimeout(() => r(null), AI_WAIT_MS))]);
  // Pas de réponse à temps ou erreur : la recherche classique, sans la garder en cache, pour que
  // la même recherche refaite profite de la réponse de Gemini (qui finit en arrière-plan). Sans clé
  // et rien en cache : la recherche classique, gardée (il n'y a rien de mieux à attendre).
  const miss = aiMiss(answer);
  if (miss) {
    if (miss !== "absent") opts.partial = true;
    if (trace) trace.ai.error = miss === "absent" ? "pas de clé Gemini, rien en cache" : answer ? answer.error : `pas de réponse en ${AI_WAIT_MS} ms`;
    return descriptive ? classicSearch() : classic;
  }
  const found = await resolveTitles(answer.titles, type, search, api);
  if (trace) {
    Object.assign(trace.ai, {
      model: answer.model, ms: answer.ms, cached: answer.cached, tried: answer.tried,
      picks: answer.titles, found: found.map((it) => ({ name: it.title || it.name, date: it.release_date || it.first_air_date, votes: it.vote_count })),
      tmdbCalls: SEARCH_BUDGET - Math.max(0, left),
    });
  }
  // Rien pour ce type à partir d'un titre mal écrit : la recherche classique telle quelle. Une
  // description, elle, n'a rien à voir avec les titres trouvés mot à mot (« la série avec le prof
  // de chimie » : Breaking Bad dans Séries, pas « La guerre des drogues » dans Films).
  if (!found.length && !descriptive) return classic;
  // Les titres retrouvés par l'IA d'abord, puis seulement les titres de la recherche classique
  // qui ressemblent à la requête (pas « Fils de personne » pour « des personnages bleus »).
  const seen = new Set();
  return [...found, ...classic.filter((it) => strong.has(it.id))]
    .filter((it) => !seen.has(it.id) && seen.add(it.id)).slice(0, AI_MAX);
}

async function catalog(env, ctx, type, id, extra, today, cfg) {
  const skip = Number(extra.skip || 0);
  const opts = { cfg, ctx, lang: langOf(cfg), region: cfg.g, filtered: hasGlobalFilters(cfg) };
  const search = SEARCH.find((c) => c.id === id && c.type === type);
  if (search) {
    const query = (extra.search || "").trim();
    if (!query) return [];
    const page = Math.floor(skip / PAGE) + 1;
    const results = await runSearch(env, type, query, page, opts);
    opts.search = true;
    const metas = results.length ? (await toMetas(env, ctx, results, type, opts, today)).map(({ _digital, _guess, _vf, ...m }) => m) : [];
    // Recherche faite sans l'IA (Gemini trop lent ou en panne) : à ne pas garder en cache.
    if (opts.partial) metas.partial = true;
    return metas;
  }
  // « accueil-en-ce-moment » : ancien identifiant de la rangée de saison, encore demandé
  // par les Nuvio qui ont gardé l'ancien manifeste en mémoire.
  const wanted = id === "accueil-en-ce-moment" ? "accueil-saison" : id;
  const home = homeDefs(today, cfg).find((d) => d.id === wanted && d.type === type);
  if (home) {
    const page = Math.floor(skip / pageSizeOf(home)) + 1;
    return fetchPage(env, ctx, home, type, page, today, opts);
  }
  const disc = DEFS.discover.find((d) => d.id === id && d.type === type);
  if (disc) {
    // Sans filtre (Nuvio ouvre Découvrir sur « Par défaut ») : le 1er filtre (« Tout »…).
    const opt = extra.genre ? disc.options.find((o) => o.label === extra.genre) : disc.options[0];
    if (!opt) return [];
    const page = Math.floor(skip / PAGE) + 1;
    return fetchPage(env, ctx, opt.def, type, page, today, opts);
  }
  return [];
}

// ---------- fiches (meta) ----------
// Les fiches détaillées (résumé, casting, saisons, épisodes, bande-annonce) en français,
// directement depuis TMDB : plus besoin de TMDB Discover Plus.
const CACHE_META_S = 12 * 3600;    // une fiche reste 12 h dans le cache Cloudflare
const CACHE_META_CLIENT_S = 3600;  // et 1 h dans Nuvio

const STATUS_FR = {
  "Returning Series": "En cours", Ended: "Terminée", Canceled: "Annulée", "In Production": "En production",
  Planned: "Annoncée", Pilot: "Pilote", Released: "Sorti", "Post Production": "Bientôt",
};

/** Identifiant TMDB d'un titre demandé en « tt… » ou « tmdb:… ». */
async function tmdbIdOf(env, kind, id) {
  if (/^tmdb:\d+/.test(id)) return id.slice(5).split(":")[0];
  if (!/^tt\d+$/.test(id)) return null;
  const found = await tmdb(env, `/find/${id}`, { external_source: "imdb_id" });
  const hits = (kind === "series" ? found.tv_results : found.movie_results) || [];
  // Fiches TMDB en double pour un même IMDb : on garde la plus connue.
  hits.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0) || (b.popularity || 0) - (a.popularity || 0));
  return hits[0] ? String(hits[0].id) : null;
}

/** Image dans la langue voulue, sinon anglais, sinon sans texte. */
function bestImage(list, lang) {
  const order = [lang, "en", null, undefined];
  return [...(list || [])].sort((a, b) =>
    (order.indexOf(a.iso_639_1) + 1 || 9) - (order.indexOf(b.iso_639_1) + 1 || 9) || (b.vote_average || 0) - (a.vote_average || 0))[0];
}

// Vraie VF : TMDB classe aussi en « fr » les VOSTFR (son original, sous-titres français).
const isVf = (lang, name) => lang === "fr" && !/\bVOST/i.test(name || "");

function trailersOf(videos) {
  return (videos || [])
    .filter((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
    // VF d'abord, puis VOSTFR, puis la meilleure définition (4K, 1080p, 720p…) : Nuvio lit la première dans
    // le hero, et une vidéo pas en HD y devient floue (le hero zoome l'image).
    .sort((a, b) => isVf(b.iso_639_1, b.name) - isVf(a.iso_639_1, a.name) || (b.iso_639_1 === "fr") - (a.iso_639_1 === "fr")
      || (b.size || 0) - (a.size || 0) || (b.type === "Trailer") - (a.type === "Trailer")
      || (b.official === true) - (a.official === true))
    .slice(0, 4)
    .map((v) => ({ source: v.key, ytId: v.key, type: v.type, name: v.name, lang: v.iso_639_1 }));
}

// Bande-annonce en VF quand TMDB n'en a pas (séries, films moins connus) : Allociné dit si une VF
// existe et donne son titre exact, YouTube la fournit (Nuvio ne lit que YouTube).
const VF_CACHE_S = 30 * 86400; // VF trouvée : 30 jours (elle ne change presque jamais ; moins de recherches YouTube)
const VF_MISS_S = 2 * 86400;   // pas de VF : on réessaie dans 2 jours (elle sort souvent peu avant le titre)
const VF_WAIT_MS = 2000;       // attente maximale à l'ouverture d'une fiche
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  "Accept-Language": "fr-FR,fr;q=0.9",
};
const decodeHtml = (s) => s.replace(/&#0*39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const shortName = (name) => name.split(/ [:–-] /)[0].trim();

/**
 * Titre de la bande-annonce VF sur Allociné (« Black Mirror - saison 7 Bande-annonce VF ») ; null si
 * Allociné n'a pas de VF, undefined si le titre n'y est pas, false si Wikidata n'a pas répondu. Fiche
 * Allociné trouvée par l'IMDb, via Wikidata.
 */
async function allocineVf(kind, imdb) {
  const q = `SELECT ?a WHERE { ?f wdt:P345 "${imdb}"; wdt:${kind === "series" ? "P1267" : "P1265"} ?a }`;
  const wd = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`, { headers: WIKI_HEADERS, cf: WIKI_CACHE })
    .then((r) => (r.ok ? r.json() : null), () => null);
  if (!wd) return false;
  const id = ((((wd.results || {}).bindings || [])[0] || {}).a || {}).value;
  if (!/^\d+$/.test(id || "")) return undefined;
  // Films : la fiche liste les vidéos. Séries : page des vidéos, la plus récente saison d'abord.
  const url = kind === "series" ? `https://www.allocine.fr/series/ficheserie-${id}/videos/` : `https://www.allocine.fr/film/fichefilm_gen_cfilm=${id}.html`;
  const html = await fetch(url, { headers: BROWSER_HEADERS }).then((r) => (r.ok ? r.text() : ""), () => "");
  const name = decodeHtml((html.match(/<title>([^<]*)/) || [])[1] || "").replace(/^Trailers & Teasers de /, "").split(/ - (?:Film|Série|AlloCiné)/)[0].trim();
  if (!name) return undefined;
  // La page montre aussi les vidéos d'autres titres : seules celles qui commencent par le nom comptent.
  const titles = [...html.matchAll(/>([^<>]*\b(?:Bande-annonce|Teaser)\b[^<>]*\bVF\b[^<>]*)</g)]
    .map((x) => decodeHtml(x[1]).trim()).filter((t) => norm(t).startsWith(norm(name)));
  const season = (t) => (t.match(/saison \d+/i) || [""])[0].toLowerCase();
  // Une bande-annonce passe avant un teaser de la même saison.
  return titles.find((t) => /Bande-annonce/.test(t) && season(t) === season(titles[0])) || titles[0] || null;
}

// Mots admis devant le nom dans le titre d'une vidéo trouvée par recherche directe (« Bande-annonce VF Below »,
// « FX The Bear… ») : tout autre mot désigne une autre œuvre (« Above and Below »).
const TRAILER_WORDS = new Set("bande annonce d trailer teaser vf officielle officiel nouvelle new la le les l fx netflix disney prime video apple tv hbo max canal paramount".split(" "));

/**
 * Bande-annonce VF trouvée sur YouTube pour une recherche, si son titre nomme l'œuvre (et la saison) ;
 * null sinon, undefined si YouTube n'a pas répondu. Avec « year » (recherche directe, sans titre
 * Allociné) : le nom doit ouvrir le titre, et une année cohérente y figurer (celle du film à un an près,
 * celle de la première saison d'une série).
 */
async function youtubeVf(query, name, season, year, series) {
  const html = await fetch(`https://www.youtube.com/results?hl=fr&gl=FR&search_query=${encodeURIComponent(query)}`, { headers: BROWSER_HEADERS })
    .then((r) => (r.ok ? r.text() : ""), () => "");
  if (!html.includes('"videoRenderer"')) return undefined;
  const want = ` ${norm(name)} `;
  const seasonRe = season ? new RegExp(`\\b(saison|season|s) ?0?${season}\\b`) : null;
  const re = /"videoRenderer":\{"videoId":"([\w-]{11})"[\s\S]{0,3000}?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g;
  for (const m of html.matchAll(re)) {
    let title;
    try { title = JSON.parse(`"${m[2]}"`); } catch (e) { continue; }
    const t = norm(title);
    // Une bande-annonce en VF (pas un épisode ni un extrait), qui nomme l'œuvre (et la saison).
    if (!/\bvf\b|version francaise/.test(t) || /\bvost/.test(t) || !/\b(bande d? ?annonce|ba|trailer|teaser|nouvelle saison)\b/.test(t)
      || !` ${t} `.includes(want) || (seasonRe && !seasonRe.test(t))) continue;
    if (year) {
      const before = ` ${t} `.slice(0, ` ${t} `.indexOf(want)).trim().split(" ").filter(Boolean);
      const y = Number(year), years = [...t.matchAll(/\b(?:19|20)\d\d\b/g)].map((x) => Number(x[0]));
      // Une série et un film du même nom (Bleach, Friday Night Lights) : la vidéo doit être du bon côté.
      const seriesWords = /\b(saison|season|serie|series|episode)\b/.test(t);
      if (series ? /\bfilm\b/.test(t) : seriesWords) continue;
      // Série : l'année de la première saison, ou une plus récente (ou aucune) si la vidéo dit de quelle saison
      // il s'agit (« Black Clover - Saison 1 en VF : Bande-annonce »).
      const okYear = (n) => (series ? n === y || (seriesWords && n > y && n <= new Date().getFullYear() + 1) : Math.abs(n - y) <= 1);
      if (before.some((w) => !TRAILER_WORDS.has(w)) || !(years.some(okYear) || (series && seriesWords && !years.length))) continue;
    }
    return { key: m[1], title };
  }
  return null;
}

/** Bande-annonce VF d'un titre ({ key: identifiant YouTube, title }, ou { key: null }), gardée en cache. */
async function vfTrailer(kind, imdb, name, year) {
  const cacheKey = new Request(`https://cache.local/vf-trailer/v5/${kind}/${imdb}`);
  const hit = await caches.default.match(cacheKey);
  if (hit) return hit.json();
  const allo = await allocineVf(kind, imdb);
  let found = null, failed = false;
  const search = async (...args) => {
    const r = await youtubeVf(...args);
    if (r === undefined) failed = true;
    return r || null;
  };
  // « The Bear : sur place ou à emporter - saison 5 Bande-annonce VF » : le sous-titre gêne la recherche.
  if (allo) found = await search(allo.replace(/ : [^-]+(?= - )/, ""), shortName(name), (allo.match(/saison (\d+)/i) || [])[1]);
  // Pas de VF sur Allociné (elle y manque souvent), titre absent d'Allociné, ou VF introuvable sur YouTube
  // sous son titre Allociné : recherche directe, plus stricte.
  if (!found && year) found = await search(`${name} ${kind === "series" ? "série " : ""}bande annonce VF ${year}`, shortName(name), null, year, kind === "series");
  // Wikidata ou YouTube muet : rien n'est gardé, on réessaiera.
  if (!found && (failed || allo === false)) found = undefined;
  // HD ou pas : YouTube n'a l'image « maxresdefault » que pour les vidéos d'au moins 720p.
  const hd = found ? await fetch(`https://i.ytimg.com/vi/${found.key}/maxresdefault.jpg`, { method: "HEAD" }).then((r) => r.ok, () => true) : false;
  const out = found ? { key: found.key, title: found.title, hd } : { key: null };
  // YouTube n'a pas répondu : rien n'est gardé, on réessaiera à la prochaine ouverture.
  if (found !== undefined) {
    await caches.default.put(cacheKey, new Response(JSON.stringify(out), { headers: { "Cache-Control": `public, max-age=${found ? VF_CACHE_S : VF_MISS_S}` } }));
  }
  if (found) await addToVfIndex(`${kind}:${imdb}`, { key: found.key, hd });
  return out;
}

// Index des VF trouvées, pour les rangées de l'accueil : Nuvio y lance la bande-annonce sans ouvrir la
// fiche, et chercher la VF de chaque titre d'une page dépasserait la limite d'appels de Cloudflare.
const VF_INDEX = new Request("https://cache.local/vf-trailer/index");
const VF_INDEX_MAX = 4000;     // titres gardés (les plus anciens sortent en premier)

function readVfIndex() {
  return caches.default.match(VF_INDEX).then((r) => (r ? r.json() : {})).catch(() => ({}));
}

async function addToVfIndex(id, vf) {
  const index = await readVfIndex();
  delete index[id];
  index[id] = vf;
  const ids = Object.keys(index);
  ids.slice(0, Math.max(0, ids.length - VF_INDEX_MAX)).forEach((k) => delete index[k]);
  await caches.default.put(VF_INDEX, new Response(JSON.stringify(index), { headers: { "Cache-Control": `public, max-age=${30 * 86400}` } }));
}

/** Bandes-annonces d'un titre de rangée : celles de TMDB, avec la VF de l'index si TMDB n'en a pas. */
function catalogTrailers(trailers, vf) {
  let list = trailers;
  if (vf && vf.key && !trailers.some((t) => isVf(t.lang, t.name))) {
    const vfItem = { source: vf.key, ytId: vf.key, type: "Trailer", lang: "fr" };
    // Même règle que la fiche : une VF pas en HD passe après la bande-annonce de TMDB.
    list = vf.hd === false && trailers.length ? [trailers[0], vfItem, ...trailers.slice(1)] : [vfItem, ...trailers];
  }
  return list.length ? { trailers: list, trailerStreams: list.map((t) => ({ ytId: t.ytId })) } : {};
}

const person = (p) => ({ name: p.name, character: p.character || p.job || undefined, photo: p.profile_path ? `${IMG}w185${p.profile_path}` : undefined, tmdbId: p.id });

async function meta(env, kind, id, cfg, today, ctx, opts = {}) {
  const tmdbId = await tmdbIdOf(env, kind, id);
  if (!tmdbId) return null;
  const lang = langOf(cfg);
  const short = lang.slice(0, 2);
  const movie = kind === "movie";
  const d = await tmdb(env, `/${movie ? "movie" : "tv"}/${tmdbId}`, {
    append_to_response: movie ? "credits,videos,images,release_dates,external_ids,keywords" : "aggregate_credits,credits,videos,images,external_ids,content_ratings,keywords",
    include_image_language: `${short},en,null`, include_video_language: `${short},en`,
  }, lang);
  if (!d || !d.id) return null;

  const imdb = (movie ? d.imdb_id : d.external_ids && d.external_ids.imdb_id) || null;
  const metaId = id.startsWith("tt") ? id : imdb || `tmdb:${tmdbId}`;
  const date = (movie ? d.release_date : d.first_air_date) || "";
  const releases = movie ? (d.release_dates && d.release_dates.results) || [] : null;
  const note = movie ? releaseNote(releases, cfg.g, today) : episodeNote(episodeOf(d), today);
  const dispo = movie ? firstDigital(releases) || digitalGuess(releases) : "";
  const shownDate = dispo && dispo > today ? dispo : date;
  const credits = d.credits || {};
  const castList = movie ? credits.cast || [] : (d.aggregate_credits && d.aggregate_credits.cast || []).map((c) => ({ ...c, character: (c.roles || [])[0] && c.roles[0].character }));
  const crew = credits.crew || [];
  const directors = movie ? crew.filter((c) => c.job === "Director") : (d.created_by || []);
  const writers = crew.filter((c, i, all) => c.department === "Writing" && all.findIndex((o) => o.id === c.id && o.department === "Writing") === i).slice(0, 4);
  const logo = bestImage(d.images && d.images.logos, short);
  const backdrop = bestImage((d.images && d.images.backdrops || []).filter((b) => !b.iso_639_1), short);
  const runtime = movie ? d.runtime : (d.episode_run_time || [])[0];
  const cert = movie
    ? ((releases.find((r) => r.iso_3166_1 === cfg.g) || {}).release_dates || []).map((r) => r.certification).find(Boolean)
    : ((d.content_ratings && d.content_ratings.results || []).find((r) => r.iso_3166_1 === cfg.g) || {}).rating;
  const trailers = trailersOf(d.videos && d.videos.results);
  // Pas de VF sur TMDB : recherche Allociné + YouTube, lancée tout de suite et attendue en fin de fiche.
  let vfJob = null;
  if (short === "fr" && imdb && !trailers.some((t) => isVf(t.lang, t.name))) {
    const job = vfTrailer(kind, imdb, (d.title || d.name || "").trim(), date.slice(0, 4)).catch(() => null);
    ctx.waitUntil(job);
    vfJob = Promise.race([job, new Promise((res) => setTimeout(() => res("attente"), VF_WAIT_MS))]);
  }
  const endYear = !movie && d.status !== "Returning Series" && d.last_air_date ? d.last_air_date.slice(0, 4) : "";

  const m = {
    id: metaId,
    imdb_id: imdb || undefined,
    type: kind,
    name: (d.title || d.name || "").trim(),
    poster: d.poster_path ? `${IMG}w500${d.poster_path}` : undefined,
    background: backdrop ? `${IMG}w1920${backdrop.file_path}` : d.backdrop_path ? `${IMG}w1920${d.backdrop_path}` : undefined,
    logo: logo ? `${IMG}w500${logo.file_path.replace(/\.svg$/, ".png")}` : undefined,
    description: [note ? `${movie ? "📅" : "📺"} ${dot(note)}` : "", d.overview || ""].filter(Boolean).join("\n") || undefined,
    releaseInfo: movie ? [date.slice(0, 4), note].filter(Boolean).join(" · ") || undefined
      : date ? `${date.slice(0, 4)}-${endYear}` : undefined,
    released: shownDate ? `${shownDate}T00:00:00.000Z` : undefined,
    // « En cours » entre deux saisons trompait (Crystal Lake, saison 1 finie) : « Entre deux saisons ».
    status: !movie && d.status === "Returning Series" && betweenSeasons(episodeOf(d), today)
      ? "Entre deux saisons" : STATUS_FR[d.status] || d.status || undefined,
    imdbRating: imdbRating(imdb),
    genres: (d.genres || []).map((g) => GENRE_NAMES[g.id] || g.name),
    runtime: runtime ? `${runtime} min` : undefined,
    director: directors.map((p) => p.name),
    writer: writers.map((p) => p.name),
    cast: castList.slice(0, 15).map((p) => p.name),
    country: (d.production_countries || []).map((c) => c.iso_3166_1).join(", ") || undefined,
    language: d.original_language || undefined,
    trailers,
    trailerStreams: trailers.map((t) => ({ ytId: t.ytId })),
    links: imdb ? [{ name: "IMDb", category: "imdb", url: `https://www.imdb.com/title/${imdb}` }] : [],
    app_extras: {
      cast: castList.slice(0, 20).map(person),
      directors: directors.map(person),
      writers: writers.map(person),
      certification: cert || undefined,
    },
    behaviorHints: movie ? { defaultVideoId: metaId } : { hasScheduledVideos: d.status === "Returning Series" },
  };

  // Infos en plus, après le résumé : scène après le générique, œuvre adaptée, temps pour tout voir,
  // « pour qui » et « à savoir » (IA), puis le rappel de l'œuvre précédente (IA).
  const keywords = ((movie ? d.keywords && d.keywords.keywords : d.keywords && d.keywords.results) || []).map((k) => k.name);
  // En premier : y aura-t-il une suite ? (série terminée, saison annoncée, film suivant de la saga)
  const follow = movie ? null : seriesFollow(d, today);
  const extras = [follow ? follow.text : "", movie ? creditsScene(keywords) : "", sourceNote(keywords, crew)];

  // Lignes écrites par l'IA, lancées dès que possible, pendant que le reste de la fiche se construit :
  // « pour qui » et saison commandée n'ont besoin que de la fiche TMDB ; le rappel part dès que la
  // saga ou les épisodes sont connus. L'attente maximale compte à partir d'ici.
  // Sans clé Gemini, « pour qui » et le rappel sont seulement relus dans le cache (écrits pour un autre).
  // Fiche « légère » (survol dans l'aperçu du site) : sans les lignes écrites par Gemini, pour ne pas
  // dépenser le quota à chaque affiche survolée.
  const ai = !!env.GEMINI_API_KEY && !opts.leger;
  const aiWait = new Promise((res) => setTimeout(() => res("attente"), FICHE_AI_WAIT_MS));
  const ask = (job) => (job ? Promise.race([job, aiWait]) : null);
  const profileJob = ask(aiProfile(env, ctx, `${movie ? "movie" : "tv"}-${d.id}`, profilePrompt(d, movie, keywords, cert)));
  // TMDB dit « pas terminée » sans saison annoncée : Wikipédia tranche (renouvelée ou non).
  const renewalJob = ai && follow && follow.unsure ? ask(renewalOf(env, ctx, d, follow.season, today)) : null;

  let saga = null;
  if (movie && d.belongs_to_collection) {
    const col = await tmdb(env, `/collection/${d.belongs_to_collection.id}`, {}, lang);
    extras[0] = sagaFollow(col.parts || [], d, today);
    saga = (col.parts || []).filter((p) => p.release_date && p.release_date <= today)
      .sort((a, b) => a.release_date.localeCompare(b.release_date));
    if (saga.length >= 2) extras.push(await sagaTime(env, saga, d, lang));
  }

  if (!movie) {
    // Épisodes : les saisons sont ajoutées par lots de 20 à un seul appel TMDB.
    const base = imdb || `tmdb:${tmdbId}`;
    const numbers = (d.seasons || []).map((s) => s.season_number).filter((n) => Number.isInteger(n));
    const batches = [];
    for (let i = 0; i < numbers.length; i += 20) batches.push(numbers.slice(i, i + 20));
    const anime = d.original_language === "ja" && (d.genres || []).some((g) => g.id === 16) && (d.number_of_episodes || 0) >= 40;
    const [parts, fillers] = await Promise.all([
      Promise.all(batches.slice(0, 10).map((b) =>
        tmdb(env, `/tv/${tmdbId}`, { append_to_response: b.map((n) => `season/${n}`).join(",") }, lang))),
      anime ? fillerEpisodes(d).catch(() => null) : null,
    ]);
    const videos = [];
    for (const part of parts) {
      for (const n of numbers) {
        const s = part[`season/${n}`];
        if (!s || !s.episodes) continue;
        const best = n > 0 ? bestEpisodes(s.episodes, today) : new Set();
        for (const e of s.episodes) {
          const title = `${best.has(e.episode_number) ? "⭐ " : ""}${e.name || `Épisode ${e.episode_number}`}`;
          videos.push({
            id: `${base}:${n}:${e.episode_number}`,
            title,
            name: title,
            season: n,
            episode: e.episode_number,
            number: e.episode_number,
            released: e.air_date ? `${e.air_date}T00:00:00.000Z` : undefined,
            overview: e.overview || undefined,
            thumbnail: e.still_path ? `${IMG}w500${e.still_path}` : undefined,
            runtime: e.runtime ? `${e.runtime} min` : undefined,
            _minutes: e.runtime || 0,
            _aired: !!e.air_date && e.air_date <= today,
          });
        }
      }
    }
    videos.sort((a, b) => a.season - b.season || a.episode - b.episode);
    // Anime : épisodes de remplissage, comptés à la suite d'une saison à l'autre (hors spéciaux).
    if (fillers && fillers.size) {
      let k = 0;
      for (const v of videos) {
        if (v.season > 0 && fillers.has(++k)) v.title = v.name = `${v.title} (remplissage)`;
      }
    }
    extras.push(seriesTime(videos, d));
    m.videos = videos.map(({ _minutes, _aired, ...v }) => v);
  }

  let recapLine = "";
  const prev = previousWork(d, movie, saga, m.videos);
  const [recap, profile, renewal] = await Promise.all([ask(prev && aiRecap(env, ctx, prev.id, prev.prompt)), profileJob, renewalJob]);
  // Pas encore prêt, ou Gemini indisponible : la fiche n'est pas gardée, pour l'avoir plus tard.
  if ([recap, profile, renewal].some((r) => r === "attente" || (r && r.error))) m._partial = true;
  if (renewal && renewal !== "attente" && renewal.status) extras[0] = renewalNote(renewal, follow.season);
  if (profile && profile !== "attente") {
    if (profile.pourQui) extras.push(`🎯 ${profile.pourQui}`);
    if (profile.aSavoir) extras.push(`⚠️ À savoir : ${profile.aSavoir}`);
  }
  if (recap && recap !== "attente" && recap.recap) recapLine = `🔁 ${prev.label}, attention ça raconte la fin : ${recap.recap}`;
  m.description = [m.description, extras.filter(Boolean).join("\n"), recapLine].filter(Boolean).join("\n\n") || undefined;
  if (vfJob) {
    const vf = await vfJob;
    // Pas encore trouvée : la fiche n'est pas gardée, la VF sera là à la prochaine ouverture.
    if (vf === "attente") m._partial = true;
    else if (vf && vf.key) {
      const vfItem = { source: vf.key, ytId: vf.key, type: "Trailer", name: vf.title, lang: "fr" };
      // VF pas en HD sur YouTube : la bande-annonce HD de TMDB reste en premier (celle du hero), la VF
      // juste après dans la liste de la fiche.
      const first = trailers[0] && ((d.videos && d.videos.results) || []).find((v) => v.key === trailers[0].source);
      m.trailers = vf.hd === false && first && first.size >= 720 ? [trailers[0], vfItem, ...trailers.slice(1)] : [vfItem, ...trailers];
      m.trailerStreams = m.trailers.map((t) => ({ ytId: t.ytId }));
    }
  }
  return m;
}

// Attente maximale des lignes écrites par l'IA (rappel, « pour qui », saison commandée) à la première
// ouverture d'une fiche. Gemini lent ou saturé (un modèle met 5 s à passer la main au suivant) : la fiche
// part sans elles et n'est pas gardée ; elles finissent d'arriver en cache (6 mois) pour l'ouverture suivante.
const FICHE_AI_WAIT_MS = 2000;

/** « 7 nov. », ou « 7 nov. 2027 » hors de l'année en cours. */
const dateFr = (iso, today) => `${shortDate(iso)}${iso.slice(0, 4) !== today.slice(0, 4) ? ` ${iso.slice(0, 4)}` : ""}`;
// Point final, sauf après un mois abrégé (« le 15 déc. », pas « le 15 déc.. »).
const dot = (text) => (text.endsWith(".") ? text : `${text}.`);

/**
 * Film d'une saga : le film suivant (sorti, daté ou seulement annoncé), ou « pas de suite annoncée »
 * pour le dernier. D'après la collection TMDB, où les suites annoncées figurent, datées ou non.
 */
function sagaFollow(parts, d, today) {
  const order = [...parts.filter((p) => p.release_date).sort((a, b) => a.release_date.localeCompare(b.release_date)),
    ...parts.filter((p) => !p.release_date)];
  const i = order.findIndex((p) => p.id === d.id);
  if (i < 0) return "";
  const next = order[i + 1];
  if (!next) return "🏁 Pas de suite annoncée pour l'instant.";
  const title = `« ${next.title || next.original_title} »`;
  if (!next.release_date) return `🔜 Une suite est annoncée : ${title}, pas encore de date.`;
  if (next.release_date > today) return dot(`🔜 La suite : ${title}, sortie prévue le ${dateFr(next.release_date, today)}`);
  return `➡️ La suite : ${title} (${next.release_date.slice(0, 4)}).`;
}

/**
 * Série : terminée, annulée, prochaine saison datée ou annoncée, ou pas encore terminée sans date.
 * Rien pendant une saison en cours (le prochain épisode est déjà en tête du résumé).
 */
function seriesFollow(d, today) {
  const say = (text) => ({ text });
  if (d.status === "Ended") return say("🏁 Série terminée : il n'y aura pas de suite.");
  if (d.status === "Canceled") return say("❌ Série annulée : il n'y aura pas de suite.");
  if (d.status !== "Returning Series") return null;
  const last = d.last_episode_to_air, next = d.next_episode_to_air;
  const lastSeason = last ? last.season_number : 0;
  if (next && next.season_number > lastSeason && next.air_date) return say(dot(`🔜 Saison ${next.season_number} : à partir du ${dateFr(next.air_date, today)}`));
  if (next) return null;
  const coming = (d.seasons || []).find((x) => x.season_number > lastSeason);
  if (coming) {
    return say(coming.air_date && coming.air_date > today
      ? dot(`🔜 Saison ${coming.season_number} : à partir du ${dateFr(coming.air_date, today)}`)
      : `🔜 Saison ${coming.season_number} annoncée, pas encore de date.`);
  }
  // TMDB ne sait pas si la saison suivante est commandée : les actualités trancheront (aiRenewal).
  return { text: `🔜 Pas encore terminée : aucune date pour la saison ${lastSeason + 1}.`, unsure: true, season: lastSeason + 1 };
}

// Nom du logiciel (et de son dépôt) pour Wikimedia : le même pour l'instance principale et les copies.
const WIKI_HEADERS = { "User-Agent": "CatalogueFR/1.0 (+https://github.com/xnzx07/nuvio-assets)" };
const WIKI_CACHE = { cacheTtl: 86400, cacheEverything: true };
// Phrases de l'article qui parlent de la suite : renouvellement, annulation, dernière saison.
const WIKI_NEWS = /renew|cancel|final season|last season|conclud|will end|ended|season (premiere|finale)|upcoming|in production|filming|ordered/i;

/**
 * Extraits de l'article Wikipédia anglais d'une série (mis à jour vite après chaque annonce) :
 * le début de l'article et les phrases sur la suite. Titre trouvé par l'identifiant Wikidata de TMDB.
 */
async function wikiNews(wikidataId) {
  if (!/^Q\d+$/.test(wikidataId || "")) return "";
  const wd = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataId}&props=sitelinks&sitefilter=enwiki&format=json`,
    { headers: WIKI_HEADERS, cf: WIKI_CACHE }).then((r) => (r.ok ? r.json() : null), () => null);
  const title = (((((wd || {}).entities || {})[wikidataId] || {}).sitelinks || {}).enwiki || {}).title;
  if (!title) return "";
  const wp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(title)}`,
    { headers: WIKI_HEADERS, cf: WIKI_CACHE }).then((r) => (r.ok ? r.json() : null), () => null);
  const page = Object.values(((wp || {}).query || {}).pages || {})[0] || {};
  const text = String(page.extract || "");
  if (!text) return "";
  const intro = text.split(/\n\s*\n/)[0].slice(0, 1500);
  const news = text.replace(/^=+.*=+$/gm, "").split(/(?<=[.!?])\s+/).filter((x) => WIKI_NEWS.test(x) && !intro.includes(x));
  return [intro, ...news].join("\n").slice(0, 5000);
}

/** Saison suivante commandée ou non, d'après Wikipédia lu par Gemini (null sans article). */
async function renewalOf(env, ctx, d, season, today) {
  const news = await wikiNews(d.external_ids && d.external_ids.wikidata_id);
  if (!news) return null;
  const last = d.last_episode_to_air;
  const prompt = [
    `Série : « ${d.name} » (titre original : ${d.original_name}, depuis ${(d.first_air_date || "").slice(0, 4)}).`,
    `Dernière saison diffusée : saison ${season - 1}${last && last.air_date ? `, dernier épisode le ${last.air_date}` : ""}. Question : qu'en est-il de la saison ${season} ? Date du jour : ${today}.`,
    `Extraits de Wikipédia :\n${news}`,
  ].join("\n");
  return aiRenewal(env, ctx, `tv-${d.id}-s${season}`, prompt);
}

/** Ligne « suite » d'après les actualités : commandée, annulée, terminée ou en attente. */
function renewalNote(r, season) {
  const more = r.detail ? ` : ${r.detail}` : "";
  if (r.status === "RENOUVELEE") return `🔜 Saison ${season} commandée${more}.`;
  if (r.status === "ANNULEE") return `❌ Série annulée : il n'y aura pas de saison ${season}.`;
  if (r.status === "TERMINEE") return "🏁 Série terminée : il n'y aura pas de suite.";
  return `⏸️ Saison ${season} pas encore commandée${more}.`;
}

/** Scène pendant ou après le générique, d'après les mots-clés TMDB. */
function creditsScene(keywords) {
  const during = keywords.includes("duringcreditsstinger"), after = keywords.includes("aftercreditsstinger");
  if (during && after) return "🎬 Reste jusqu'au bout : il y a des scènes pendant et après le générique.";
  if (after) return "🎬 Reste après le générique : il y a une scène.";
  if (during) return "🎬 Il y a une scène pendant le générique.";
  return "";
}

// Œuvre adaptée (mots-clés TMDB) et métiers TMDB de son auteur.
const SOURCES = [
  [/based on (novel or book|young adult novel)/, "du roman"], [/based on short story/, "de la nouvelle"],
  [/based on manga/, "du manga"], [/based on (comic|graphic novel)/, "de la bande dessinée"],
  [/based on video game/, "du jeu vidéo"], [/based on play or musical/, "de la pièce"],
];
const AUTHOR_JOBS = new Set(["Novel", "Book", "Author", "Short Story", "Comic Book", "Graphic Novel"]);
const de = (name) => (/^[aeiouyhâàéèêîïôûAEIOUYHÂÀÉÈÊÎÏÔÛ]/.test(name) ? `d'${name}` : `de ${name}`);

/** « Adapté du roman de Stephen King », « Tiré d'une histoire vraie »… */
function sourceNote(keywords, crew) {
  const kw = keywords.join("|");
  const src = SOURCES.find(([re]) => re.test(kw));
  const real = /based on (true story|real events|memoir or autobiography)|biography/.test(kw);
  // L'auteur : le plus connu de la liste (TMDB y range aussi les traducteurs : The Witcher donnait
  // « David French et Danusia Stok » au lieu d'Andrzej Sapkowski), en alphabet latin seulement
  // (TMDB n'a parfois que « 岸本斉史 » pour Masashi Kishimoto).
  const authors = crew.filter((c) => AUTHOR_JOBS.has(c.job) && /^[A-Za-zÀ-ÿ]/.test(c.name || ""))
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 1).map((c) => c.name);
  const parts = [];
  if (src) parts.push(`Adapté ${src[1]}${authors.length ? ` ${de(authors.join(" et "))}` : ""}`);
  if (real) parts.push(parts.length ? "tiré d'une histoire vraie" : "Tiré d'une histoire vraie");
  return parts.length ? `📖 ${parts.join(", ")}.` : "";
}

const duration = (min) => (min >= 600 ? `${Math.round(min / 60)} h`
  : `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, "0")}` : ""}`);

/** « Tout voir : 62 h (5 saisons, 50 épisodes) », d'après les épisodes déjà sortis. */
function seriesTime(videos, d) {
  const aired = videos.filter((v) => v.season > 0 && v._aired);
  if (aired.length < 2) return "";
  const usual = (d.episode_run_time || [])[0] || 0;
  const minutes = aired.reduce((t, v) => t + (v._minutes || usual), 0);
  if (!minutes) return "";
  const seasons = new Set(aired.map((v) => v.season)).size;
  return `⏳ Tout voir : ${duration(minutes)} (${seasons} saison${seasons > 1 ? "s" : ""}, ${aired.length} épisodes).`;
}

/** « La saga entière : 21 h (8 films) », films déjà sortis (une fiche TMDB par film, en cache). */
async function sagaTime(env, saga, d, lang) {
  if (saga.length > 12) return "";
  const runtimes = await Promise.all(saga.map((p) => (p.id === d.id ? d.runtime
    : tmdb(env, `/movie/${p.id}`, {}, lang).then((x) => x.runtime))));
  if (runtimes.some((r) => !r)) return "";
  return `⏳ La saga entière : ${duration(runtimes.reduce((t, r) => t + r, 0))} (${saga.length} films).`;
}

/** Les 3 épisodes les mieux notés d'une saison (au moins 6 épisodes sortis et notés), pour l'étoile. */
function bestEpisodes(episodes, today) {
  const rated = episodes.filter((e) => e.air_date && e.air_date <= today && (e.vote_count || 0) >= 5);
  if (rated.length < 6) return new Set();
  return new Set([...rated].sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count)
    .slice(0, 3).map((e) => e.episode_number));
}

/** Numéros des épisodes de remplissage d'un anime (numérotation continue), d'après animefillerlist.com. */
async function fillerEpisodes(d) {
  const slugs = [...new Set([d.name, d.original_name].map((n) => norm(n).replace(/ /g, "-")).filter(Boolean))];
  for (const slug of slugs) {
    const html = await fetch(`https://www.animefillerlist.com/shows/${slug}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CatalogueFR)" },
      cf: { cacheTtl: 7 * 86400, cacheEverything: true },
    }).then((r) => (r.ok ? r.text() : ""), () => "");
    const m = /<div class="filler">([\s\S]*?)<\/div>/.exec(html);
    if (!m) continue;
    const out = new Set();
    for (const [, a, b] of m[1].replace(/<[^>]+>/g, " ").matchAll(/(\d+)(?:\s*-\s*(\d+))?/g)) {
      for (let k = Number(a); k <= Number(b || a) && out.size < 5000; k++) out.add(k);
    }
    return out;
  }
  return null;
}

/** Ce que Gemini sait de l'œuvre pour « pour qui » et « à savoir ». */
function profilePrompt(d, movie, keywords, cert) {
  return [
    `${movie ? "Film" : "Série"} : « ${d.title || d.name} » (titre original : ${d.original_title || d.original_name}, ${(d.release_date || d.first_air_date || "").slice(0, 4)}).`,
    `Genres : ${(d.genres || []).map((g) => g.name).join(", ") || "?"}.`,
    cert ? `Classification en France : ${cert}.` : "",
    keywords.length ? `Mots-clés : ${keywords.slice(0, 20).join(", ")}.` : "",
    `Résumé : ${d.overview || "?"}`,
  ].filter(Boolean).join("\n");
}

/**
 * L'œuvre à rappeler avant celle-ci → { id, label, prompt }, ou null :
 *   - film d'une saga : le film précédent de la saga (assez connu pour que Gemini le connaisse) ;
 *   - série : la saison d'avant la saison en cours (ou d'avant celle qui va commencer), racontée
 *     d'après les résumés de ses épisodes (rien d'inventé).
 */
function previousWork(d, movie, saga, videos) {
  if (movie) {
    const i = (saga || []).findIndex((p) => p.id === d.id);
    const p = i > 0 ? saga[i - 1] : null;
    if (!p || (p.vote_count || 0) < 300) return null;
    const year = p.release_date.slice(0, 4);
    return {
      id: `movie-${p.id}`,
      label: `Rappel de « ${p.title} » (${year})`,
      prompt: `Film à raconter : « ${p.title} » (titre original : ${p.original_title}, ${year}).\nSynopsis : ${p.overview || "?"}\nLa suite qu'on va regarder : « ${d.title} ».`,
    };
  }
  const next = d.next_episode_to_air, last = d.last_episode_to_air;
  const current = next && next.episode_number === 1 ? next.season_number : last && last.season_number;
  if (!current || current < 2) return null;
  const season = current - 1;
  const eps = (videos || []).filter((v) => v.season === season && v.overview);
  // Sans résumés d'épisodes, seulement une série assez connue pour que Gemini la connaisse.
  if (eps.length < 2 && (d.vote_count || 0) < 300) return null;
  const clean = (t) => t.replace(/^⭐ /, "").replace(/ \(remplissage\)$/, "");
  return {
    id: `tv-${d.id}-s${season}`,
    label: `Rappel de la saison ${season}`,
    prompt: [`Série : « ${d.name} » (titre original : ${d.original_name}), saison ${season} à raconter.`,
      eps.length >= 2 ? `Résumés des épisodes :\n${eps.map((e) => `${e.episode}. ${clean(e.title)} : ${e.overview}`).join("\n")}` : ""]
      .filter(Boolean).join("\n").slice(0, 12000),
  };
}

/** Ce que Gemini lit d'un titre pour son « pour qui » de rangée (fiche TMDB : genres en objets ; liste : genre_ids). */
const profileText = (series, it) => [
  `${series ? "Série" : "Film"} : « ${it.title || it.name} » (titre original : ${it.original_title || it.original_name}, ${(it.release_date || it.first_air_date || "").slice(0, 4)}).`,
  `Genres : ${(it.genre_ids || (it.genres || []).map((g) => g.id)).map((g) => GENRE_NAMES[g]).filter(Boolean).join(", ") || "?"}.`,
  `Résumé : ${(it.overview || "?").slice(0, 600)}`,
].join("\n");

/**
 * Prépare en arrière-plan le « pour qui » et le « à savoir » des titres d'une page, en une seule
 * question à Gemini : le hero de Nuvio, qui charge la fiche de chaque titre survolé, les trouve prêts.
 * Passe par un appel de l'addon à lui-même (liaison SELF de wrangler.toml), qui a son propre budget
 * d'appels : une page de rangée en utilise déjà une vingtaine sur les 50 permis.
 */
function prefetchProfiles(env, ctx, results, kind) {
  if (!env.GEMINI_API_KEY || !env.SELF || !ctx || !results || !results.length) return;
  // Seulement les identifiants : l'appel relit lui-même chaque titre dans TMDB (un texte venu de la
  // requête irait tel quel à Gemini, et sa réponse, en cache, serait lue par tout le monde).
  const items = results.slice(0, 20).map((it) => ({ key: `${kind === "series" ? "tv" : "movie"}-${it.id}`, id: it.id }));
  ctx.waitUntil((async () => {
    const headers = { "Content-Type": "application/json", "x-prefetch": await sha(env.GEMINI_API_KEY) };
    await env.SELF.fetch("https://self/prefetch/profiles", { method: "POST", headers, body: JSON.stringify({ key: env.GEMINI_API_KEY, items }) });
  })().catch(() => {}));
}

// ---------- HTTP ----------
const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

/**
 * Bande-annonce YouTube d'un titre (pour l'aperçu de la page de personnalisation) :
 * en français si elle existe, sinon en version originale. L'identifiant peut être IMDb
 * (films) ou « tmdb:<id> » (séries et films sans IMDb).
 */
async function trailer(env, kind, id) {
  let tmdbId = id.startsWith("tmdb:") ? id.slice(5) : null;
  if (!tmdbId && /^tt\d+$/.test(id)) {
    const found = await tmdb(env, `/find/${id}`, { external_source: "imdb_id" });
    const hit = (kind === "series" ? found.tv_results : found.movie_results) || [];
    tmdbId = hit[0] ? String(hit[0].id) : null;
  }
  if (!tmdbId || !/^\d+$/.test(tmdbId)) return { key: null };
  const path = `/${kind === "series" ? "tv" : "movie"}/${tmdbId}/videos`;
  const pick = (r) => (r.results || [])
    .filter((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
    .sort((a, b) => isVf(b.iso_639_1, b.name) - isVf(a.iso_639_1, a.name) || (b.size >= 1080) - (a.size >= 1080)
      || (b.type === "Trailer") - (a.type === "Trailer") || (b.official === true) - (a.official === true))[0];
  const fr = pick(await tmdb(env, path, {}, "fr-FR"));
  if (fr && isVf(fr.iso_639_1, fr.name)) return { key: fr.key, lang: fr.iso_639_1 };
  // Pas de VF sur TMDB : Allociné + YouTube, sinon la VOSTFR, sinon la VO.
  const d = await tmdb(env, `/${kind === "series" ? "tv" : "movie"}/${tmdbId}`, { append_to_response: "external_ids" });
  const imdb = (d.imdb_id || (d.external_ids && d.external_ids.imdb_id)) || null;
  const vf = imdb ? await vfTrailer(kind, imdb, (d.title || d.name || "").trim(), (d.release_date || d.first_air_date || "").slice(0, 4)).catch(() => null) : null;
  if (vf && vf.key) return { key: vf.key, lang: "fr" };
  if (fr) return { key: fr.key, lang: fr.iso_639_1 };
  const v = pick(await tmdb(env, path, {}, "en-US"));
  return { key: v ? v.key : null, lang: v ? v.iso_639_1 : null };
}

function json(data, maxAge) {
  return new Response(JSON.stringify(data), {
    headers: { ...HEADERS, "Cache-Control": `public, max-age=${maxAge}` },
  });
}

const RESERVED = new Set(["manifest.json", "catalog", "configure", "collections.json", "guide", "tv", "trailer", "lien", "meta", "logo.png", "debug", "affiche", "prefetch", "dossier", "hote", "statique", "copie"]);

async function loadCollections() {
  const res = await fetch(`${ASSETS}/collections/collections.json`, { cf: { cacheTtl: 600, cacheEverything: true } });
  return res.ok ? res.json() : [];
}

/** Applique pays et filtres globaux aux sources TMDB « discover » d'une tuile. */
function filterSource(src, cfg) {
  if (src.provider !== "tmdb" || src.tmdbSourceType !== "DISCOVER") return src;
  const f = { ...(src.filters || {}) };
  const col = src.mediaType === "TV" ? 2 : 1;
  const excluded = new Set(String(f.withoutGenres || "").split(/[|,]/).filter(Boolean));
  for (const name of cfg.e) { const g = GENRES.find(([n]) => n === name); if (g && g[col]) excluded.add(String(g[col])); }
  if (cfg.f) (col === 2 ? ["80", "10768"] : ["27", "53"]).forEach((g) => excluded.add(g));
  if (excluded.size) f.withoutGenres = [...excluded].join("|");
  if (f.watchRegion) f.watchRegion = cfg.g;
  if (cfg.m) f.voteAverageGte = Math.max(Number(f.voteAverageGte) || 0, cfg.m);
  if (cfg.a) f.releaseDateGte = maxDate(f.releaseDateGte, `${cfg.a}-01-01`);
  return { ...src, filters: f };
}

/**
 * Ordre d'affichage des tuiles. Les tuiles masquées sont repérées par leur position dans le
 * fichier : une nouvelle tuile y est donc ajoutée en fin de collection (Crunchyroll),
 * et placée ici. Les tuiles absentes de la liste gardent l'ordre du fichier, à la fin.
 */
const PLATFORM_ORDER = [
  "netflix", "prime-video", "paramount-plus", "disney-plus", "hbo-max", "apple-tv-plus", "canal-plus",
  "warner-bros", "crunchyroll", "marvel-studios", "dc-comics",
];
function displayOrder(c, folders) {
  if (c.id !== "plateformes-streaming") return folders;
  const rank = (f) => { const i = PLATFORM_ORDER.indexOf(f.id); return i < 0 ? PLATFORM_ORDER.length : i; };
  return [...folders].sort((a, b) => rank(a) - rank(b));
}

/** Collections Nuvio filtrées : collections, plateformes et tuiles choisies, filtres appliqués. */
async function collections(cfg) {
  const all = await loadCollections();
  const chosenFolders = new Set(PROVIDERS.filter((p) => cfg.p.includes(p.id)).map((p) => p.folder));
  const platformFolders = new Set(PROVIDERS.map((p) => p.folder).filter(Boolean));
  const filtered = hasGlobalFilters(cfg) || cfg.g !== "FR";
  return all
    .filter((c) => cfg.c.includes(c.id))
    .map((c) => {
      const hidden = new Set(cfg.t[c.id] || []);
      const folders = displayOrder(c, c.folders)
        .filter((f) => !hidden.has(c.folders.indexOf(f)))
        .filter((f) => c.id !== "plateformes-streaming" || !platformFolders.has(f.id) || chosenFolders.has(f.id))
        .map((f) => (filtered && f.sources ? { ...f, sources: f.sources.map((src) => filterSource(src, cfg)) } : f));
      return { ...c, folders };
    })
    .filter((c) => c.folders.length);
}

async function sha(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function html(body) {
  return new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}

/**
 * En-têtes de sécurité ajoutés à toutes les réponses : pas de devinette du type de fichier, l'adresse
 * complète (qui contient parfois une clé Gemini) jamais envoyée aux autres sites, et les pages du site
 * jamais affichées dans le cadre d'un autre site.
 */
function withSecurity(res) {
  const out = new Response(res.body, res);
  out.headers.set("X-Content-Type-Options", "nosniff");
  out.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if ((out.headers.get("Content-Type") || "").startsWith("text/html")) {
    out.headers.set("Content-Security-Policy", "frame-ancestors 'self'; object-src 'none'; base-uri 'self'");
    out.headers.set("X-Frame-Options", "SAMEORIGIN");
  }
  return out;
}
// Adresse du site telle que le visiteur l'a tapée (sur Docker, l'en-tête Host vient de lui) : un nom,
// une adresse IP et un port, rien d'autre, puisqu'elle est recopiée dans les pages.
const SAFE_HOST = /^([a-z0-9-]+(\.[a-z0-9-]+)*|\[[0-9a-f:.]+\])(:\d{1,5})?$/i;

export default {
  async fetch(request, env, ctx) {
    if (!SAFE_HOST.test(new URL(request.url).host)) return withSecurity(new Response("Adresse invalide", { status: 400 }));
    return withSecurity(await app.fetch(request, env, ctx));
  },
};

// Le site et l'addon (sans les en-têtes de sécurité, ajoutés ci-dessus).
const app = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: HEADERS });
    const url = new URL(request.url);
    // Chemin brut (encodé) : on découpe « genre=…&skip=… » AVANT de décoder,
    // sinon un filtre comme « Action & Aventure » serait coupé en deux.
    let path = url.pathname.replace(/\/+$/, "");
    const today = parisToday();
    const rows = allRows(today, null);

    // Premier segment = config personnalisée, s'il n'est pas un mot réservé.
    let cfgSeg = "";
    const first = path.split("/")[1] || "";
    if (first && !RESERVED.has(first)) { cfgSeg = first; path = path.slice(first.length + 1); }
    const cfg = decodeConfig(cfgSeg, rows, DEFS.discover);
    if (!cfg) return json({ error: "Configuration illisible : refais ton lien sur la page de personnalisation." }, 60);
    // Espace hébergeur des copies (/hote/…) : n'existe pas sur l'instance principale.
    if (path === "/hote" || path.startsWith("/hote/")) {
      if (isCopy(url)) return hostRoute(request, env, url, path, VERSION);
      return new Response(JSON.stringify({ error: "introuvable" }), { status: 404, headers: { ...HEADERS, "Cache-Control": "no-store" } });
    }

    // La racine ouvre la salle 1 (le guide) ; la programmation (salle 2) est sur /configure,
    // et aussi sur /<config>/ pour les anciens liens personnalisés.
    if (path === "/configure" || (path === "" && cfgSeg)) {
      const files = await loadCollections().catch(() => []);
      // Même ordre de référence que config.js (positions dans les liens), avec la position
      // réelle dans le fichier pour l'affichage.
      const cols = COLLECTIONS.map((c) => ({
        ...c, pos: files.findIndex((f) => f.id === c.id),
        folders: displayOrder(c, ((files.find((f) => f.id === c.id) || {}).folders || []).map((f, i) => ({ id: f.id, title: f.title, cover: f.coverImageUrl || "", i }))),
      }));
      return html(configurePage({
        origin: url.origin, cfg, rows, discover: DEFS.discover, providers: PROVIDERS, collections: cols,
        defaults: defaults(rows, DEFS.discover), regions: REGIONS, genres: GENRES, languages: LANGUAGES,
        sorts: SORTS, seasons: SEASON_KEYS, maxCustom: MAX_CUSTOM, season: decorSaison(url, today), copy: isCopy(url),
      }));
    }
    if (path === "") return html(hallPage({ origin: url.origin, season: decorSaison(url, today), copy: isCopy(url) }));   // le hall : choisir sa salle
    if (path === "/guide") return html(guidePage({ origin: url.origin, season: decorSaison(url, today) }));
    if (path === "/lien") return html(lienPage({ origin: url.origin }));   // ouvert par les QR codes du guide
    if (path === "/copie") return html(copiePage({ origin: url.origin }));   // « Monte ta propre salle » : héberger sa copie
    if (path === "/tv") return Response.redirect(NUVIO_TV_APK, 302);   // adresse courte pour Downloader : télécharge l'APK
    // Styles et scripts communs aux pages du site, gardés en cache par le navigateur (voir statique.js).
    if (path.startsWith("/statique/")) return statique(path.slice(10), url.searchParams.get("v")) || new Response("introuvable", { status: 404 });
    if (path === "/manifest.json") return json(manifest(today, cfg, cfgSeg, url, await hasAlerts(env, url, cfg)), CACHE_CLIENT_S);
    if (path === "/collections.json") return json(await collections(cfg), CACHE_CLIENT_S);
    if (path === "/logo.png") {   // le logo servi par le site, sans l'adresse du dépôt dans les pages
      const r = await fetch(`${ASSETS}/logo/addon.png`, { cf: { cacheTtl: 86400, cacheEverything: true } });
      return new Response(r.body, { status: r.status, headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
    }
    if (!env.TMDB_API_KEY) return json({ error: "Secret TMDB_API_KEY manquant" }, 0);
    // Diagnostics (/debug) : ils dépensent la clé Gemini de l'instance, donc réservés à l'hébergeur,
    // depuis son propre lien (celui qui contient cette clé) : /<config>/debug/…
    if (path.startsWith("/debug/") && !(env.GEMINI_API_KEY && cfg.k && same(cfg.k, env.GEMINI_API_KEY))) {
      return new Response(JSON.stringify({ error: "Réservé à l'hébergeur : ouvre /debug depuis ton lien d'addon (celui qui contient la clé Gemini de l'instance)." }),
        { status: 403, headers: { ...HEADERS, "Cache-Control": "no-store" } });
    }
    // Détail d'une recherche (formes essayées, correction, classement) : /debug/search/<movie|series>/<requête>
    // ?model=gemini-… pour essayer un autre modèle, ?thinking=low… pour un autre niveau de réflexion,
    // ?fresh=1 pour reposer la question à Gemini.
    const dbg = path.match(/^\/debug\/search\/(movie|series)\/(.+)$/);
    if (dbg) {
      const trace = {};
      const out = await runSearch(env, dbg[1], decodeURIComponent(dbg[2]), 1, {
        ctx, lang: langOf(cfg), region: cfg.g, aiModel: url.searchParams.get("model") || undefined, aiFresh: url.searchParams.has("fresh"),
        aiThinking: url.searchParams.get("thinking") || undefined,
      }, trace);
      trace.final = out.map((it) => `${it.title || it.name} (${(it.release_date || it.first_air_date || "").slice(0, 4)})`);
      return json(trace, 0);
    }
    // Saison suivante d'une série d'après les actualités (réponse de Gemini, erreurs) : /debug/renewal/<id TMDB>
    const dr = path.match(/^\/debug\/renewal\/(\d+)$/);
    if (dr && env.GEMINI_API_KEY) {
      const d = await tmdb(env, `/tv/${dr[1]}`, {}, langOf(cfg));
      const follow = d && d.id ? seriesFollow(d, today) : null;
      if (!follow || !follow.unsure) return json({ tmdb: follow && follow.text }, 0);
      d.external_ids = await tmdb(env, `/tv/${dr[1]}/external_ids`);
      const r = (await renewalOf(env, ctx, d, follow.season, today)) || { error: "pas d'article Wikipédia" };
      return json({ wikipedia: await wikiNews(d.external_ids.wikidata_id), ...r, note: r.status ? renewalNote(r, follow.season) : follow.text }, 0);
    }
    // Affiche PostersPlus de l'aperçu (réglage conseillé de l'étape 8) avec la clé TMDB du worker :
    // le visiteur voit les affiches qu'il aura à la fin sans coller la sienne. /affiche/<type>/<poster|landscape>/<id>
    const af = path.match(/^\/affiche\/(movie|series)\/(poster|landscape)\/(tt\d{1,10}|tmdb%3A\d{1,10}|tmdb:\d{1,10})$/);
    if (af) {
      const id = decodeURIComponent(af[3]), imdb = url.searchParams.get("imdb") || "";
      const vals = { "{tmdb_id?}": id.startsWith("tmdb:") ? id.slice(5) : "", "{imdb_id?}": /^tt\d{1,10}$/.test(imdb) ? imdb : (id.startsWith("tt") ? id : ""), "{id}": id, "{type}": af[1], "{shape}": af[2] };
      let src = POSTER_URL.replace("TA_CLE_TMDB", encodeURIComponent(env.TMDB_API_KEY));
      for (const [k, v] of Object.entries(vals)) src = src.split(k).join(encodeURIComponent(v));
      const key = new Request(`https://cache.local/affiche/${af[1]}/${af[2]}/${id}?imdb=${vals["{imdb_id?}"]}`);
      const hitA = await caches.default.match(key);
      if (hitA) return hitA;
      const r = await fetch(src, { cf: { cacheTtl: 7 * 86400, cacheEverything: true } }).catch(() => null);
      if (!r || !r.ok || !/^image\//.test(r.headers.get("Content-Type") || "")) return new Response(null, { status: 404, headers: { ...HEADERS, "Cache-Control": "public, max-age=3600" } });
      const out = new Response(r.body, { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": r.headers.get("Content-Type"), "Cache-Control": "public, max-age=604800" } });
      ctx.waitUntil(caches.default.put(key, out.clone()));
      return out;
    }
    // Préparation des « pour qui » d'une page (appel de l'addon à lui-même, voir prefetchProfiles).
    // La clé Gemini (celle du lien de l'utilisateur) arrive avec l'appel, son empreinte en en-tête :
    // un appel venu d'ailleurs ne peut dépenser que le quota d'une clé qu'il possède déjà.
    if (path === "/prefetch/profiles" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const key = typeof body.key === "string" ? body.key : "";
      if (!key || request.headers.get("x-prefetch") !== await sha(key)) return json({ error: "interdit" }, 0);
      // Le texte de chaque titre vient de TMDB, jamais de la requête (lu seulement s'il manque au cache).
      const items = (Array.isArray(body.items) ? body.items : [])
        .filter((it) => it && Number.isInteger(it.id) && it.id > 0 && it.key === `${String(it.key).startsWith("tv-") ? "tv" : "movie"}-${it.id}`)
        .slice(0, 20)
        .map((it) => {
          const series = it.key.startsWith("tv-");
          return { key: it.key, id: it.id, text: async () => { const d = await tmdb(env, `/${series ? "tv" : "movie"}/${it.id}`); return d && d.id === it.id ? profileText(series, d) : ""; } };
        });
      return json(await aiProfiles({ ...env, GEMINI_API_KEY: key }, items), 0);
    }
    // IA : clé du lien de l'utilisateur (les /debug au-dessus gardent celle de l'instance).
    env = aiEnv(env, cfg);
    // Une tuile de collection ouverte dans l'aperçu du site : /dossier/<collection>/<tuile>/<n° de source>.json?page=1
    // (mêmes filtres que le collections.json de ce lien : pays, genres exclus, note…).
    const dm = path.match(/^\/dossier\/([\w-]{1,60})\/([\w-]{1,60})\/(\d{1,2})\.json$/);
    if (dm) {
      const page = Math.min(Math.max(parseInt(url.searchParams.get("page"), 10) || 1, 1), 20);
      const col = (await collections(cfg)).find((c) => c.id === dm[1]);
      const folder = col && col.folders.find((f) => f.id === dm[2]);
      const src = folder && (folder.sources || [])[Number(dm[3])];
      if (!src || src.provider !== "tmdb") return json({ metas: [], hasMore: false, error: "introuvable" }, 600);
      return json(await dossierSource(env, src, langOf(cfg), page), 6 * 3600);
    }
    const tm = path.match(/^\/trailer\/(movie|series)\/([^/]+)\.json$/);
    if (tm) return json(await trailer(env, tm[1], decodeURIComponent(tm[2])), 7 * 86400);

    const mm = path.match(/^\/meta\/(movie|series)\/([^/]+)\.json$/);
    // Fiche « Version X disponible » de la rangée « Mise à jour » (lien de l'hébergeur d'une copie).
    if (mm && /^maj(:|%3A)/i.test(mm[2])) {
      const info = (await hasAlerts(env, url, cfg)) ? await updateInfo(VERSION) : null;
      return new Response(JSON.stringify({ meta: info ? updateCard(info, env, url.origin) : null }), { headers: { ...HEADERS, "Cache-Control": "no-store" } });
    }
    if (mm) {
      const fullKey = `https://cache.local/${VERSION}/${today}/meta/${mm[1]}/${mm[2]}?l=${langOf(cfg)}&g=${cfg.g}&ai=${env.GEMINI_API_KEY ? 1 : 0}`;
      // ?leger=1 : l'aperçu du site au survol. La fiche complète si elle est déjà prête, sinon une fiche sans IA.
      const leger = url.searchParams.get("leger") === "1";
      const metaKey = new Request(leger ? `${fullKey}&leger=1` : fullKey);
      const hitMeta = (leger && await caches.default.match(new Request(fullKey))) || await caches.default.match(metaKey);
      if (hitMeta) return new Response(hitMeta.body, { headers: { ...HEADERS, "Cache-Control": `public, max-age=${CACHE_META_CLIENT_S}` } });
      let found = null;
      try { found = await meta(env, mm[1], decodeURIComponent(mm[2]), cfg, today, ctx, { leger }); } catch (e) { return json({ meta: null, error: String(e) }, 60); }
      if (!found) return json({ meta: null }, 600);
      // Rappel encore en préparation : fiche pas gardée, pour l'avoir à la prochaine ouverture.
      const { _partial, ...metaOut } = found;
      if (_partial) return json({ meta: metaOut }, 60);
      ctx.waitUntil(caches.default.put(metaKey, json({ meta: metaOut }, CACHE_META_S)));
      return json({ meta: metaOut }, CACHE_META_CLIENT_S);
    }

    const m = path.match(/^\/catalog\/(movie|series)\/([^/]+?)(?:\/(.+))?\.json$/);
    if (!m) return json({ error: "introuvable" }, 60);
    const [, type, rawId, extraSeg] = m;
    const id = decodeURIComponent(rawId);
    // Rangée « Mise à jour » : jamais en cache (« Plus tard » doit la vider tout de suite).
    if (type === "movie" && id === "mise-a-jour") {
      const info = (await hasAlerts(env, url, cfg)) ? await pendingUpdate(env, VERSION) : null;
      return new Response(JSON.stringify({ metas: info ? [updateCard(info, env, url.origin)] : [] }), { headers: { ...HEADERS, "Cache-Control": "no-store" } });
    }

    // Cache de la réponse complète (une page de catalogue) pendant quelques heures.
    // La clé ne dépend que de ce qui change le contenu (pas du nom ni de l'ordre choisis).
    // Une recherche faite sans clé Gemini (sans IA) n'est pas resservie à qui en a une, et inversement.
    const extra = parseExtra(extraSeg);
    const aiTag = extra.search ? `&ai=${env.GEMINI_API_KEY ? 1 : 0}` : "";
    const cacheKey = new Request(`https://cache.local/${VERSION}/${today}${path}?k=${await sha(contentKey(cfg))}${aiTag}`);
    const hit = await caches.default.match(cacheKey);
    if (hit) return new Response(hit.body, { headers: { ...HEADERS, "Cache-Control": `public, max-age=${CACHE_CLIENT_S}` } });

    let metas = [];
    try {
      metas = await catalog(env, ctx, type, id, extra, today, cfg);
    } catch (e) {
      return json({ metas: [], error: String(e) }, 60);
    }
    // Copie gardée côté Cloudflare quelques heures ; Nuvio, lui, ne garde la réponse
    // que 5 minutes (son cache disque respecte max-age), pour voir vite les changements.
    if (metas.length && !metas.partial) ctx.waitUntil(caches.default.put(cacheKey, json({ metas }, CACHE_CATALOG_S)));
    return json({ metas }, metas.partial ? 0 : CACHE_CLIENT_S);
  },
};
