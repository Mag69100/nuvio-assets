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
 * Secret requis : TMDB_API_KEY (clé API TMDB v3). Facultatif : GEMINI_API_KEY (recherche par IA, voir ai.js).
 *   /meta/<type>/<id>.json      fiche détaillée (résumé, casting, saisons, épisodes) en français
 */
import DEFS from "../catalogs.json";
import {
  PROVIDERS, COLLECTIONS, REGIONS, GENRES, LANGUAGES, SORTS, SEASON_KEYS, MAX_CUSTOM,
  decodeConfig, defaults, langOf, contentKey, hasGlobalFilters,
} from "./config.js";
import { configurePage } from "./page.js";
import { guidePage, NUVIO_TV_APK } from "./guide.js";
import { lienPage } from "./lien.js";
import { hallPage } from "./hall.js";
import { smartSearch, prepareWords, isExact, norm } from "./search.js";
import { imdbRating } from "./ratings.js";
import { looksDescriptive, aiTitles, resolveTitles, aiRecap, aiProfile, AI_WAIT_MS } from "./ai.js";

const ADDON_ID = "com.xnzx07.catalogue-fr";
const VERSION = "5.16.4";
const PAGE = 20;                    // taille d'une page TMDB = taille d'une page de l'addon
const AI_MAX = 20;                  // 1re page d'une recherche par IA (sagas entières comprises)
// Cloudflare (offre gratuite) : 50 appels sortants au plus par requête, sinon tout échoue. Une
// recherche en garde 20 pour les fiches (un appel par titre affiché), quelques-uns pour le cache et
// Gemini, et SEARCH_BUDGET pour chercher dans TMDB : au-delà, ses appels renvoient vide.
const SEARCH_BUDGET = 22;
const ASSETS = "https://raw.githubusercontent.com/xnzx07/nuvio-assets/main";
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

function manifest(today, cfg, cfgSeg) {
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
    id: ADDON_ID,
    version: VERSION,
    name: cfg.n,
    description: "Rangées d'accueil, Découvrir et saison en cours, en français, en direct depuis TMDB.",
    logo: `${ASSETS}/logo/addon.png`,
    resources: ["catalog", { name: "meta", types: ["movie", "series"], idPrefixes: ["tt", "tmdb:"] }],
    types: ["movie", "series"],
    idPrefixes: ["tt", "tmdb:"],
    // Recherche : deux catalogues « Films » et « Séries » (titres en français), à la place
    // des « TMDB Search » de Discover Plus dont le nom ne se change pas.
    catalogs: [...discover, ...home, ...SEARCH.map((c) => ({
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
    api_key: env.TMDB_API_KEY, language: "fr-FR", include_image_language: "fr,en,null",
    append_to_response: movie ? "release_dates,images" : "external_ids,images",
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
    episode: movie ? null : { next: j.next_episode_to_air, last: j.last_episode_to_air },
    logo: logo ? `${IMG}w500${logo.file_path.replace(/\.svg$/, ".png")}` : undefined,
    backdrop: backdrop ? backdrop.file_path : null,
  };
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const shortDate = (iso) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const dayName = (iso) => DAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];

/**
 * Épisode d'une série en cours à signaler : sorti ces 3 derniers jours (regardable), sinon prévu
 * dans les 7 prochains. « Nouvel épisode sorti mardi 21 oct. (S2 É4) », « Nouvel épisode jeudi
 * 23 oct. (S2 É5) », « Saison 3 : 1er épisode vendredi 7 nov. ». ep = { next, last } de TMDB.
 */
function episodeNote(ep, today) {
  if (!ep) return "";
  const when = (e) => (e.air_date === today ? "aujourd'hui" : `${dayName(e.air_date)} ${shortDate(e.air_date)}`);
  const say = (e, past) => (e.episode_number === 1
    ? `Saison ${e.season_number} : 1er épisode ${past ? "sorti " : ""}${when(e)}`
    : `Nouvel épisode ${past ? "sorti " : ""}${when(e)} (S${e.season_number} É${e.episode_number})`);
  const { next, last } = ep;
  if (last && last.air_date && last.air_date <= today && last.air_date >= addDays(today, -3)) return say(last, true);
  if (next && next.air_date && next.air_date >= today && next.air_date <= addDays(today, 7)) return say(next, false);
  return "";
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
  const infos = await Promise.all(results.map((it) => extraInfo(env, kind, it.id)));
  const ids = infos.map((x) => x.imdb);
  return results.map((it, i) => {
    const date = it.release_date || it.first_air_date || "";
    // Films : quand ils deviennent regardables ; séries : l'épisode de la semaine.
    const note = kind === "movie" ? releaseNote(infos[i].releases, opts.region, today) : episodeNote(infos[i].episode, today);
    // Pas encore regardable : la date affichée par Nuvio (carrousel, « date de sortie
    // complète ») devient la date de dispo plutôt que la sortie en salle.
    const dispo = kind === "movie" ? (firstDigital(infos[i].releases) || digitalGuess(infos[i].releases)) : "";
    const shownDate = dispo && dispo > today ? dispo : date;
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
      releaseInfo: [date.slice(0, 4), note].filter(Boolean).join(" · ") || undefined,
      released: shownDate ? `${shownDate}T00:00:00.000Z` : undefined,
      genres: (it.genre_ids || []).map((g) => GENRE_NAMES[g]).filter(Boolean).slice(0, 3),
      imdbRating: imdbRating(ids[i]),   // vraie note IMDb (rien si IMDb n'en a pas assez)
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
  if (kind === "series") NOISE_TV.forEach((g) => excluded.add(g));
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
  if (def.endpoint && opts.filtered) def = endpointAsDiscover(def);
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
 * Rangées « Dispo cette semaine » / « Bientôt dispo » : films dont la PREMIÈRE sortie
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
  const lists = await Promise.all(reqs);
  const seen = new Set(), merged = [];
  lists.flatMap((d) => d.results || []).sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .forEach((it) => { if (!seen.has(it.id)) { seen.add(it.id); merged.push(it); } });
  if (!merged.length) return [];
  const metas = await toMetas(env, ctx, merged.slice(0, 30), kind, opts, today);
  const from = addDays(today, def.digital[0]), to = addDays(today, def.digital[1]);
  const when = (m) => m._digital || (future ? m._guess : "");
  return metas
    .filter((m) => when(m) && when(m) >= from && when(m) <= to)
    .filter((m) => future || m._vf)   // « Dispo cette semaine » : seulement ceux qui ont sûrement une VF
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
  const useAI = !!env.GEMINI_API_KEY && page === 1;
  if (!useAI) {
    if (trace) trace.ai = env.GEMINI_API_KEY ? "page suivante : recherche classique" : "pas de secret GEMINI_API_KEY";
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
  // la même recherche refaite profite de la réponse de Gemini (qui finit en arrière-plan).
  if (!answer || answer.error) {
    opts.partial = true;
    if (trace) trace.ai.error = answer ? answer.error : `pas de réponse en ${AI_WAIT_MS} ms`;
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

function trailersOf(videos) {
  return (videos || [])
    .filter((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
    .sort((a, b) => (b.iso_639_1 === "fr") - (a.iso_639_1 === "fr") || (b.size >= 1080) - (a.size >= 1080) || (b.type === "Trailer") - (a.type === "Trailer")
      || (b.official === true) - (a.official === true))
    .slice(0, 4)
    .map((v) => ({ source: v.key, ytId: v.key, type: v.type, name: v.name, lang: v.iso_639_1 }));
}

const person = (p) => ({ name: p.name, character: p.character || p.job || undefined, photo: p.profile_path ? `${IMG}w185${p.profile_path}` : undefined, tmdbId: p.id });

async function meta(env, kind, id, cfg, today, ctx) {
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
  const note = movie ? releaseNote(releases, cfg.g, today) : episodeNote({ next: d.next_episode_to_air, last: d.last_episode_to_air }, today);
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
  const endYear = !movie && d.status !== "Returning Series" && d.last_air_date ? d.last_air_date.slice(0, 4) : "";

  const m = {
    id: metaId,
    imdb_id: imdb || undefined,
    type: kind,
    name: (d.title || d.name || "").trim(),
    poster: d.poster_path ? `${IMG}w500${d.poster_path}` : undefined,
    background: backdrop ? `${IMG}w1920${backdrop.file_path}` : d.backdrop_path ? `${IMG}w1920${d.backdrop_path}` : undefined,
    logo: logo ? `${IMG}w500${logo.file_path.replace(/\.svg$/, ".png")}` : undefined,
    description: [note ? `${movie ? "📅" : "📺"} ${note}.` : "", d.overview || ""].filter(Boolean).join("\n") || undefined,
    releaseInfo: movie ? [date.slice(0, 4), note].filter(Boolean).join(" · ") || undefined
      : date ? `${date.slice(0, 4)}-${endYear}` : undefined,
    released: shownDate ? `${shownDate}T00:00:00.000Z` : undefined,
    status: STATUS_FR[d.status] || d.status || undefined,
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
  const extras = [movie ? creditsScene(keywords) : "", sourceNote(keywords, crew)];

  let saga = null;
  if (movie && d.belongs_to_collection) {
    const col = await tmdb(env, `/collection/${d.belongs_to_collection.id}`, {}, lang);
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
  if (env.GEMINI_API_KEY) {
    const prev = previousWork(d, movie, saga, m.videos);
    const wait = new Promise((res) => setTimeout(() => res("attente"), FICHE_AI_WAIT_MS));
    const ask = (job) => (job ? Promise.race([job, wait]) : null);
    const [recap, profile] = await Promise.all([
      ask(prev && aiRecap(env, ctx, prev.id, prev.prompt)),
      ask(aiProfile(env, ctx, `${movie ? "movie" : "tv"}-${d.id}`, profilePrompt(d, movie, keywords, cert))),
    ]);
    // Pas encore prêt, ou Gemini indisponible : la fiche n'est pas gardée, pour l'avoir plus tard.
    if ([recap, profile].some((r) => r === "attente" || (r && r.error))) m._partial = true;
    if (profile && profile !== "attente") {
      if (profile.pourQui) extras.push(`🎯 ${profile.pourQui}`);
      if (profile.aSavoir) extras.push(`⚠️ À savoir : ${profile.aSavoir}`);
    }
    if (recap && recap !== "attente" && recap.recap) recapLine = `🔁 ${prev.label}, attention ça raconte la fin : ${recap.recap}`;
  }
  m.description = [m.description, extras.filter(Boolean).join("\n"), recapLine].filter(Boolean).join("\n\n") || undefined;
  return m;
}

const FICHE_AI_WAIT_MS = 3500;   // attente maximale du rappel et du « pour qui » à l'ouverture d'une fiche

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
  // Auteurs écrits en alphabet latin seulement (TMDB n'a parfois que « 岸本斉史 » pour Masashi Kishimoto).
  const authors = [...new Set(crew.filter((c) => AUTHOR_JOBS.has(c.job) && /^[A-Za-zÀ-ÿ]/.test(c.name || "")).map((c) => c.name))].slice(0, 2);
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
    .sort((a, b) => (b.size >= 1080) - (a.size >= 1080) || (b.type === "Trailer") - (a.type === "Trailer") || (b.official === true) - (a.official === true))[0];
  const v = pick(await tmdb(env, path, {}, "fr-FR")) || pick(await tmdb(env, path, {}, "en-US"));
  return { key: v ? v.key : null, lang: v ? v.iso_639_1 : null };
}

function json(data, maxAge) {
  return new Response(JSON.stringify(data), {
    headers: { ...HEADERS, "Cache-Control": `public, max-age=${maxAge}` },
  });
}

const RESERVED = new Set(["manifest.json", "catalog", "configure", "collections.json", "guide", "tv", "trailer", "lien", "meta", "logo.png", "debug"]);

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
      const folders = c.folders
        .filter((f, i) => !hidden.has(i))
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

export default {
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

    // La racine ouvre la salle 1 (le guide) ; la programmation (salle 2) est sur /configure,
    // et aussi sur /<config>/ pour les anciens liens personnalisés.
    if (path === "/configure" || (path === "" && cfgSeg)) {
      const files = await loadCollections().catch(() => []);
      // Même ordre de référence que config.js (positions dans les liens), avec la position
      // réelle dans le fichier pour l'affichage.
      const cols = COLLECTIONS.map((c) => ({
        ...c, pos: files.findIndex((f) => f.id === c.id),
        folders: ((files.find((f) => f.id === c.id) || {}).folders || []).map((f) => ({ id: f.id, title: f.title, cover: f.coverImageUrl || "" })),
      }));
      return html(configurePage({
        origin: url.origin, cfg, rows, discover: DEFS.discover, providers: PROVIDERS, collections: cols,
        defaults: defaults(rows, DEFS.discover), regions: REGIONS, genres: GENRES, languages: LANGUAGES,
        sorts: SORTS, seasons: SEASON_KEYS, maxCustom: MAX_CUSTOM, season: decorSaison(url, today),
      }));
    }
    if (path === "") return html(hallPage({ origin: url.origin, season: decorSaison(url, today) }));   // le hall : choisir sa salle
    if (path === "/guide") return html(guidePage({ origin: url.origin, season: decorSaison(url, today) }));
    if (path === "/lien") return html(lienPage({ origin: url.origin }));   // ouvert par les QR codes du guide
    if (path === "/tv") return Response.redirect(NUVIO_TV_APK, 302);   // adresse courte pour Downloader : télécharge l'APK
    if (path === "/manifest.json") return json(manifest(today, cfg, cfgSeg), CACHE_CLIENT_S);
    if (path === "/collections.json") return json(await collections(cfg), CACHE_CLIENT_S);
    if (path === "/logo.png") {   // le logo servi par le site, sans l'adresse du dépôt dans les pages
      const r = await fetch(`${ASSETS}/logo/addon.png`, { cf: { cacheTtl: 86400, cacheEverything: true } });
      return new Response(r.body, { status: r.status, headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
    }
    if (!env.TMDB_API_KEY) return json({ error: "Secret TMDB_API_KEY manquant" }, 0);
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
    const tm = path.match(/^\/trailer\/(movie|series)\/([^/]+)\.json$/);
    if (tm) return json(await trailer(env, tm[1], decodeURIComponent(tm[2])), 7 * 86400);

    const mm = path.match(/^\/meta\/(movie|series)\/([^/]+)\.json$/);
    if (mm) {
      const metaKey = new Request(`https://cache.local/${VERSION}/${today}/meta/${mm[1]}/${mm[2]}?l=${langOf(cfg)}&g=${cfg.g}`);
      const hitMeta = await caches.default.match(metaKey);
      if (hitMeta) return new Response(hitMeta.body, { headers: { ...HEADERS, "Cache-Control": `public, max-age=${CACHE_META_CLIENT_S}` } });
      let found = null;
      try { found = await meta(env, mm[1], decodeURIComponent(mm[2]), cfg, today, ctx); } catch (e) { return json({ meta: null, error: String(e) }, 60); }
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

    // Cache de la réponse complète (une page de catalogue) pendant quelques heures.
    // La clé ne dépend que de ce qui change le contenu (pas du nom ni de l'ordre choisis).
    const cacheKey = new Request(`https://cache.local/${VERSION}/${today}${path}?k=${await sha(contentKey(cfg))}`);
    const hit = await caches.default.match(cacheKey);
    if (hit) return new Response(hit.body, { headers: { ...HEADERS, "Cache-Control": `public, max-age=${CACHE_CLIENT_S}` } });

    let metas = [];
    try {
      metas = await catalog(env, ctx, type, id, parseExtra(extraSeg), today, cfg);
    } catch (e) {
      return json({ metas: [], error: String(e) }, 60);
    }
    // Copie gardée côté Cloudflare quelques heures ; Nuvio, lui, ne garde la réponse
    // que 5 minutes (son cache disque respecte max-age), pour voir vite les changements.
    if (metas.length && !metas.partial) ctx.waitUntil(caches.default.put(cacheKey, json({ metas }, CACHE_CATALOG_S)));
    return json({ metas }, metas.partial ? 0 : CACHE_CLIENT_S);
  },
};
