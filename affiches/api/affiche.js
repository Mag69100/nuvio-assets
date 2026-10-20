/**
 * /{type}/{shape}/{id}.jpg?imdb=… (réécrit vers /api/affiche par vercel.json) : l'affiche maison d'un titre.
 * Toute erreur répond par un code HTTP d'erreur : Nuvio montre alors l'affiche d'origine.
 * Caches : Nuvio garde l'image une semaine (puis revérifie l'ETag) ; le CDN de Vercel la garde un jour
 * et la redessine en arrière-plan ensuite, ce qui tient dans les limites de l'offre gratuite.
 */
import { titleFacts } from "../lib/tmdb.js";
import { ratingOf } from "../lib/notes.js";
import { trendingRank } from "../lib/tendances.js";
import { qualityOf } from "../lib/qualite.js";
import { posterContent, contentKey } from "../lib/contenu.js";
import { draw } from "../lib/dessin.js";

const OK_CACHE = { "Cache-Control": "public, max-age=604800", "Vercel-CDN-Cache-Control": "max-age=86400, stale-while-revalidate=604800" };
const ABSENT = { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" };
const CORS = { "Access-Control-Allow-Origin": "*" };

const absent = () => new Response(null, { status: 404, headers: { ...CORS, ...ABSENT } });
const panne = () => new Response(null, { status: 502, headers: { ...CORS, "Cache-Control": "no-store" } });

export function makeHandler({ fetchImpl = fetch, env = process.env } = {}) {
  return async function GET(request) {
    const q = new URL(request.url).searchParams;
    const type = q.get("type"), shape = q.get("shape"), id = q.get("id") || "";
    const imdb = /^tt\d{1,10}$/.test(q.get("imdb") || "") ? q.get("imdb") : "";
    if (!["movie", "series"].includes(type) || !["poster", "landscape"].includes(shape) || !/^(tt\d{1,10}|tmdb:\d{1,10})$/.test(id)) return absent();
    try {
      const facts = await titleFacts(env, { type, id, imdb }, fetchImpl);
      if (!facts) return absent();
      const [imdbRating, rank, quality] = await Promise.all([
        facts.imdbId ? ratingOf(facts.imdbId, fetchImpl) : undefined,
        trendingRank(env, type, facts.tmdbId, fetchImpl),
        env.QUALITE !== "off" ? qualityOf(type, facts.imdbId, facts.lastSeason, fetchImpl) : null,
      ]);
      const content = posterContent(facts, { imdbRating, rank, quality }, shape);
      if (!content) return absent();
      const etag = `"${contentKey(content)}"`;
      const headers = { ...CORS, ...OK_CACHE, ETag: etag };
      if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
      const jpg = await draw(content, fetchImpl);
      return new Response(jpg, { status: 200, headers: { ...headers, "Content-Type": "image/jpeg" } });
    } catch (e) {
      console.error(`affiche ${type}/${shape}/${id} : ${e && e.message}`);
      return panne();
    }
  };
}

export const GET = makeHandler();
