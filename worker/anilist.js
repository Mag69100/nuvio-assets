/**
 * Recherche de secours dans AniList (base d'animes publique, sans clé) : un anime cherché par son nom japonais en
 * lettres latines (« shingeki no kyojin », « boku no hero »), que TMDB ne connaît pas sous ce nom, ou par un
 * personnage (« ichigo » : Ichigo Kurosaki, Bleach ; « luffy », « gojo »). Seulement quand la recherche classique ne
 * trouve rien de connu (runSearch), avant Gemini : ça marche aussi sans clé Gemini.
 *
 * Une seule demande (animes et personnages ensemble) ; AniList en accepte 30 par minute : les réponses sont gardées
 * 7 jours (1 jour sans rien trouvé), une panne ou un refus (429) rend null, la recherche continue sans lui.
 * Les titres trouvés sont rendus comme ceux de Gemini (resolveTitles, ai.js) : { title, title_fr, title_en, year, type }.
 */
import { norm } from "./search.js";

const URL_ANILIST = "https://graphql.anilist.co";
const WAIT_MS = 1500;
const POP_MIN = 15000;     // membres AniList qui suivent l'anime : en dessous, trop obscur pour passer devant
const FANS_MIN = 1000;     // favoris d'un personnage : en dessous, un figurant (« Dune » de Casshern Sins)
const MAX_PICKS = 3;       // titres rendus : chacun coûte jusqu'à 3 recherches TMDB (budget de runSearch)
const GARDE_S = 7 * 86400, GARDE_VIDE_S = 86400;
const MIN_LETTRES = 4;     // Nuvio cherche à chaque lettre tapée : pas pour « ku », « kur »
const PAUSE_MS = 60e3;     // après un refus (429, quota dépassé) : plus d'appel pendant une minute sur cette instance
let pauseJusqua = 0;
export const oublierPauseAnilist = () => { pauseJusqua = 0; };
const FORMATS = { TV: "serie", TV_SHORT: "serie", ONA: "serie", MOVIE: "film" };

const QUERY = `query($s:String){
  a: Page(perPage:6){ media(search:$s, type:ANIME, sort:SEARCH_MATCH){ title{romaji english} synonyms format startDate{year} popularity } }
  c: Page(perPage:4){ characters(search:$s, sort:SEARCH_MATCH){ name{full alternative} favourites
    media(perPage:3, sort:POPULARITY_DESC, type:ANIME){ nodes{ title{romaji english} format startDate{year} popularity } } } }
}`;

// Suite d'une série (« Attack on Titan Season 2 », « Final Season », « Part 2 ») : le titre de la série, sans année
// (TMDB n'a qu'une fiche pour toutes les saisons, datée de la première).
const SUITE = /\s*(?:[:\-–]\s*)?(?:(?:the\s+)?final season.*|season \d+.*|\d+(?:st|nd|rd|th) season.*|part \d+.*|\bs\d+\b.*)$/i;

/** Chaque mot de la requête commence un mot du nom (ou en diffère d'une lettre) : « gojo » → « Satoru Gojou ». */
function nomCorrespond(query, noms) {
  const mots = norm(query).split(" ").filter(Boolean);
  const proche = (w, t) => t === w || (w.length >= 3 && t.startsWith(w)) || (w.length >= 4 && Math.abs(t.length - w.length) <= 1 && diffUne(w, t));
  // Collés ou séparés autrement : « sung jinwoo » → « Sung Jin-Woo ».
  const colle = mots.join("");
  return noms.filter(Boolean).some((n) => {
    const toks = norm(n).split(" ").filter(Boolean);
    return mots.length > 0 && (mots.every((w) => toks.some((t) => proche(w, t))) || (colle.length >= 5 && toks.join("").includes(colle)));
  });
}
/** Au plus une lettre de différence (remplacée, en plus ou en moins). */
function diffUne(a, b) {
  if (a.length > b.length) [a, b] = [b, a];
  let i = 0, j = 0, d = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++d > 1) return false;
    if (a.length === b.length) i++;
    j++;
  }
  return d + (b.length - j) + (a.length - i) <= 1;
}

/** Une œuvre d'AniList → le titre à chercher dans TMDB, ou null (OVA, spécial, clip). */
function choix(m) {
  const type = FORMATS[m.format];
  if (!type) return null;
  const en = (m.title.english || "").trim(), ro = (m.title.romaji || "").trim();
  const enCourt = en.replace(SUITE, "").trim(), roCourt = ro.replace(SUITE, "").trim();
  const suite = enCourt !== en || roCourt !== ro;
  const title = enCourt || roCourt;
  if (!title) return null;
  return { title, title_fr: title, title_en: enCourt || roCourt, title_ro: roCourt, year: suite ? undefined : m.startDate && m.startDate.year || undefined, type, saga: false, pop: m.popularity || 0 };
}

/** Les œuvres d'AniList qui répondent à la requête (animes du même nom, ou où joue ce personnage), les plus suivies d'abord. */
export function oeuvresDe(query, data) {
  const out = [];
  for (const m of (data && data.a && data.a.media) || []) {
    if ((m.popularity || 0) >= POP_MIN && nomCorrespond(query, [m.title.romaji, m.title.english, ...(m.synonyms || [])])) out.push(choix(m));
  }
  for (const c of (data && data.c && data.c.characters) || []) {
    if ((c.favourites || 0) < FANS_MIN || !nomCorrespond(query, [c.name.full, ...(c.name.alternative || [])])) continue;
    for (const m of (c.media && c.media.nodes) || []) if ((m.popularity || 0) >= POP_MIN) out.push(choix(m));
  }
  const vus = new Set();
  return out.filter(Boolean).sort((a, b) => b.pop - a.pop)
    .filter((p) => { const k = `${p.type}:${norm(p.title)}`; return !vus.has(k) && vus.add(k); })
    .slice(0, MAX_PICKS).map(({ pop, title_ro, ...p }) => p);
}

/** Titres d'animes pour cette requête (gardés), [] si rien, null si AniList ne répond pas. */
export async function animesDe(query) {
  if (norm(query).replace(/ /g, "").length < MIN_LETTRES) return [];
  const cle = new Request(`https://cache.local/anilist-v1/${encodeURIComponent(norm(query))}`);
  const hit = await caches.default.match(cle).catch(() => null);
  if (hit) return hit.json();
  if (Date.now() < pauseJusqua) return null;
  let data;
  try {
    const r = await fetch(URL_ANILIST, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { s: query } }), signal: AbortSignal.timeout(WAIT_MS),
    });
    if (r.status === 429) pauseJusqua = Date.now() + PAUSE_MS;
    // Dans les journaux (wrangler tail) : un refus d'AniList se voit, la recherche continue sans lui.
    if (!r.ok) { console.log(`anilist ${r.status} pour « ${query} »`); return null; }
    data = (await r.json()).data;
  } catch (e) {
    console.log(`anilist ${e && e.name} pour « ${query} »`);
    return null;
  }
  const picks = oeuvresDe(query, data);
  await caches.default.put(cle, new Response(JSON.stringify(picks), { headers: { "Cache-Control": `public, max-age=${picks.length ? GARDE_S : GARDE_VIDE_S}` } })).catch(() => {});
  return picks;
}
