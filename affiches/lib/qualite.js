/**
 * Qualité d'un titre (4K, puis DV ou HDR), lue dans les noms des flux de Torrentio, comme le fait
 * un addon de sources. Seulement la 4K : en dessous, pas de badge. Un échec ou un délai dépassé
 * donne null, et l'affiche part sans badge plutôt qu'avec un badge faux.
 * Sur Vercel, elle passe par le relais /qualite/… du service, gardé un jour par le cache de Vercel :
 * ce qu'une instance a lu sert à toutes les autres (même badge partout, donc même ETag).
 */
import { enteteRelais } from "./relais.js";

export const TORRENTIO = "https://torrentio.strem.fun";
const DELAI_MS = 2500;
// Un jour : la VF lue dans les sources (statut des affiches) arrive vite après la sortie.
const GARDE_MS = 86400 * 1000, GARDE_ECHEC_MS = 3600 * 1000;
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
// VF dans le nom d'un flux : TRUEFRENCH, FRENCH, VFF, VFQ…, ou « Multi Audio » avec le drapeau français. Les drapeaux
// seuls ne comptent pas : une sortie WEB-DL en affiche quinze, surtout pour ses sous-titres.
const VF = /\b(TRUEFRENCH|FRENCH|VFF|VFQ|VFI|VF2|VOF)\b|\bMULTI\b.*\bVF\b|Multi Audio.*🇫🇷/i;
// Langue (badge « Langue » des affiches) : un flux VF qui porte aussi MULTI (ou « Multi Audio ») a la VF et la VO ;
// sans VF, des sous-titres français (VOSTFR, SUBFRENCH) ; sinon de la VO seulement.
const MULTI = /\bMULTI\b|Multi Audio/i;
const VOSTFR = /\b(VOSTFR|SUBFRENCH)\b/i;

/** La meilleure langue des flux pour un Français : "multi", "vf", "vostfr", "vo", ou null sans aucun flux. */
function langueDe(tous) {
  if (!tous.length) return null;
  const enVf = tous.filter((t) => VF.test(t));
  if (enVf.some((t) => MULTI.test(t))) return "multi";
  if (enVf.length) return "vf";
  return tous.some((t) => VOSTFR.test(t)) ? "vostfr" : "vo";
}

/**
 * { uhd, extra, fhd, hdr10p, atmos, vf, sources, langue } d'après une liste de flux Stremio ({ name, title }). DV, HDR
 * et HDR10+ comptent seulement en 4K ; fhd = un flux 1080p ; atmos = un flux Dolby Atmos, en toute résolution ;
 * langue : la meilleure (langueDe), « multi » ou « vf » exactement quand vf est vrai.
 */
export function parseQuality(streams) {
  const tous = (streams || []).map((s) => `${s.name || ""} ${s.title || ""}`);
  const uhd = tous.filter((t) => UHD.test(t));
  const extra = uhd.some((t) => DV.test(t)) ? "DV" : uhd.some((t) => HDR.test(t)) ? "HDR" : null;
  return { uhd: uhd.length > 0, extra, fhd: tous.some((t) => FHD.test(t)), hdr10p: uhd.some((t) => HDR10P.test(t)), atmos: tous.some((t) => ATMOS.test(t)),
    vf: tous.some((t) => VF.test(t)), sources: tous.length, langue: langueDe(tous) };
}
const LANGUES = ["multi", "vf", "vostfr", "vo"];

/** Qualité lue directement chez Torrentio pour une vidéo (« movie/tt… », « series/tt…:3:1 ») ; null si échec. */
export async function lireTorrentio(video, fetchImpl = fetch) {
  try {
    // Les flux en français d'abord : sinon, pour un titre très partagé, ils passent après ceux que Torrentio renvoie.
    const res = await fetchImpl(`${TORRENTIO}/language=french/stream/${video}.json`, { signal: AbortSignal.timeout(DELAI_MS) });
    if (!res.ok) { console.warn(`Torrentio ${res.status} pour ${video}`); return null; }
    const d = await res.json();
    return parseQuality(d && d.streams);
  } catch (e) { console.warn(`Torrentio injoignable pour ${video} : ${e && e.message}`); return null; }
}

async function lireRelais(relais, video, fetchImpl, cle) {
  try {
    // ?v=3 : avec la VF des sources ; les réponses d'avant restent au CDN sous leurs anciennes adresses.
    const res = await fetchImpl(`${relais}/qualite/${video}.json?v=3`, { headers: enteteRelais(cle), signal: AbortSignal.timeout(DELAI_MS + 500) });
    if (!res.ok) return null;
    const d = await res.json();
    // Réponse gardée au CDN avant la qualité v2 : sans fhd, hdr10p ni atmos (lus false). { erreur: true } (Torrentio
    // en panne) : null. Sans langue (réponse d'avant le badge Langue) : langue inconnue, pas de badge. Pas de ?v=4
    // pour elle : chaque mise en ligne vide déjà le CDN, et le relais ne garde une réponse qu'un jour.
    return d && typeof d.uhd === "boolean"
      ? { uhd: d.uhd, extra: d.extra === "DV" || d.extra === "HDR" ? d.extra : null, fhd: d.fhd === true, hdr10p: d.hdr10p === true, atmos: d.atmos === true,
        vf: typeof d.vf === "boolean" ? d.vf : null, sources: Number.isInteger(d.sources) ? d.sources : null, langue: LANGUES.includes(d.langue) ? d.langue : null }
      : null;
  } catch { return null; }
}

/**
 * Qualité d'un film, ou d'une série (premier épisode de sa dernière saison) ; null si inconnue.
 * relais : adresse du service (sur Vercel) pour passer par son cache partagé ; sans relais, Torrentio directement.
 * cle : RELAIS_KEY, envoyée au relais (lib/relais.js).
 */
export async function qualityOf(type, imdbId, lastSeason, fetchImpl = fetch, relais = null, cle = null) {
  if (!imdbId) return null;
  const video = type === "series" ? `series/${imdbId}:${lastSeason || 1}:1` : `movie/${imdbId}`;
  const now = Date.now(), hit = memo.get(video);
  if (hit && now < hit.until) return hit.promesse;
  const entry = { promesse: relais ? lireRelais(relais, video, fetchImpl, cle) : lireTorrentio(video, fetchImpl), until: now + GARDE_MS };
  memo.delete(video);
  memo.set(video, entry);
  // Mémoire plafonnée : les entrées les plus anciennes sortent (une Map garde l'ordre d'arrivée).
  while (memo.size > MAX_MEMO) memo.delete(memo.keys().next().value);
  entry.promesse.then((q) => { if (!q) entry.until = Date.now() + GARDE_ECHEC_MS; });
  return entry.promesse;
}

/**
 * Qualité déjà connue seulement : la mémoire de l'instance, sinon le relais sans clé (une réponse déjà au CDN passe,
 * une adresse nouvelle est refusée). Jamais Torrentio, et rien n'est gardé en mémoire : un « inconnu » lu ainsi ne
 * doit pas répondre plus tard à la place d'une vraie lecture avec la clé.
 */
export async function qualiteConnue(type, imdbId, lastSeason, fetchImpl = fetch, relais) {
  if (!imdbId || !relais) return null;
  const video = type === "series" ? `series/${imdbId}:${lastSeason || 1}:1` : `movie/${imdbId}`;
  const hit = memo.get(video);
  if (hit && Date.now() < hit.until) return hit.promesse;
  return lireRelais(relais, video, fetchImpl, null);
}
