/**
 * Rang d'un film dans sa saga (« SAGA · 3/5 », réglage Saga) : sa place parmi les films de la collection TMDB
 * (belongs_to_collection), rangés par date de sortie. Le total compte les films déjà sortis ; un film pas encore
 * sorti compte en plus (« 6/6 » pour le prochain d'une saga de cinq). Les films sans date (annoncés) ne comptent pas.
 * Un seul appel /collection/{id} par saga, gardé en mémoire de l'instance une semaine (les films d'une saga ne
 * changent presque jamais ; le total, lui, est recalculé chaque jour avec la date) ; un échec, une heure.
 */
import { tmdbGet } from "./tmdb.js";

const GARDE_MS = 7 * 86400 * 1000, GARDE_ECHEC_MS = 3600 * 1000, MAX_MEMO = 2000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

let memo = new Map();   // identifiant de la collection → { promesse, until }
export function resetMemo() { memo = new Map(); }
export const tailleMemo = () => memo.size;

/** Les films d'une collection ({ id, date }), ou null si TMDB ne répond pas ou ne la connaît pas. */
export function filmsDeLaSaga(env, id, fetchImpl = fetch) {
  const now = Date.now(), hit = memo.get(id);
  if (hit && now < hit.until) return hit.promesse;
  const entry = {
    promesse: tmdbGet(env, `/collection/${id}`, {}, fetchImpl)
      .then((d) => (d && Array.isArray(d.parts) ? d.parts.map((p) => ({ id: p.id, date: p.release_date || "" })) : null))
      .catch(() => null),
    until: now + GARDE_MS,
  };
  memo.delete(id);
  memo.set(id, entry);
  while (memo.size > MAX_MEMO) memo.delete(memo.keys().next().value);
  entry.promesse.then((films) => { if (!films) entry.until = Date.now() + GARDE_ECHEC_MS; });
  return entry.promesse;
}

/** { n: place, t: total } du film tmdbId dans la saga, ou null (pas dedans, sans date, saga d'un seul film). */
export function rangSaga(films, tmdbId, today) {
  if (!Array.isArray(films)) return null;
  const dates = films.filter((f) => DATE.test(f.date)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  const i = dates.findIndex((f) => f.id === tmdbId);
  if (i < 0) return null;
  const t = Math.max(dates.filter((f) => f.date <= today).length, i + 1);
  return t >= 2 ? { n: i + 1, t } : null;
}
