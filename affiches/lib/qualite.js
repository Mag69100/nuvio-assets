/**
 * Qualité d'un titre (4K, puis DV ou HDR), lue dans les noms des flux de Torrentio, comme le fait
 * un addon de sources. Seulement la 4K : en dessous, pas de badge. Un échec ou un délai dépassé
 * donne null, et l'affiche part sans badge plutôt qu'avec un badge faux.
 */
export const TORRENTIO = "https://torrentio.strem.fun";
export const QUALITE_ACTIVE = process.env.QUALITE !== "off";
const DELAI_MS = 2500;
const GARDE_MS = 3 * 86400 * 1000, GARDE_ECHEC_MS = 3600 * 1000;

let memo = new Map();   // "type:id:saison" → { promesse, until }
export function resetMemo() { memo = new Map(); }

const UHD = /\b(2160p|4k|uhd)\b/i;
const DV = /\b(dv|dovi|dolby ?vision)\b/i;
const HDR = /\bhdr(10\+?)?(?=\W|$)/i;

/** { uhd, extra } d'après une liste de flux Stremio ({ name, title }). DV et HDR comptent seulement en 4K. */
export function parseQuality(streams) {
  const uhd = (streams || []).map((s) => `${s.name || ""} ${s.title || ""}`).filter((t) => UHD.test(t));
  const extra = uhd.some((t) => DV.test(t)) ? "DV" : uhd.some((t) => HDR.test(t)) ? "HDR" : null;
  return { uhd: uhd.length > 0, extra };
}

async function lire(url, fetchImpl) {
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(DELAI_MS) });
    if (!res.ok) return null;
    const d = await res.json();
    return parseQuality(d && d.streams);
  } catch { return null; }
}

/** Qualité d'un film, ou d'une série (premier épisode de sa dernière saison) ; null si inconnue. */
export async function qualityOf(type, imdbId, lastSeason, fetchImpl = fetch) {
  if (!imdbId) return null;
  const video = type === "series" ? `series/${imdbId}:${lastSeason || 1}:1` : `movie/${imdbId}`;
  const now = Date.now(), hit = memo.get(video);
  if (hit && now < hit.until) return hit.promesse;
  const entry = { promesse: lire(`${TORRENTIO}/stream/${video}.json`, fetchImpl), until: now + GARDE_MS };
  memo.set(video, entry);
  entry.promesse.then((q) => { if (!q) entry.until = Date.now() + GARDE_ECHEC_MS; });
  return entry.promesse;
}
