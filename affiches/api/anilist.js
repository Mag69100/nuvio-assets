/**
 * /anilist.json?q=… (réécrit vers /api/anilist par vercel.json) : relais de la recherche de secours de l'addon dans
 * AniList (worker/anilist.js). AniList refuse (403) toutes les demandes qui viennent de Cloudflare : l'addon passe
 * par ici. La réponse d'AniList (animes et personnages, data.a et data.c) est rendue telle quelle, gardée 7 jours au
 * CDN (1 jour sans rien trouvé). Requête déjà réduite par l'addon (minuscules, sans accents ni ponctuation, 4 à 60
 * caractères) : une autre écriture est refusée, pour ne pas faire varier l'adresse. Avec RELAIS_KEY, seul l'addon
 * fait lire une recherche pas encore au CDN (lib/relais.js) : AniList n'accepte que 30 demandes par minute.
 */
import { relaisRefuse, refusRelais } from "../lib/relais.js";

const ANILIST = "https://graphql.anilist.co";
const DELAI_MS = 2500;
const REQUETE = /^[a-z0-9]+(?: [a-z0-9]+){0,5}$/;

const QUERY = `query($s:String){
  a: Page(perPage:6){ media(search:$s, type:ANIME, sort:SEARCH_MATCH){ title{romaji english} synonyms format startDate{year} popularity } }
  c: Page(perPage:4){ characters(search:$s, sort:SEARCH_MATCH){ name{full alternative} favourites
    media(perPage:3, sort:POPULARITY_DESC, type:ANIME){ nodes{ title{romaji english} format startDate{year} popularity } } } }
}`;

const garde = (s) => ({ "Content-Type": "application/json", "Cache-Control": `public, max-age=${s}`, "Vercel-CDN-Cache-Control": `max-age=${s}` });

export function makeAnilist({ fetchImpl = fetch, env = process.env } = {}) {
  return async function GET(request) {
    const q = new URL(request.url).searchParams.get("q") || "";
    if (q.length < 4 || q.length > 60 || !REQUETE.test(q)) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" } });
    }
    if (relaisRefuse(request, env)) return refusRelais();
    let res;
    try {
      res = await fetchImpl(ANILIST, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: QUERY, variables: { s: q } }), signal: AbortSignal.timeout(DELAI_MS),
      });
    } catch {
      res = null;
    }
    // Panne ou refus (429 : quota) : { erreur } gardé une minute seulement (le CDN de Vercel ne garde pas une 503).
    if (!res || !res.ok) return new Response(JSON.stringify({ erreur: res ? res.status : "panne" }), { headers: garde(60) });
    const data = ((await res.json().catch(() => null)) || {}).data;
    if (!data) return new Response(JSON.stringify({ erreur: "réponse vide" }), { headers: garde(60) });
    const vide = !((data.a && data.a.media) || []).length && !((data.c && data.c.characters) || []).length;
    return new Response(JSON.stringify({ data }), { headers: garde(vide ? 86400 : 7 * 86400) });
  };
}

export const GET = makeAnilist();
