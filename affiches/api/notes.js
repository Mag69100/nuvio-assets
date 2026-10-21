/**
 * /notes/{tt…}.json (réécrit vers /api/notes par vercel.json) : les notes Rotten Tomatoes, Metacritic et
 * Letterboxd d'un titre, lues chez MDBList et gardées 7 jours par le CDN de Vercel (le quota MDBList est par jour).
 * Avec RELAIS_KEY, seul le service fait lire une adresse pas encore au CDN (lib/relais.js).
 */
import { lireMdblist } from "../lib/notes-plus.js";
import { relaisRefuse, refusRelais } from "../lib/relais.js";

export function makeNotes({ fetchImpl = fetch, env = process.env } = {}) {
  return async function GET(request) {
    const imdb = new URL(request.url).searchParams.get("imdb") || "";
    if (!/^tt\d{1,10}$/.test(imdb)) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" } });
    }
    // Sans clé (MDBList pas encore configuré) : « aucune note », gardé 1 h, pour ne pas redessiner sans fin.
    if (!env.MDBLIST_API_KEY) {
      return new Response(JSON.stringify({ rt: null, mc: null, lb: null }), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" } });
    }
    if (relaisRefuse(request, env)) return refusRelais();
    const notes = await lireMdblist(env, imdb, fetchImpl);
    // Panne ou quota : { erreur: true } gardé une heure, pour qu'une rafale de demandes ne vide pas le quota (le CDN
    // de Vercel ne garde jamais une 503, même avec Vercel-CDN-Cache-Control).
    if (!notes) {
      return new Response(JSON.stringify({ erreur: true }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" },
      });
    }
    return new Response(JSON.stringify(notes), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400", "Vercel-CDN-Cache-Control": "max-age=604800, stale-if-error=86400" },
    });
  };
}

export const GET = makeNotes();
