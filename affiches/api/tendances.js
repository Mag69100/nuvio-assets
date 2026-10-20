/**
 * /tendances/{movie|series}.json (réécrit vers /api/tendances par vercel.json) : la photo du jour des tendances
 * TMDB ({ ids: [identifiants TMDB, dans l'ordre] }), gardée par le CDN jusqu'au changement de photo (4 h UTC).
 * Les affiches y lisent leur N°, et l'addon y range ses rangées « Tendances du jour » : même ordre partout.
 */
import { photoTendances, secondesAvantBascule } from "../lib/tendances.js";

export function makeTendances({ fetchImpl = fetch, env = process.env } = {}) {
  return async function GET(request) {
    const type = new URL(request.url).searchParams.get("type");
    if (!["movie", "series"].includes(type)) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" } });
    }
    const ids = await photoTendances(env, type, fetchImpl);
    if (!ids) return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
    const s = secondesAvantBascule();
    return new Response(JSON.stringify({ ids }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": `public, max-age=${s}`, "Vercel-CDN-Cache-Control": `max-age=${s}` },
    });
  };
}

export const GET = makeTendances();
