/**
 * /vf.json?v=movie/tt…,series/tt…:saison:1,… (réécrit vers /api/vf par vercel.json) : la VF des sources de
 * plusieurs titres en un seul appel, pour l'addon (Cloudflare ne lui laisse que 50 appels sortants par requête :
 * une page de rangée en fait déjà une quarantaine). Chaque titre est lu au relais /qualite/ du service, gardé un
 * jour au CDN : le même que pour les affiches, donc la même réponse partout.
 *   { "movie/tt…": { vf, sources } | null (pas lu : Torrentio en panne ou trop lent) }
 * Avec RELAIS_KEY, une liste pas encore au CDN n'est lue que pour l'addon, qui envoie la clé (lib/relais.js) : sinon,
 * 40 identifiants au hasard par appel feraient lire Torrentio 40 fois.
 */
import { qualityOf } from "../lib/qualite.js";
import { relaisRefuse, refusRelais } from "../lib/relais.js";

const ID = /^(movie\/tt\d{1,10}|series\/tt\d{1,10}:\d{1,3}:1)$/;
const MAX = 40;

export function makeVf({ fetchImpl = fetch, env = process.env } = {}) {
  return async function GET(request) {
    const url = new URL(request.url);
    const ids = [...new Set((url.searchParams.get("v") || "").split(",").filter((x) => ID.test(x)))].slice(0, MAX);
    if (!ids.length) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" } });
    }
    if (relaisRefuse(request, env)) return refusRelais();
    const lus = await Promise.all(ids.map(async (id) => {
      const [type, video] = id.split("/");
      const [imdb, saison] = video.split(":");
      const q = await qualityOf(type, imdb, saison ? Number(saison) : null, fetchImpl, url.origin, env.RELAIS_KEY).catch(() => null);
      return [id, q && typeof q.vf === "boolean" ? { vf: q.vf, sources: q.sources } : null];
    }));
    // Un titre pas lu : gardé dix minutes seulement, pour réessayer bientôt.
    const age = lus.some(([, x]) => x === null) ? 600 : 3600;
    return new Response(JSON.stringify(Object.fromEntries(lus)), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": `public, max-age=${age}`, "Vercel-CDN-Cache-Control": `max-age=${age}` },
    });
  };
}

export const GET = makeVf();
