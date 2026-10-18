/**
 * Recherche par IA (Gemini), en renfort de la recherche classique (search.js).
 *
 * Gemini ne sert que quand la requête décrit un titre au lieu de le nommer (« le film où un mec
 * revit la même journée », « la série avec le prof de chimie qui fait de la drogue ») ou quand la
 * recherche classique ne trouve rien qui ressemble. Il propose des titres (titre original + année),
 * chacun est retrouvé dans TMDB, et ce que TMDB ne connaît pas est écarté : aucun titre inventé.
 *   - un film d'une saga amène toute la saga, d'après TMDB et dans l'ordre (« jouets vivants » →
 *     Toy Story 1 à 5, même les suites trop récentes pour Gemini) ;
 *   - une seule question pour les films et les séries (les deux catalogues de recherche) ;
 *   - réponse gardée 30 jours dans le cache Cloudflare : la même requête ne coûte qu'une fois ;
 *   - Gemini trop lent : la recherche classique seule cette fois-ci, mais Gemini finit en arrière-plan
 *     et la même recherche, refaite, a sa réponse tout de suite. En panne ou à court de quota : la
 *     recherche classique seule, comme avant.
 *   - plusieurs modèles : chacun a son propre quota gratuit ; un modèle à court de quota ou
 *     surchargé passe la main au suivant (et reste au repos quelques minutes).
 * Secret facultatif : GEMINI_API_KEY (sans lui, rien ne change). Variable facultative : GEMINI_MODEL
 * (modèle à essayer en premier).
 */
import { norm, scoreOf, isExact } from "./search.js";

// Dans l'ordre : Flash-Lite répond en 1 à 2 s avec de bons titres ; 3.6 Flash en 3 s. 3.8 Flash,
// un peu meilleur, met jusqu'à 6 s et sature souvent : pas retenu.
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
const ATTEMPT_MS = 5000;            // un modèle qui ne répond pas en 5 s passe la main au suivant
export const AI_WAIT_MS = 6000;     // attente maximale d'une réponse de Gemini pendant une recherche
const CACHE_S = 30 * 86400;
const MATCH = 0.75;                 // ressemblance minimale entre le titre proposé et la fiche TMDB

// Mots qui racontent un titre ou une envie au lieu de le nommer (« où », « qui », « un mec », « glauque »…).
const CUES = /\b(ou|qui|que|quand|avec|dans|pendant|apres|contre|mec|gars|type|meuf|fille|femme|homme|enfant|gamin|famille|histoire|parle|raconte|ressemble|comme|genre|style|ambiance|similaire|bien|tres|trop|thriller|comedie|horreur|drame|romantique|coreen|japonais|triste|drole|flippant|glauque|where|who|about|with|like)\b/;

/** La requête ressemble à une description (au moins 3 mots, dont un mot de récit). */
export function looksDescriptive(query) {
  const q = norm(query);
  return q.split(" ").length >= 3 && CUES.test(q);
}

const PROMPT = `Tu aides à retrouver des films et des séries à partir de ce qu'un utilisateur français tape dans une barre de recherche : une description (« le film où un homme revit la même journée »), un souvenir flou, une scène, une ambiance, un acteur, ou un titre mal écrit.
Réponds avec les titres qui correspondent le mieux, du plus probable au moins probable, 15 au maximum :
- title : le titre original exact s'il s'écrit en alphabet latin, sinon le titre anglais international ;
- title_fr : le titre français s'il existe, sinon le même que title ;
- year : l'année de sortie (pour une série : l'année de la première saison) ;
- type : "film" ou "serie".
Chaque détail de la requête compte : nationalité des personnages ou du film, pays, lieu, époque, métier, objet, situation. L'œuvre recherchée est celle qui réunit TOUS ces détails, même si elle est peu connue ou indépendante : elle passe avant une œuvre célèbre qui n'en réunit qu'une partie (« une japonaise part chercher un trésor aux états-unis » → Kumiko, the Treasure Hunter, pas Indiana Jones).
Si la requête désigne une œuvre précise, mets-la en premier, puis ajoute des œuvres proches (même sujet, même genre) : donne toujours au moins 8 titres quand c'est possible. Si elle décrit une envie (« un thriller coréen glauque »), propose les titres les plus réputés qui correspondent.
Pour une saga, ne cite qu'un film : celui qui correspond le mieux, sinon le premier. Les autres films de la saga sont ajoutés automatiquement : garde tes places pour d'autres œuvres.
Pense aux films comme aux séries : un même sujet peut avoir les deux (dessins animés, adaptations, séries dérivées).
Ne propose que des œuvres qui existent vraiment. Si rien ne correspond, renvoie une liste vide.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    titles: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" }, title_fr: { type: "STRING" },
          year: { type: "INTEGER" }, type: { type: "STRING", enum: ["film", "serie"] },
        },
        required: ["title", "title_fr", "year", "type"],
      },
    },
  },
  required: ["titles"],
};

// Niveau de réflexion le plus bas accepté par le modèle (« minimal » n'existe pas sur 3.8 Flash).
const thinkingOf = (model) => (/3\.8-flash/.test(model) ? "low" : "minimal");

async function askGemini(env, query, model, thinking) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT }] },
      contents: [{ role: "user", parts: [{ text: query }] }],
      generationConfig: {
        temperature: 0.2, responseMimeType: "application/json", responseSchema: SCHEMA,
        thinkingConfig: { thinkingLevel: thinking || thinkingOf(model) },
      },
    }),
    signal: AbortSignal.timeout(ATTEMPT_MS),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`${res.status} ${((j.error || {}).message || "").slice(0, 200)}`), { status: res.status });
  }
  const j = await res.json();
  const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
  const text = parts.filter((p) => !p.thought).map((p) => p.text || "").join("");
  const titles = (JSON.parse(text || "{}").titles || []).filter((t) => t && t.title);
  return titles.slice(0, 15);
}

// Les deux catalogues (Films, Séries) posent la même question en même temps : une seule part.
const PENDING = new Map();
// Modèle → moment où on peut le solliciter de nouveau (quota épuisé : 10 min ; surchargé : 1 min).
const RESTING = new Map();
const restFor = (status) => (status === 429 ? 10 * 60e3 : status >= 500 || !status ? 60e3 : 0);

/** Modèles à essayer, dans l'ordre ; ceux au repos sont sautés (sauf s'ils le sont tous). */
function modelsFor(env, forced) {
  if (forced) return [forced];
  const all = env.GEMINI_MODEL ? [env.GEMINI_MODEL, ...MODELS.filter((m) => m !== env.GEMINI_MODEL)] : MODELS;
  const ready = all.filter((m) => !(RESTING.get(m) > Date.now()));
  return ready.length ? ready : all;
}

/**
 * Titres proposés par Gemini pour une requête → { titles, cached, ms, model, tried, error }.
 * Ne lève jamais d'erreur : en cas de souci, titles est vide et error dit pourquoi.
 * opts.model → un seul modèle, imposé ; opts.thinking → niveau de réflexion ; opts.fresh → sans le
 * cache (diagnostic).
 */
export function aiTitles(env, ctx, query, opts = {}) {
  const key = new Request(`https://cache.local/ai/v3/${encodeURIComponent(norm(query))}`);
  if (PENDING.has(key.url) && !opts.model) return PENDING.get(key.url);
  const start = Date.now();
  const job = (async () => {
    const hit = opts.fresh ? null : await caches.default.match(key);
    if (hit) return { titles: await hit.json(), cached: true, ms: Date.now() - start };
    const tried = [];
    for (const model of modelsFor(env, opts.model)) {
      try {
        const titles = await askGemini(env, query, model, opts.thinking);
        await caches.default.put(key, new Response(JSON.stringify(titles), {
          headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CACHE_S}` },
        }));
        return { titles, cached: false, ms: Date.now() - start, model, tried };
      } catch (e) {
        tried.push(`${model} : ${e.name === "TimeoutError" ? "pas de réponse en 5 s" : e.message}`);
        const rest = restFor(e.status);
        if (rest) RESTING.set(model, Date.now() + rest);
      }
    }
    console.warn("Recherche IA :", tried.join(" / "));
    return { titles: [], cached: false, ms: Date.now() - start, tried, error: tried.join(" / ") };
  })().finally(() => { if (PENDING.get(key.url) === job) PENDING.delete(key.url); });
  if (!opts.model) PENDING.set(key.url, job);
  // La réponse finit d'arriver et part en cache même si la recherche a cessé de l'attendre.
  if (ctx) ctx.waitUntil(job);
  return job;
}

const results = (d) => (d && d.results) || [];
const yearOf = (it) => Number((it.release_date || it.first_air_date || "").slice(0, 4));

/** Fiche TMDB d'un titre proposé par Gemini, ou null s'il n'existe pas (titre inventé). */
async function findOne(pick, kind, search) {
  const yearKey = kind === "series" ? "first_air_date_year" : "year";
  const names = [...new Set([pick.title, pick.title_fr].filter(Boolean))];
  const sim = (it) => Math.max(...names.map((n) => scoreOf(n, it)));
  const gap = (it) => (pick.year ? Math.abs(yearOf(it) - pick.year) : 0);
  // Titre identique (année à 3 ans près : dates de sortie qui varient selon les pays et les
  // festivals, « The Upside » 2017 ou 2019) ou titre ressemblant à un an près. Puis : identique
  // d'abord (pas « The Upside-down Triangle »), bonne année, et le plus connu (Aladdin de Disney,
  // pas un Aladdin obscur de la même année).
  const exactOf = (it) => names.some((n) => isExact(n, it));
  const fits = (it) => it && it.poster_path && it.vote_count > 0 && (exactOf(it) ? gap(it) <= 3 : sim(it) >= MATCH && gap(it) <= 1);
  const rank = (it) => 2 * exactOf(it) + (gap(it) <= 1);
  const best = (list) => list.filter(fits).sort((a, b) => rank(b) - rank(a) || (b.vote_count || 0) - (a.vote_count || 0))[0] || null;
  // Titre + année d'abord ; sinon le titre français sans l'année.
  const exact = best(results(await search(pick.title, 1, pick.year ? { [yearKey]: pick.year } : {})));
  if (exact) return exact;
  return best(results(await search(pick.title_fr || pick.title, 1)));
}

const dedupe = (list) => { const seen = new Set(); return list.filter((it) => it && !seen.has(it.id) && seen.add(it.id)); };

/** Films d'une saga dans l'ordre de sortie, suites annoncées comprises (avec affiche et date). */
const sagaOrder = (parts) => (parts || []).filter((p) => p.poster_path && p.release_date)
  .sort((a, b) => a.release_date.localeCompare(b.release_date));

/**
 * Fiches TMDB des titres proposés pour ce type (films ou séries), dans l'ordre de Gemini.
 * api(path) → appel TMDB : avec lui, chaque film amène le reste de sa saga juste après lui.
 */
export async function resolveTitles(titles, kind, search, api) {
  const wanted = titles.filter((t) => (t.type === "serie") === (kind === "series"));
  const found = dedupe(await Promise.all(wanted.map((t) => findOne(t, kind, search).catch(() => null))));
  if (kind === "series" || !api || !found.length) return found;
  const sagaOf = await Promise.all(found.map((it) => api(`/movie/${it.id}`).then((d) => d && d.belongs_to_collection, () => null)));
  const ids = [...new Set(sagaOf.filter(Boolean).map((c) => c.id))];
  const parts = new Map(await Promise.all(ids.map((id) => api(`/collection/${id}`).then((c) => [id, sagaOrder(c && c.parts)], () => [id, []]))));
  return dedupe(found.flatMap((it, i) => {
    const c = sagaOf[i];
    if (!c || !parts.has(c.id)) return [it];
    const saga = parts.get(c.id);
    parts.delete(c.id);   // la saga n'est déroulée qu'une fois, au rang de son premier film
    return [it, ...saga];
  }));
}
