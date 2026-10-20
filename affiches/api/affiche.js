/**
 * /{type}/{shape}/{id}.jpg?imdb=… (réécrit vers /api/affiche par vercel.json) : l'affiche maison d'un titre.
 * Toute erreur répond par un code HTTP d'erreur : Nuvio montre alors l'affiche d'origine.
 * Caches : Nuvio garde l'image une semaine (puis revérifie l'ETag) ; le CDN de Vercel la garde un jour
 * et la redessine en arrière-plan ensuite, ce qui tient dans les limites de l'offre gratuite.
 * Vitesse : les images sont téléchargées pendant qu'on lit les notes et la qualité, et on n'attend pas
 * Torrentio plus d'1 s ; sans réponse, l'affiche part sans badge, avec un cache court pour l'avoir ensuite.
 */
import { titleFacts } from "../lib/tmdb.js";
import { ratingOf } from "../lib/notes.js";
import { trendingRank } from "../lib/tendances.js";
import { qualityOf } from "../lib/qualite.js";
import { posterContent, contentKey, optionsDe } from "../lib/contenu.js";
import { draw, imageUrls } from "../lib/dessin.js";

// CDN : 3 jours, puis redessinée en arrière-plan (limite de calcul gratuite : 4 h par mois).
const OK_CACHE = { "Cache-Control": "public, max-age=604800", "Vercel-CDN-Cache-Control": "max-age=259200, stale-while-revalidate=604800" };
const COURT = { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=600" };
const ABSENT = { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" };
const CORS = { "Access-Control-Allow-Origin": "*" };
const ATTENTE_QUALITE_MS = 1000;

const absent = () => new Response(null, { status: 404, headers: { ...CORS, ...ABSENT } });
const panne = () => new Response(null, { status: 502, headers: { ...CORS, "Cache-Control": "no-store" } });

/** fetch qui ne télécharge qu'une fois chaque image TMDB : une demande faite en avance resservira à draw(). */
function fetchImages(fetchImpl) {
  const vues = new Map();
  return (url, opts) => {
    const u = String(url);
    if (!u.startsWith("https://image.tmdb.org/")) return fetchImpl(url, opts);
    if (!vues.has(u)) {
      vues.set(u, fetchImpl(u, { signal: AbortSignal.timeout(3000) })
        .then(async (r) => ({ status: r.status, type: r.headers.get("Content-Type"), corps: r.ok ? await r.arrayBuffer() : null })));
    }
    return vues.get(u).then((x) => new Response(x.corps, { status: x.status, headers: x.type ? { "Content-Type": x.type } : {} }));
  };
}

/** La qualité, ou null si Torrentio n'a pas répondu à temps (enRetard dit lequel des deux). */
function qualiteATemps(type, facts, fetchImpl, relais) {
  let timer;
  const delai = new Promise((ok) => { timer = setTimeout(() => ok({ enRetard: true, quality: null }), ATTENTE_QUALITE_MS); });
  return Promise.race([qualityOf(type, facts.imdbId, facts.lastSeason, fetchImpl, relais).then((quality) => ({ enRetard: false, quality })), delai])
    .finally(() => clearTimeout(timer));
}

/**
 * Forme normale des options d'un lien, dans l'ordre imdb, o, r : imdb seulement s'il est valable (celui de
 * l'id pour un « tt… »), o avec les seules lettres connues dans l'ordre tqngal, r seulement pour « tmdb ».
 * Un imdb vide (Nuvio l'envoie ainsi quand il n'en a pas) reste tel quel.
 */
function optionsNormales(q, id) {
  const p = new URLSearchParams();
  const imdb = q.get("imdb");
  if (imdb !== null) {
    if (imdb === "") p.set("imdb", "");
    else if (id.startsWith("tt")) p.set("imdb", id);
    else if (/^tt\d{1,10}$/.test(imdb)) p.set("imdb", imdb);
  }
  const o = "tqngal".split("").filter((k) => (q.get("o") || "").includes(k)).join("");
  if (o) p.set("o", o);
  // Note coupée : sa source ne change rien à l'affiche.
  if (q.get("r") === "tmdb" && !o.includes("n")) p.set("r", "tmdb");
  return String(p);
}

export function makeHandler({ fetchImpl = fetch, env = process.env } = {}) {
  return async function GET(request) {
    const q = new URL(request.url).searchParams;
    const type = q.get("type"), shape = q.get("shape"), id = q.get("id") || "";
    const imdb = /^tt\d{1,10}$/.test(q.get("imdb") || "") ? q.get("imdb") : "";
    if (!["movie", "series"].includes(type) || !["poster", "landscape"].includes(shape) || !/^(tt\d{1,10}|tmdb:\d{1,10})$/.test(id)) return absent();
    // Un lien bricolé (paramètre en trop, lettres dans le désordre…) ferait dessiner une copie de plus de la
    // même affiche : on le renvoie, sans rien dessiner, vers sa forme normale (Nuvio suit les redirections).
    const recues = new URLSearchParams([...q].filter(([k]) => !["type", "shape", "id"].includes(k)));
    const normales = optionsNormales(q, id);
    if (String(recues) !== normales) {
      return new Response(null, { status: 308, headers: { ...CORS, ...ABSENT, Location: `/${type}/${shape}/${id}.jpg${normales ? "?" + normales : ""}` } });
    }
    const opts = optionsDe(q);
    const noteImdb = opts.n && opts.r !== "tmdb", qualite = opts.q && env.QUALITE !== "off";
    try {
      // Notes IMDb et tendances ne dépendent pas du titre : sur une instance qui démarre, on les charge
      // pendant que TMDB répond (elles sont ensuite gardées en mémoire).
      if (noteImdb) ratingOf("tt0", fetchImpl).catch(() => {});
      if (opts.t) trendingRank(env, type, 0, fetchImpl).catch(() => {});
      const facts = await titleFacts(env, { type, id, imdb }, fetchImpl);
      if (!facts) return absent();
      // Les images ne dépendent que du titre : on les demande tout de suite (sauf pour une revérification
      // par ETag, qui finit presque toujours en 304 sans rien dessiner).
      const brouillon = posterContent(facts, {}, shape, opts);
      if (!brouillon) return absent();
      const images = fetchImages(fetchImpl);
      const peutDessiner = brouillon.full || opts.t || qualite;
      if (peutDessiner && !request.headers.get("If-None-Match")) imageUrls(brouillon).forEach((u) => images(u).catch(() => {}));
      const relais = new URL(request.url).origin;
      const [imdbRating, rank, { enRetard, quality }] = await Promise.all([
        noteImdb && facts.imdbId ? ratingOf(facts.imdbId, fetchImpl) : undefined,
        opts.t ? trendingRank(env, type, facts.tmdbId, fetchImpl) : null,
        qualite ? qualiteATemps(type, facts, fetchImpl, relais) : { enRetard: false, quality: null },
      ]);
      const content = posterContent(facts, { imdbRating, rank, quality }, shape, opts);
      // Rien à poser sur l'image : l'appli va la chercher directement chez TMDB, sans la redessiner ici.
      if (!content.full && !content.rank && !content.quality) {
        return new Response(null, { status: 302, headers: { ...CORS, ...(enRetard ? COURT : OK_CACHE), Location: imageUrls(content)[0] } });
      }
      const etag = `"${contentKey(content)}"`;
      // Une affiche classée revérifiée chaque jour par l'appli : son « N° » suit le classement.
      const cache = enRetard ? COURT : content.rank ? { ...OK_CACHE, "Cache-Control": "public, max-age=86400" } : OK_CACHE;
      const headers = { ...CORS, ...cache, ETag: etag };
      if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
      const jpg = await draw(content, images);
      return new Response(jpg, { status: 200, headers: { ...headers, "Content-Type": "image/jpeg" } });
    } catch (e) {
      console.error(`affiche ${type}/${shape}/${id} : ${e && e.message}`);
      return panne();
    }
  };
}

export const GET = makeHandler();
