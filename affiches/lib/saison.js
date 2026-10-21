/**
 * Habillage de la saison (réglage Saison) : un cadre et des ornements d'Halloween, de Noël, de la Saint-Valentin,
 * de Pâques ou d'été sur les films de la rangée de saison de l'addon (« Spécial Halloween »…).
 * Nuvio ne dit pas au service de quelle rangée vient une affiche : le lien d'affiches n'a que le titre, son type et sa
 * forme ({type}, {shape}, {id}, {imdb_id}), et il remplace toutes les affiches, de toutes les rangées (NuvioTV,
 * CustomPosterUrlResolver). On habille donc les films qui sont en ce moment dans cette rangée, d'après la liste que
 * l'addon publie (/saison.json, réglages par défaut, gardée 3 h ici) : un de ces films est habillé partout où il
 * apparaît (autre rangée, recherche, fiche), pas seulement dans la rangée de saison.
 * Même calendrier que la rangée (pickSeason de worker/index.js, dates à Paris) : un test vérifie qu'ils s'accordent.
 */
import { ADDON_URL } from "./tendances.js";
import { jourParis, secondesAvantJourParis } from "./jour.js";

const DELAI_MS = 2500, GARDE_MS = 3 * 3600 * 1000, GARDE_ECHEC_MS = 5 * 60 * 1000;
export const SAISONS = Object.freeze(["halloween", "noel", "saint-valentin", "paques", "ete"]);

const ajoute = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/** Date de Pâques (algorithme de Meeus/Jones/Butcher), comme worker/index.js. */
function paques(annee) {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

/** La fête d'un jour (« halloween », « noel »…), ou null hors fête (la rangée montre alors les films à l'affiche). */
export function saisonDu(today) {
  const md = today.slice(5), p = paques(Number(today.slice(0, 4)));
  if (today >= ajoute(p, -15) && today <= ajoute(p, 8)) return "paques";
  if (md >= "10-01" && md <= "11-02") return "halloween";
  if (md >= "11-20" || md <= "01-06") return "noel";
  if (md >= "01-25" && md <= "02-15") return "saint-valentin";
  if (md >= "06-20" && md <= "08-31") return "ete";
  return null;
}

/** Le premier jour où la fête change (début ou fin), après today. */
export function prochainChangement(today) {
  const s = saisonDu(today);
  let d = ajoute(today, 1);
  for (let i = 0; i < 400 && saisonDu(d) === s; i++) d = ajoute(d, 1);
  return d;
}

/** Secondes jusqu'au prochain changement de fête (minuit à Paris) : la durée de cache d'une affiche pas habillée. */
export const secondesAvantChangementSaison = (now = Date.now()) => secondesAvantJourParis(prochainChangement(jourParis(now)), now);

let memo = null;   // { promesse, until }
export function resetMemo() { memo = null; }

/** La rangée de saison publiée par l'addon : { saison, ids: Set d'identifiants TMDB }, ou null (addon injoignable). */
export function lireSaison(env, fetchImpl = fetch) {
  const now = Date.now();
  if (memo && now < memo.until) return memo.promesse;
  const entry = {
    promesse: (async () => {
      try {
        const res = await fetchImpl(`${env.ADDON_URL || ADDON_URL}/saison.json`, { signal: AbortSignal.timeout(DELAI_MS) });
        if (!res.ok) return null;
        const d = await res.json();
        if (!d || !Array.isArray(d.ids) || (d.saison !== null && !SAISONS.includes(d.saison))) return null;
        return { saison: d.saison, ids: new Set(d.ids.filter(Number.isInteger)) };
      } catch { return null; }
    })(),
    until: now + GARDE_MS,
  };
  memo = entry;
  entry.promesse.then((x) => { if (!x) entry.until = Date.now() + GARDE_ECHEC_MS; });
  return entry.promesse;
}

/** La fête dont habiller ce film aujourd'hui, ou null : il doit être dans la rangée, et la rangée de la même fête. */
export function habillageDe(rangee, tmdbId, today) {
  const s = saisonDu(today);
  return s && rangee && rangee.saison === s && rangee.ids.has(tmdbId) ? s : null;
}
