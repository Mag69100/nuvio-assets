/**
 * Rang d'un titre dans les tendances du jour de TMDB (top 20, une seule page) : le « N°4 » des affiches.
 * La rangée « Tendances du jour » de l'addon suit le même classement.
 */
import { tmdbGet } from "./tmdb.js";

const GARDE_MS = 3600 * 1000;
let memo = new Map();   // type → { promesse, until }
export function resetMemo() { memo = new Map(); }

async function lire(env, type, fetchImpl) {
  try {
    const d = await tmdbGet(env, `/trending/${type === "series" ? "tv" : "movie"}/day`, { page: "1" }, fetchImpl);
    return new Map(((d && d.results) || []).slice(0, 20).map((it, i) => [it.id, i + 1]));
  } catch { return null; }
}

/** 1 à 20, ou null (absent du top 20, ou classement illisible). */
export async function trendingRank(env, type, tmdbId, fetchImpl = fetch) {
  const now = Date.now(), hit = memo.get(type);
  let entry = hit && now < hit.until ? hit : null;
  if (!entry) {
    entry = { promesse: lire(env, type, fetchImpl), until: now + GARDE_MS };
    memo.set(type, entry);
    entry.promesse.then((r) => { if (!r) entry.until = Date.now() + 5 * 60 * 1000; });
  }
  const ranks = await entry.promesse;
  return (ranks && ranks.get(tmdbId)) || null;
}
