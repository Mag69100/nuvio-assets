/**
 * Qualité d'un titre (4K, puis DV ou HDR), lue dans les noms des flux de Torrentio, comme le fait
 * un addon de sources. Seulement la 4K : en dessous, pas de badge. Un échec ou un délai dépassé
 * donne null, et l'affiche part sans badge plutôt qu'avec un badge faux.
 * Sur Vercel, elle passe par le relais /qualite/… du service, gardé 3 jours par le cache de Vercel :
 * ce qu'une instance a lu sert à toutes les autres (même badge partout, donc même ETag).
 */
export const TORRENTIO = "https://torrentio.strem.fun";
const DELAI_MS = 2500;
const GARDE_MS = 3 * 86400 * 1000, GARDE_ECHEC_MS = 3600 * 1000;
const MAX_MEMO = 5000;

let memo = new Map();   // "movie/tt…" ou "series/tt…:saison:1" → { promesse, until }
export function resetMemo() { memo = new Map(); }
export const tailleMemo = () => memo.size;

const UHD = /\b(2160p|4k|uhd)\b/i;
const DV = /\b(dv|dovi|dolby ?vision)\b/i;
const HDR = /\bhdr(10\+?)?(?=\W|$)/i;
const HDR10P = /\bhdr10(\+|plus)(?=\W|$)/i;
const FHD = /\b1080p\b/i;
const ATMOS = /\batmos\b/i;

/**
 * { uhd, extra, fhd, hdr10p, atmos } d'après une liste de flux Stremio ({ name, title }). DV, HDR et HDR10+
 * comptent seulement en 4K ; fhd = un flux 1080p ; atmos = un flux Dolby Atmos, en toute résolution.
 */
export function parseQuality(streams) {
  const tous = (streams || []).map((s) => `${s.name || ""} ${s.title || ""}`);
  const uhd = tous.filter((t) => UHD.test(t));
  const extra = uhd.some((t) => DV.test(t)) ? "DV" : uhd.some((t) => HDR.test(t)) ? "HDR" : null;
  return { uhd: uhd.length > 0, extra, fhd: tous.some((t) => FHD.test(t)), hdr10p: uhd.some((t) => HDR10P.test(t)), atmos: tous.some((t) => ATMOS.test(t)) };
}

/** Qualité lue directement chez Torrentio pour une vidéo (« movie/tt… », « series/tt…:3:1 ») ; null si échec. */
export async function lireTorrentio(video, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`${TORRENTIO}/stream/${video}.json`, { signal: AbortSignal.timeout(DELAI_MS) });
    if (!res.ok) { console.warn(`Torrentio ${res.status} pour ${video}`); return null; }
    const d = await res.json();
    return parseQuality(d && d.streams);
  } catch (e) { console.warn(`Torrentio injoignable pour ${video} : ${e && e.message}`); return null; }
}

async function lireRelais(relais, video, fetchImpl) {
  try {
    const res = await fetchImpl(`${relais}/qualite/${video}.json`, { signal: AbortSignal.timeout(DELAI_MS + 500) });
    if (!res.ok) return null;
    const d = await res.json();
    // Réponse gardée au CDN avant la qualité v2 : sans fhd, hdr10p ni atmos (lus false).
    return d && typeof d.uhd === "boolean"
      ? { uhd: d.uhd, extra: d.extra === "DV" || d.extra === "HDR" ? d.extra : null, fhd: d.fhd === true, hdr10p: d.hdr10p === true, atmos: d.atmos === true }
      : null;
  } catch { return null; }
}

/**
 * Qualité d'un film, ou d'une série (premier épisode de sa dernière saison) ; null si inconnue.
 * relais : adresse du service (sur Vercel) pour passer par son cache partagé ; sans relais, Torrentio directement.
 */
export async function qualityOf(type, imdbId, lastSeason, fetchImpl = fetch, relais = null) {
  if (!imdbId) return null;
  const video = type === "series" ? `series/${imdbId}:${lastSeason || 1}:1` : `movie/${imdbId}`;
  const now = Date.now(), hit = memo.get(video);
  if (hit && now < hit.until) return hit.promesse;
  const entry = { promesse: relais ? lireRelais(relais, video, fetchImpl) : lireTorrentio(video, fetchImpl), until: now + GARDE_MS };
  memo.delete(video);
  memo.set(video, entry);
  // Mémoire plafonnée : les entrées les plus anciennes sortent (une Map garde l'ordre d'arrivée).
  while (memo.size > MAX_MEMO) memo.delete(memo.keys().next().value);
  entry.promesse.then((q) => { if (!q) entry.until = Date.now() + GARDE_ECHEC_MS; });
  return entry.promesse;
}
