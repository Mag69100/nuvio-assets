/**
 * /{type}/{shape}/{id}.jpg?imdb=… (réécrit vers /api/affiche par vercel.json) : l'affiche maison d'un titre.
 * TMDB injoignable : erreur 502, et Nuvio montre l'affiche d'origine ; dessin impossible (logo cassé…) : redirection
 * vers l'affiche d'origine chez TMDB, gardée une heure.
 * Caches : Nuvio garde l'image une semaine (puis revérifie l'ETag) ; le CDN de Vercel aussi, et la redessine en
 * arrière-plan ensuite, ce qui tient dans les limites de l'offre gratuite.
 * Vitesse : les images sont téléchargées pendant qu'on lit les notes et la qualité, et on n'attend pas
 * Torrentio plus d'1 s ; sans réponse, l'affiche part sans badge, avec un cache court pour l'avoir ensuite. De même
 * sans le fichier des notes IMDb (pas attendu plus d'1,5 s), sans photo des tendances, ou si une image sans texte n'a
 * pas pu être vérifiée : une donnée qui manque pour une panne passagère n'est jamais gardée des jours.
 */
import { titleFacts } from "../lib/tmdb.js";
import { lireNoteImdb } from "../lib/notes.js";
import { lireRang, secondesAvantBascule } from "../lib/tendances.js";
import { qualityOf } from "../lib/qualite.js";
import { posterContent, contentKey } from "../lib/contenu.js";
import { etatSortie, sourcesUtiles, LIBELLES_FIN } from "../lib/statut.js";
import { lireReglages, lireReglagesPaysage, ecrireReglages } from "../lib/lien-affiches.js";
import { notesPlus } from "../lib/notes-plus.js";
import { filmsDeLaSaga, rangSaga } from "../lib/saga.js";
import { lireSaison, habillageDe, saisonDu, secondesAvantChangementSaison } from "../lib/saison.js";
import { draw, imageUrls } from "../lib/dessin.js";
import { choisirSansTexte } from "../lib/texte.js";
import { jourParis, secondesAvantMinuitParis, secondesAvantJourParis } from "../lib/jour.js";
import { disjoncteurDe } from "../lib/disjoncteur.js";

// CDN : 7 jours, comme l'appli, puis redessinée en arrière-plan (limite de calcul gratuite : 4 h par mois). Une
// affiche sans statut ni N° ne change qu'avec sa note (fichier IMDb de la semaine) ou son badge 4K : quelques jours
// de retard au plus, pour deux fois moins de dessins qu'avec 3 jours. Le service en panne (erreur 5xx) : le CDN
// ressert l'ancienne un jour de plus (stale-if-error).
const OK_CACHE = { "Cache-Control": "public, max-age=604800", "Vercel-CDN-Cache-Control": "max-age=604800, stale-while-revalidate=604800, stale-if-error=86400" };
// Cache court (une donnée en retard) : redessinée 10 min plus tard, l'ancienne servie pendant ce temps.
const COURT = { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=600, stale-while-revalidate=3600" };

/**
 * Durées de cache d'une réponse. Une affiche classée ou presque (place sur la photo des tendances), ou avec un
 * statut (une date, « Nouveau »…), expire au changement de photo des tendances, dans l'appli comme au CDN :
 * son N° et sa date restent ceux du jour. Un statut expire aussi à minuit à Paris (« DEMAIN » devient
 * « AUJOURD'HUI »). Une donnée en retard (Torrentio pas encore lu…) : cache court, pour l'avoir ensuite.
 * Au CDN, la première demande après l'expiration reçoit encore l'ancienne pendant qu'on la redessine (une heure au plus).
 * jusqua (secondes, facultatif) : une autre échéance (prochain épisode d'une série avec sa barre d'avancement…).
 */
function cacheDe({ enRetard, place, statut, jusqua }) {
  const base = enRetard ? COURT : OK_CACHE;
  if (!place && !statut && !jusqua) return base;
  const s = Math.min(...(place || statut ? [statut ? Math.min(secondesAvantBascule(), secondesAvantMinuitParis()) : secondesAvantBascule()] : []), ...(jusqua ? [jusqua] : []));
  const age = (h) => Number(/max-age=(\d+)/.exec(base[h])[1]);
  return { "Cache-Control": `public, max-age=${Math.min(age("Cache-Control"), s)}`,
    "Vercel-CDN-Cache-Control": `max-age=${Math.min(age("Vercel-CDN-Cache-Control"), s)}, stale-while-revalidate=3600${enRetard ? "" : ", stale-if-error=86400"}` };
}
const lendemain = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(Date.parse(iso) + 86400000).toISOString().slice(0, 10) : "");
const ABSENT = { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" };
// Redirection vers la forme normale d'un lien : elle ne change qu'avec une mise en ligne, qui vide le cache de toute façon.
const CANONIQUE = { "Cache-Control": "public, max-age=604800", "Vercel-CDN-Cache-Control": "max-age=604800" };
// Trop de dessins en ce moment (lib/disjoncteur.js) : l'affiche d'origine, redemandée dans 10 minutes.
const SURCHARGE = { "Cache-Control": "public, max-age=600", "Vercel-CDN-Cache-Control": "max-age=600" };
// Dessin impossible (logo cassé, SVG illisible) : l'affiche d'origine, redemandée dans une heure.
const SECOURS = { "Cache-Control": "public, max-age=3600", "Vercel-CDN-Cache-Control": "max-age=3600" };
const CORS = { "Access-Control-Allow-Origin": "*" };
const ATTENTE_QUALITE_MS = 1000;
// Fichier des notes IMDb pas encore lu (instance qui démarre) : pas attendu plus longtemps (il peut prendre 8 s).
const ATTENTE_NOTES_MS = 1500;

const absent = () => new Response(null, { status: 404, headers: { ...CORS, ...ABSENT } });
const panne = () => new Response(null, { status: 502, headers: { ...CORS, "Cache-Control": "no-store" } });
/** L'affiche (ou le fond) d'origine du titre chez TMDB, aux tailles de dessin.js ; null s'il n'en a pas. */
const imageOrigine = (facts, shape) => {
  const chemin = shape === "landscape" ? facts.backdrop : facts.poster;
  return chemin ? `https://image.tmdb.org/t/p/${shape === "landscape" ? "w780" : "w500"}${chemin}` : null;
};
/** Redirection vers l'affiche d'origine, gardée le temps donné (en-têtes de cache). */
const versOrigine = (url, cache) => new Response(null, { status: 302, headers: { ...CORS, ...cache, Location: url } });

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

/**
 * La qualité, ou null si Torrentio n'a pas répondu à temps ou a échoué. En retard (la lecture continue : elle sera
 * gardée par le relais et l'instance) : cache court, pour avoir le badge ensuite. En échec (Torrentio en panne, le
 * relais le garde 30 min) : cache normal sans badge, sinon chaque affiche serait redessinée toutes les 10 minutes
 * pendant toute la panne.
 */
function qualiteATemps(type, facts, fetchImpl, relais, cle) {
  let timer;
  const delai = new Promise((ok) => { timer = setTimeout(() => ok({ enRetard: true, quality: null }), ATTENTE_QUALITE_MS); });
  const lue = qualityOf(type, facts.imdbId, facts.lastSeason, fetchImpl, relais, cle).then((quality) => ({ enRetard: false, quality }));
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
  const disjoncteur = disjoncteurDe(env);
  let dernierAvis = 0;
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
      return new Response(null, { status: 308, headers: { ...CORS, ...CANONIQUE, Location: `/${type}/${shape}/${id}.jpg${normales ? "?" + normales : ""}` } });
    }
    const tendance = reglages.tendance.on, qualite = reglages.qualite.on && env.QUALITE !== "off";
    // Langue des sources (réglage Langue) : lue avec la qualité, chez Torrentio.
    const langue = reglages.langue.on && env.QUALITE !== "off";
    // Note IMDb : pour la note affichée, ou pour le badge « Incontournable ».
    const noteImdb = (reglages.titre.on && reglages.note.on && reglages.note.source !== "tmdb") || reglages.infos.culte;
    // Les autres notes ne sont demandées que si elles seront dessinées (pas avec la note en grand chiffre).
    const autresNotes = reglages.titre.on && reglages.note.on && reglages.note.style !== "grand" && (reglages.note.rt || reglages.note.mc || reglages.note.lb);
    try {
      // Notes IMDb et tendances ne dépendent pas du titre : sur une instance qui démarre, on les charge
      // pendant que TMDB répond (elles sont ensuite gardées en mémoire).
      if (noteImdb) lireNoteImdb("tt0", fetchImpl, 0).catch(() => {});
      const relais = new URL(request.url).origin;
      if (tendance) lireRang(env, type, 0, fetchImpl, relais).catch(() => {});
      let facts = await titleFacts(env, { type, id, imdb }, fetchImpl, { plateforme: reglages.plateforme.on, vo: reglages.titre.on && reglages.titre.langue === "vo", credits: reglages.titre.on && reglages.infos.ligne2 === "realisateur" });
      if (!facts) return absent();
      // Trop de dessins sur cette instance (robot, liens au hasard) : l'affiche d'origine, sans rien analyser ni
      // dessiner, redemandée dans 10 minutes. Mieux vaut des affiches nues un moment qu'un service coupé 30 jours.
      if (disjoncteur.plein()) {
        const origine = imageOrigine(facts, shape);
        if (origine) {
          if (Date.now() - dernierAvis > 60000) { dernierAvis = Date.now(); console.warn("disjoncteur : trop de dessins, affiches d'origine pour l'instant"); }
          return versOrigine(origine, SURCHARGE);
        }
      }
      // L'image « sans texte » porte notre logo : on vérifie qu'elle n'a vraiment pas de texte (TMDB y range
      // parfois des affiches étrangères). Aucune de propre : l'affiche normale, sans logo ni ligne du bas.
      // L'image du film recadrée (réglage « Image ») vient des fonds, vérifiés de la même façon.
      // Une candidate pas lue (panne passagère) : le choix peut changer, cache court.
      let imageIncertaine = false;
      if (reglages.titre.on) {
        const fond = shape === "landscape" || reglages.image.source === "fond";
        const [cle, liste] = fond ? ["textlessBackdrop", facts.textlessBackdrops] : ["textlessPoster", facts.textlessPosters];
        const { chemin, incertain } = await choisirSansTexte(liste, fetchImpl);
        facts = { ...facts, [cle]: chemin };
        imageIncertaine = incertain;
      }
      // Le jour à Paris, le même pour tout le calcul (statut, sources utiles).
      const aujourdhui = jourParis();
      // Les images ne dépendent que du titre : on les demande tout de suite (sauf pour une revérification
      // par ETag, qui finit presque toujours en 304 sans rien dessiner).
      const brouillon = posterContent(facts, {}, shape, reglages, aujourdhui);
      // Les sources (lues avec la qualité) disent si le titre est en VF : lues aussi sans le badge, pour un titre récent.
      const lireSources = qualite || langue || (env.QUALITE !== "off" && sourcesUtiles(facts, aujourdhui));
      if (!brouillon) return absent();
      const images = fetchImages(fetchImpl);
      const peutDessiner = brouillon.full || brouillon.statut || brouillon.gris || brouillon.bandeau || brouillon.coin || tendance || qualite || langue
        || reglages.infos.culte || reglages.infos.saga || !!brouillon.styles.retouche || !!brouillon.styles.cadre || (reglages.saison.on && type === "movie");
      // Pas encore sorti avec la note cachée : les autres notes ne seraient pas dessinées non plus.
      const notesUtiles = autresNotes && !(reglages.sortie.cacherNote && !etatSortie(facts, aujourdhui).sorti);
      if (peutDessiner && !request.headers.get("If-None-Match")) imageUrls(brouillon).forEach((u) => images(u).catch(() => {}));
      // Rang dans la saga (réglage Saga) : les films de sa collection TMDB, un appel par saga gardé une semaine.
      const sagaVoulue = reglages.infos.saga && type === "movie" && !!facts.collection;
      // Habillage de la saison (réglage Saison) : pendant une fête, les films de la rangée « Spécial … » de l'addon.
      const saisonVoulue = reglages.saison.on && type === "movie" && !!saisonDu(aujourdhui);
      const [{ note: imdbRating, manque: imdbManque }, { rang: place, illisible: photoIllisible }, { enRetard: qualiteEnRetard, quality }, notes, filmsSaga, rangee] = await Promise.all([
        noteImdb && facts.imdbId ? lireNoteImdb(facts.imdbId, fetchImpl, ATTENTE_NOTES_MS) : { note: undefined, manque: false },
        tendance ? lireRang(env, type, facts.tmdbId, fetchImpl, relais) : { rang: null, illisible: false },
        lireSources ? qualiteATemps(type, facts, fetchImpl, relais, env.RELAIS_KEY) : { enRetard: false, quality: null },
        notesUtiles && facts.imdbId ? notesPlus(facts.imdbId, fetchImpl, relais, env.RELAIS_KEY) : undefined,
        sagaVoulue ? filmsDeLaSaga(env, facts.collection, fetchImpl) : null,
        saisonVoulue ? lireSaison(env, fetchImpl) : null,
      ]);
      const saga = sagaVoulue ? rangSaga(filmsSaga, facts.tmdbId, aujourdhui) : null;
      // Une donnée qui manque pour une panne passagère (fichier IMDb pas lu : note TMDB en attendant ; photo des
      // tendances illisible : pas de N° ; image sans texte pas vérifiée) : cache court, pour l'avoir ensuite.
      // Notes des autres sites demandées mais pas lues (quota, panne) : cache normal sans elles (le relais garde
      // l'échec une heure ; un cache court ferait redessiner sans fin pendant toute la panne).
      // Saga ou rangée de saison demandées mais pas lues (TMDB ou l'addon en panne) : cache court aussi.
      const enRetard = qualiteEnRetard || imdbManque || photoIllisible || imageIncertaine || (sagaVoulue && !filmsSaga) || (saisonVoulue && !rangee);
      const saison = saisonVoulue ? habillageDe(rangee, facts.tmdbId, aujourdhui) : null;
      const content = posterContent(facts, { imdbRating, rank: place, quality, notes, saga, saison }, shape, reglages, aujourdhui);
      // Réglage Saison, sur un film : habillé, jusqu'à minuit (la rangée change, la fête finit à minuit) ; pas habillé,
      // jusqu'au prochain changement de fête (pour être habillé dès qu'elle commence), redirection comprise.
      const finSaison = reglages.saison.on && type === "movie" ? (content.saison ? secondesAvantMinuitParis() : secondesAvantChangementSaison()) : undefined;
      // Rien à poser ni à griser : l'appli va chercher l'image directement chez TMDB, sans la redessiner ici.
      const retouchee = !!(content.styles.retouche || content.styles.cadre);
      if (!content.full && !content.rank && !content.quality && !content.statut && !content.gris && !content.bandeau && !content.coin && !content.culte && !retouchee
        && !content.langue && !content.avance && !content.saga && !content.saison) {
        return new Response(null, { status: 302, headers: { ...CORS, ...cacheDe({ enRetard, place, jusqua: finSaison }), Location: imageUrls(content)[0] } });
      }
      const etag = `"${contentKey(content)}"`;
      // Classée, presque classée ou avec un statut : jusqu'au changement de photo des tendances (voir cacheDe).
      // Un bandeau qui porte le statut (une date) suit la même règle que le statut.
      // « Nouvel épisode » allumé sur une série : revérifiée chaque jour aussi, pour l'afficher le jour même.
      // « TERMINÉE », « ANNULÉE » ne changent pas avec le jour : pas revérifiées chaque jour pour elles.
      const fixe = (x) => LIBELLES_FIN.includes(x);
      const suitLeCalendrier = (content.statut && !fixe(content.statut)) || (content.bandeau && reglages.bandeau.porte === "statut" && !fixe(content.bandeau.texte))
        || (type === "series" && reglages.statut.on && reglages.statut.episode);
      // Barre d'avancement d'une série : jusqu'au lendemain de son prochain épisode (date connue de TMDB).
      const avance = content.avance && facts.nextEpisode ? secondesAvantJourParis(lendemain(facts.nextEpisode)) : undefined;
      const jusqua = avance && finSaison ? Math.min(avance, finSaison) : avance || finSaison;
      const cache = cacheDe({ enRetard, place, statut: suitLeCalendrier, jusqua });
      const headers = { ...CORS, ...cache, ETag: etag };
      if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
      let jpg;
      disjoncteur.compte();
      try {
        jpg = await draw(content, images);
      } catch (e) {
        // Dessin impossible (logo introuvable ou illisible, SVG cassé…) : l'affiche d'origine, qui porte le titre,
        // gardée une heure (une erreur 502 n'est jamais gardée : chaque demande redessinerait).
        console.error(`dessin ${type}/${shape}/${id} : ${e && e.message}`);
        const origine = imageOrigine(facts, shape);
        if (!origine) throw e;
        return versOrigine(origine, SECOURS);
      }
      return new Response(jpg, { status: 200, headers: { ...headers, "Content-Type": "image/jpeg" } });
    } catch (e) {
      console.error(`affiche ${type}/${shape}/${id} : ${e && e.message}`);
      return panne();
    }
  };
}

export const GET = makeHandler();
