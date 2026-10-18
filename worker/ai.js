/**
 * Recherche par IA (Gemini), en renfort de la recherche classique (search.js).
 *
 * Gemini ne sert que quand la requête décrit un titre au lieu de le nommer (« le film où un mec
 * revit la même journée », « la série avec le prof de chimie qui fait de la drogue ») ou quand la
 * recherche classique ne trouve rien qui ressemble. Il propose des titres (titre original + année),
 * chacun est retrouvé dans TMDB, et ce que TMDB ne connaît pas est écarté : aucun titre inventé.
 *   - une seule question pour les films et les séries (les deux catalogues de recherche) ;
 *   - réponse gardée 30 jours dans le cache Cloudflare : la même requête ne coûte qu'une fois ;
 *   - Gemini trop lent, en panne ou à court de quota : la recherche classique seule, comme avant.
 * Secret facultatif : GEMINI_API_KEY (sans lui, rien ne change). Variable facultative : GEMINI_MODEL.
 */
import { norm, scoreOf } from "./search.js";

const MODEL = "gemini-3.6-flash";   // rapide et bonne culture ciné ; réflexion réduite au minimum
const TIMEOUT_MS = 3500;            // au-delà, on se passe de Gemini
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
Réponds avec les titres qui correspondent le mieux, du plus probable au moins probable, 10 au maximum :
- title : le titre original exact s'il s'écrit en alphabet latin, sinon le titre anglais international ;
- title_fr : le titre français s'il existe, sinon le même que title ;
- year : l'année de sortie (pour une série : l'année de la première saison) ;
- type : "film" ou "serie".
Si la requête désigne une œuvre précise, mets-la en premier. Si elle décrit une envie (« un thriller coréen glauque »), propose les titres les plus réputés qui correspondent.
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

async function askGemini(env, query, model) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT }] },
      contents: [{ role: "user", parts: [{ text: query }] }],
      generationConfig: {
        temperature: 0.2, responseMimeType: "application/json", responseSchema: SCHEMA,
        thinkingConfig: { thinkingLevel: thinkingOf(model) },
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status} : ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
  const text = parts.filter((p) => !p.thought).map((p) => p.text || "").join("");
  const titles = (JSON.parse(text || "{}").titles || []).filter((t) => t && t.title);
  return titles.slice(0, 10);
}

// Les deux catalogues (Films, Séries) posent la même question en même temps : une seule part.
const PENDING = new Map();

/**
 * Titres proposés par Gemini pour une requête → { titles, cached, ms, model, error }.
 * Ne lève jamais d'erreur : en cas de souci, titles est vide et error dit pourquoi.
 */
export function aiTitles(env, ctx, query) {
  const model = env.GEMINI_MODEL || MODEL;
  const key = new Request(`https://cache.local/ai/${model}/${encodeURIComponent(norm(query))}`);
  if (PENDING.has(key.url)) return PENDING.get(key.url);
  const start = Date.now();
  const job = (async () => {
    const hit = await caches.default.match(key);
    if (hit) return { titles: await hit.json(), cached: true, ms: Date.now() - start, model };
    try {
      const titles = await askGemini(env, query, model);
      const save = caches.default.put(key, new Response(JSON.stringify(titles), {
        headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CACHE_S}` },
      }));
      if (ctx) ctx.waitUntil(save); else await save;
      return { titles, cached: false, ms: Date.now() - start, model };
    } catch (e) {
      console.warn("Recherche IA :", String(e));
      return { titles: [], cached: false, ms: Date.now() - start, model, error: String(e) };
    }
  })().finally(() => PENDING.delete(key.url));
  PENDING.set(key.url, job);
  return job;
}

const results = (d) => (d && d.results) || [];
const yearOf = (it) => Number((it.release_date || it.first_air_date || "").slice(0, 4));

/** Fiche TMDB d'un titre proposé par Gemini, ou null s'il n'existe pas (titre inventé). */
async function findOne(pick, kind, search) {
  const yearKey = kind === "series" ? "first_air_date_year" : "year";
  const names = [...new Set([pick.title, pick.title_fr].filter(Boolean))];
  const ok = (it) => it && it.poster_path && it.vote_count > 0 && names.some((n) => scoreOf(n, it) >= MATCH);
  const best = (list) => list.sort((a, b) => (yearOf(b) === pick.year) - (yearOf(a) === pick.year)
    || (b.vote_count || 0) - (a.vote_count || 0))[0] || null;
  // Titre + année d'abord ; sinon sans l'année (une année à un an près : sortie décalée selon les pays).
  const exact = best(results(await search(pick.title, 1, pick.year ? { [yearKey]: pick.year } : {})).filter(ok));
  if (exact) return exact;
  const loose = await search(pick.title_fr || pick.title, 1);
  return best(results(loose).filter((it) => ok(it) && (!pick.year || Math.abs(yearOf(it) - pick.year) <= 1)));
}

/** Fiches TMDB des titres proposés pour ce type (films ou séries), dans l'ordre de Gemini. */
export async function resolveTitles(titles, kind, search) {
  const wanted = titles.filter((t) => (t.type === "serie") === (kind === "series"));
  const found = await Promise.all(wanted.map((t) => findOne(t, kind, search).catch(() => null)));
  const seen = new Set();
  return found.filter((it) => it && !seen.has(it.id) && seen.add(it.id));
}
