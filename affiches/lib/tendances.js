/**
 * Rang d'un titre dans les tendances du jour de TMDB : le « N°4 » des affiches (top 20).
 * Une « photo » du classement est prise une fois par jour, à 4 h UTC, et sert à tout le monde : le service la
 * publie sur /tendances/{movie|series}.json, gardée par le CDN jusqu'au changement suivant, et les rangées
 * « Tendances du jour » de l'addon s'y rangent. Le N° d'une affiche est donc celui de sa place dans la rangée.
 * La photo garde les 60 premiers : au-delà du 20e, un titre « presque classé » n'a pas de N°, mais son affiche
 * expire au changement de photo, comme les classées, pour prendre son N° le jour où il entre dans le top 20.
 */
import { tmdbGet } from "./tmdb.js";

export const BASCULE_UTC_H = 4;
export const TOP = 60;
const DELAI_MS = 2500, GARDE_ECHEC_MS = 5 * 60 * 1000;

/** Heure (ms) du prochain changement de photo. */
export function prochaineBascule(now = Date.now()) {
  const d = new Date(now), b = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), BASCULE_UTC_H);
  return b > now ? b : b + 86400000;
}
/** Secondes jusqu'au prochain changement (une minute au moins) : la durée de cache des affiches classées. */
export const secondesAvantBascule = (now = Date.now()) => Math.max(60, Math.ceil((prochaineBascule(now) - now) / 1000));

let memo = new Map();   // "movie", "series" (ou "movie@relais"…) → { promesse, until }
export function resetMemo() { memo = new Map(); }

/** Les 60 premiers des tendances du jour chez TMDB (identifiants, dans l'ordre), ou null. */
async function lireTmdb(env, type, fetchImpl) {
  try {
    const pages = await Promise.all([1, 2, 3].map((p) => tmdbGet(env, `/trending/${type === "series" ? "tv" : "movie"}/day`, { page: String(p) }, fetchImpl)));
    const ids = pages.flatMap((d) => (d && d.results) || []).map((it) => it.id);
    return ids.filter((id, i) => ids.indexOf(id) === i).slice(0, TOP);
  } catch { return null; }
}

async function lireRelais(relais, type, fetchImpl) {
  try {
    const res = await fetchImpl(`${relais}/tendances/${type}.json`, { signal: AbortSignal.timeout(DELAI_MS) });
    if (!res.ok) return null;
    const d = await res.json();
    return Array.isArray(d && d.ids) ? d.ids : null;
  } catch { return null; }
}

/**
 * La photo du jour (identifiants TMDB dans l'ordre), ou null. relais : adresse du service, pour lire la photo
 * commune gardée par son CDN ; sans relais, TMDB directement (c'est ainsi que le relais la prend).
 */
export function photoTendances(env, type, fetchImpl = fetch, relais = null) {
  const cle = relais ? type + "@relais" : type, now = Date.now(), hit = memo.get(cle);
  if (hit && now < hit.until) return hit.promesse;
  const entry = { promesse: relais ? lireRelais(relais, type, fetchImpl) : lireTmdb(env, type, fetchImpl), until: prochaineBascule(now) };
  memo.set(cle, entry);
  entry.promesse.then((ids) => { if (!ids) entry.until = Date.now() + GARDE_ECHEC_MS; });
  return entry.promesse;
}

/** Place (1 à 60) du titre sur la photo du jour, ou null (absent, ou photo illisible). */
export async function trendingRank(env, type, tmdbId, fetchImpl = fetch, relais = null) {
  const ids = await photoTendances(env, type, fetchImpl, relais);
  const i = ids ? ids.indexOf(tmdbId) : -1;
  return i < 0 ? null : i + 1;
}
