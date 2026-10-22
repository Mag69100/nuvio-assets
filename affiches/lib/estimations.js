/**
 * Fenêtres salle → numérique des distributeurs américains, d'après data/estimations-vod.json du dépôt (refait chaque
 * nuit par scripts/build_fenetres_vod.py) : l'estimation de la sortie numérique d'un film qui n'en a pas d'annoncée
 * (dispoChezSoi, lib/statut.js). Le même fichier que l'addon (worker/index.js : estimationsVod), lu sur le dépôt
 * principal comme les notes IMDb (lib/notes.js) : les commits de chaque nuit ne redéploient pas le service, et une
 * copie du service n'a rien à régler. Gardé 1 h en mémoire ; pendant une nouvelle lecture, et si elle échoue,
 * l'ancienne table sert encore. Illisible : la salle + 45 jours, comme avant.
 */
import { tableVod } from "./statut.js";

export const ESTIMATIONS_URL = "https://raw.githubusercontent.com/xnzx07/nuvio-assets/main/data/estimations-vod.json";
const GARDE_MS = 3600 * 1000, ECHEC_MS = 5 * 60 * 1000, DELAI_MS = 4000;

let memo = null;   // { table (ou null), until, promesse (lecture en cours, ou null) }
export function resetMemo() { memo = null; }

async function charger(fetchImpl) {
  try {
    const res = await fetchImpl(ESTIMATIONS_URL, { signal: AbortSignal.timeout(DELAI_MS) });
    return res.ok ? tableVod(await res.json()) : null;
  } catch { return null; }
}

/** Lance la lecture s'il le faut (jamais lue, ou gardée depuis plus d'une heure). Échec : nouvel essai dans 5 min. */
function demarrer(fetchImpl) {
  if (memo && (memo.promesse || Date.now() <= memo.until)) return memo;
  const ancienne = memo ? memo.table : null;
  const promesse = charger(fetchImpl);
  const etat = { table: ancienne, until: Infinity, promesse };
  memo = etat;
  promesse.then((table) => { if (memo === etat) memo = { table: table || ancienne, until: Date.now() + (table ? GARDE_MS : ECHEC_MS), promesse: null }; });
  return etat;
}

/** La promesse, ou undefined si elle n'a pas abouti dans le délai. */
function avant(promesse, ms) {
  if (!Number.isFinite(ms)) return promesse;
  let timer;
  return Promise.race([promesse, new Promise((ok) => { timer = setTimeout(ok, ms); })]).finally(() => clearTimeout(timer));
}

/**
 * { table : { mediane, films, fenetres } ou null ; manque : pas de table (illisible, ou pas encore lue après attenteMs)
 * — l'affiche prend alors la salle + 45 jours et le cache court }. Une instance qui démarre n'attend pas plus
 * qu'attenteMs : la lecture continue pour les affiches suivantes.
 */
export async function lireEstimations(fetchImpl = fetch, attenteMs = Infinity) {
  const m = demarrer(fetchImpl);
  const table = m.table || (m.promesse ? await avant(m.promesse, attenteMs) : null);
  return table ? { table, manque: false } : { table: null, manque: true };
}
