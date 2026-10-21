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
import { trendingRank, secondesAvantBascule } from "../lib/tendances.js";
import { qualityOf } from "../lib/qualite.js";
import { posterContent, contentKey } from "../lib/contenu.js";
import { etatSortie } from "../lib/statut.js";
import { lireReglages, lireReglagesPaysage, ecrireReglages } from "../lib/lien-affiches.js";
import { notesPlus } from "../lib/notes-plus.js";
import { draw, imageUrls } from "../lib/dessin.js";
import { sansTexte } from "../lib/texte.js";

// CDN : 3 jours, puis redessinée en arrière-plan (limite de calcul gratuite : 4 h par mois).
const OK_CACHE = { "Cache-Control": "public, max-age=604800", "Vercel-CDN-Cache-Control": "max-age=259200, stale-while-revalidate=604800" };
const COURT = { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=600" };

/**
 * Durées de cache d'une réponse. Une affiche classée ou presque (place sur la photo des tendances), ou avec un
 * statut (une date, « Nouveau »…), expire au changement de photo des tendances, dans l'appli comme au CDN :
 * son N° et sa date restent ceux du jour. Torrentio en retard : cache court, pour avoir le badge ensuite.
 */
function cacheDe({ enRetard, place, statut }) {
  const base = enRetard ? COURT : OK_CACHE;
  if (!place && !statut) return base;
  const s = secondesAvantBascule(), age = (h) => Number(/max-age=(\d+)/.exec(base[h])[1]);
  return { "Cache-Control": `public, max-age=${Math.min(age("Cache-Control"), s)}`, "Vercel-CDN-Cache-Control": `max-age=${Math.min(age("Vercel-CDN-Cache-Control"), s)}` };
}
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

/** La qualité, ou null si Torrentio n'a pas répondu à temps ou a échoué (enRetard : cache court, on réessaiera). */
function qualiteATemps(type, facts, fetchImpl, relais) {
  let timer;
  const delai = new Promise((ok) => { timer = setTimeout(() => ok({ enRetard: true, quality: null }), ATTENTE_QUALITE_MS); });
  const lue = qualityOf(type, facts.imdbId, facts.lastSeason, fetchImpl, relais).then((quality) => ({ enRetard: quality === null && !!facts.imdbId, quality }));
  return Promise.race([lue, delai])
    .finally(() => clearTimeout(timer));
}

/**
 * Forme normale des options d'un lien, dans l'ordre imdb, s, sp : imdb seulement s'il est valable (celui de
 * l'id pour un « tt… »), s dans sa forme canonique (lib/lien-affiches.js), absent si tout est par défaut ; sp
 * (réglages à part du paysage) seulement s'il diffère de s. Un imdb vide (Nuvio l'envoie ainsi quand il n'en a
 * pas) reste tel quel. Les anciens o et r sont convertis.
 */
function optionsNormales(q, id) {
  const p = new URLSearchParams();
  const imdb = q.get("imdb");
  if (imdb !== null) {
    if (imdb === "") p.set("imdb", "");
    else if (id.startsWith("tt")) p.set("imdb", id);
    else if (/^tt\d{1,10}$/.test(imdb)) p.set("imdb", imdb);
  }
  const s = ecrireReglages(lireReglages(q)), sp = ecrireReglages(lireReglagesPaysage(q));
  if (s) p.set("s", "1." + s);
  if (sp !== s) p.set("sp", "1." + sp);
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
    const reglages = shape === "landscape" ? lireReglagesPaysage(q) : lireReglages(q);
    const normales = optionsNormales(q, id);
    if (String(recues) !== normales) {
      return new Response(null, { status: 308, headers: { ...CORS, ...ABSENT, Location: `/${type}/${shape}/${id}.jpg${normales ? "?" + normales : ""}` } });
    }
    const tendance = reglages.tendance.on, qualite = reglages.qualite.on && env.QUALITE !== "off";
    // Note IMDb : pour la note affichée, ou pour le badge « Incontournable ».
    const noteImdb = (reglages.titre.on && reglages.note.on && reglages.note.source !== "tmdb") || reglages.infos.culte;
    // Les autres notes ne sont demandées que si elles seront dessinées (pas avec la note en grand chiffre).
    const autresNotes = reglages.titre.on && reglages.note.on && reglages.note.style !== "grand" && (reglages.note.rt || reglages.note.mc || reglages.note.lb);
    try {
      // Notes IMDb et tendances ne dépendent pas du titre : sur une instance qui démarre, on les charge
      // pendant que TMDB répond (elles sont ensuite gardées en mémoire).
      if (noteImdb) ratingOf("tt0", fetchImpl).catch(() => {});
      const relais = new URL(request.url).origin;
      if (tendance) trendingRank(env, type, 0, fetchImpl, relais).catch(() => {});
      let facts = await titleFacts(env, { type, id, imdb }, fetchImpl, { plateforme: reglages.plateforme.on, vo: reglages.titre.on && reglages.titre.langue === "vo", credits: reglages.titre.on && reglages.infos.ligne2 === "realisateur" });
      if (!facts) return absent();
      // L'image « sans texte » porte notre logo : on vérifie qu'elle n'a vraiment pas de texte (TMDB y range
      // parfois des affiches étrangères). Aucune de propre : l'affiche normale, sans logo ni ligne du bas.
      // L'image du film recadrée (réglage « Image ») vient des fonds, vérifiés de la même façon.
      if (reglages.titre.on) {
        const fond = shape === "landscape" || reglages.image.source === "fond";
        const [cle, liste] = fond ? ["textlessBackdrop", facts.textlessBackdrops] : ["textlessPoster", facts.textlessPosters];
        facts = { ...facts, [cle]: await sansTexte(liste, fetchImpl) };
      }
      // Les images ne dépendent que du titre : on les demande tout de suite (sauf pour une revérification
      // par ETag, qui finit presque toujours en 304 sans rien dessiner).
      const brouillon = posterContent(facts, {}, shape, reglages);
      if (!brouillon) return absent();
      const images = fetchImages(fetchImpl);
      const peutDessiner = brouillon.full || brouillon.statut || brouillon.gris || brouillon.bandeau || brouillon.coin || tendance || qualite;
      // Pas encore sorti avec la note cachée : les autres notes ne seraient pas dessinées non plus.
      const notesUtiles = autresNotes && !(reglages.sortie.cacherNote && !etatSortie(facts, new Date().toISOString().slice(0, 10)).sorti);
      if (peutDessiner && !request.headers.get("If-None-Match")) imageUrls(brouillon).forEach((u) => images(u).catch(() => {}));
      const [imdbRating, place, { enRetard: qualiteEnRetard, quality }, notes] = await Promise.all([
        noteImdb && facts.imdbId ? ratingOf(facts.imdbId, fetchImpl) : undefined,
        tendance ? trendingRank(env, type, facts.tmdbId, fetchImpl, relais) : null,
        qualite ? qualiteATemps(type, facts, fetchImpl, relais) : { enRetard: false, quality: null },
        notesUtiles && facts.imdbId ? notesPlus(facts.imdbId, fetchImpl, relais) : undefined,
      ]);
      // Notes des autres sites demandées mais pas lues (quota, panne) : cache court, pour les avoir ensuite.
      const enRetard = qualiteEnRetard || notes === null;
      const content = posterContent(facts, { imdbRating, rank: place, quality, notes }, shape, reglages);
      // Rien à poser ni à griser : l'appli va chercher l'image directement chez TMDB, sans la redessiner ici.
      const retouchee = !!(content.styles.retouche || content.styles.cadre);
      if (!content.full && !content.rank && !content.quality && !content.statut && !content.gris && !content.bandeau && !content.coin && !content.culte && !retouchee) {
        return new Response(null, { status: 302, headers: { ...CORS, ...cacheDe({ enRetard, place }), Location: imageUrls(content)[0] } });
      }
      const etag = `"${contentKey(content)}"`;
      // Classée, presque classée ou avec un statut : jusqu'au changement de photo des tendances (voir cacheDe).
      // Un bandeau qui porte le statut (une date) suit la même règle que le statut.
      const cache = cacheDe({ enRetard, place, statut: content.statut || (content.bandeau && reglages.bandeau.porte === "statut") });
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
