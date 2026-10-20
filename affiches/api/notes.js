/**
 * /notes/{tt…}.json (réécrit vers /api/notes par vercel.json) : les notes Rotten Tomatoes, Metacritic et
 * Letterboxd d'un titre, lues chez MDBList et gardées 7 jours par le CDN de Vercel (le quota MDBList est par jour).
 */
import { lireMdblist } from "../lib/notes-plus.js";

export function makeNotes({ fetchImpl = fetch, env = process.env } = {}) {
  return async function GET(request) {
    const imdb = new URL(request.url).searchParams.get("imdb") || "";
    if (!/^tt\d{1,10}$/.test(imdb)) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" } });
    }
    const notes = await lireMdblist(env, imdb, fetchImpl);
    if (!notes) return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
    return new Response(JSON.stringify(notes), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400", "Vercel-CDN-Cache-Control": "max-age=604800" },
    });
  };
}

export const GET = makeNotes();
