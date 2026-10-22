/**
 * /vf.json?v=movie/tt…,series/tt…:saison:1,… (réécrit vers /api/vf par vercel.json) : la VF des sources de
 * plusieurs titres en un seul appel, pour l'addon (Cloudflare ne lui laisse que 50 appels sortants par requête :
 * une page de rangée en fait déjà une quarantaine). Chaque titre est lu au relais /qualite/ du service, gardé un
 * jour au CDN : le même que pour les affiches, donc la même réponse partout.
 *   { "movie/tt…": { vf, sources } | null (pas lu : Torrentio en panne ou trop lent) }
 * Avec RELAIS_KEY, seul l'addon principal (qui envoie la clé, lib/relais.js) fait lire Torrentio : sinon, 40
 * identifiants au hasard par appel le feraient lire 40 fois. Sans la clé (les copies auto-hébergées, qui appellent
 * aussi ce service), la réponse ne contient que ce qui est déjà connu (mémoire, CDN de /qualite/) ; incomplète, elle
 * n'est pas gardée au CDN, pour ne pas servir ensuite des trous à l'addon principal (même adresse).
 */
import { qualityOf, qualiteConnue } from "../lib/qualite.js";
import { relaisRefuse } from "../lib/relais.js";

const ID = /^(movie\/tt\d{1,10}|series\/tt\d{1,10}:\d{1,3}:1)$/;
const MAX = 40;

export function makeVf({ fetchImpl = fetch, env = process.env } = {}) {
  return async function GET(request) {
    const url = new URL(request.url);
    const ids = [...new Set((url.searchParams.get("v") || "").split(",").filter((x) => ID.test(x)))].slice(0, MAX);
    if (!ids.length) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" } });
    }
    const sansCle = relaisRefuse(request, env);
    const lus = await Promise.all(ids.map(async (id) => {
      const [type, video] = id.split("/");
      const [imdb, saison] = video.split(":");
      const s = saison ? Number(saison) : null;
      const q = await (sansCle ? qualiteConnue(type, imdb, s, fetchImpl, url.origin) : qualityOf(type, imdb, s, fetchImpl, url.origin, env.RELAIS_KEY)).catch(() => null);
      // langue (« vostfr », « vo »…) : ce qu'on peut regarder sans VF, que la fiche de l'addon dit (« en VOSTFR »).
      return [id, q && typeof q.vf === "boolean" ? { vf: q.vf, sources: q.sources, ...(q.langue ? { langue: q.langue } : {}) } : null];
    }));
    const trou = lus.some(([, x]) => x === null);
    // Un titre pas lu : gardé dix minutes seulement, pour réessayer bientôt ; sans la clé, pas gardé du tout.
    const cache = sansCle && trou ? { "Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store" }
      : { "Cache-Control": `public, max-age=${trou ? 600 : 3600}`, "Vercel-CDN-Cache-Control": `max-age=${trou ? 600 : 3600}` };
    return new Response(JSON.stringify(Object.fromEntries(lus)), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", ...cache },
    });
  };
}

export const GET = makeVf();
