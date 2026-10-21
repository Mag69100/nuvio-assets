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
 * Clé : celle que l'utilisateur colle dans la salle 2 (rangée dans son lien), sinon GEMINI_API_KEY de
 * l'instance si GEMINI_PUBLIC=on (voir aiEnv). Sans clé : lecture des réponses déjà en cache seulement,
 * jamais d'appel à Gemini. Variable facultative : GEMINI_MODEL (modèle à essayer en premier).
 */
import { norm, scoreOf, isExact, similarity } from "./search.js";

// Dans l'ordre : les deux Flash-Lite (15 requêtes par minute, 500 par jour, réponse en 1 à 2 s), puis
// 3.6 Flash (5 par minute et 20 par jour seulement : dernier secours, et jamais pour les bonus de
// fiche). 3.8 Flash, un peu meilleur, met jusqu'à 6 s et sature souvent : pas retenu.
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash"];
const SEARCH_ONLY = new Set(["gemini-3.6-flash"]);
// Bonus de fiche (rappel, « pour qui », saison commandée) : au plus autant d'appels par minute. Le hero
// de Nuvio charge la fiche de chaque titre survolé : sans limite, faire défiler une rangée dépassait
// la limite de Gemini (15 par minute) et privait la recherche d'IA. Au-delà : la ligne viendra plus tard.
const OPTIONAL_PER_MIN = 5;
// « Pour qui » préparés par rangée entière (une question pour 20 titres) : au plus autant par minute.
// Avec les bonus de fiche, il reste toujours au moins 6 appels par minute pour la recherche.
const BATCH_PER_MIN = 4;
const ATTEMPT_MS = 5000;            // un modèle qui ne répond pas en 5 s passe la main au suivant
export const AI_WAIT_MS = 6000;     // attente maximale d'une réponse de Gemini pendant une recherche
const CACHE_S = 30 * 86400;
const MATCH = 0.75;                 // ressemblance minimale entre le titre proposé et la fiche TMDB
const MAX_PICKS = 12;               // titres proposés retrouvés dans TMDB, par type (budget d'appels)

// Mots qui racontent un titre ou une envie au lieu de le nommer (« où », « qui », « un mec », « glauque »…).
const CUES = /\b(ou|qui|que|quand|avec|dans|pendant|apres|contre|mec|gars|type|meuf|fille|femme|homme|enfant|gamin|famille|histoire|parle|raconte|ressemble|comme|genre|style|ambiance|similaire|bien|tres|trop|thriller|comedie|horreur|drame|romantique|coreen|japonais|triste|drole|flippant|glauque|where|who|about|with|like|je|tu|mon|ma|ton|ta|moi|toi|vous|entre|melange|mix|croisement)\b/;

/**
 * La requête ressemble à une description (au moins 3 mots, dont un mot de récit), à une réplique
 * (pronoms, guillemets : « je suis ton père ») ou à un mélange (« entre Amélie et Fight Club »).
 */
export function looksDescriptive(query) {
  const q = norm(query);
  return /["«»“”]/.test(query) || (q.split(" ").length >= 3 && CUES.test(q));
}

const PROMPT = `Tu aides à retrouver des films et des séries à partir de ce qu'un utilisateur français tape dans une barre de recherche : une description (« le film où un homme revit la même journée »), un souvenir flou, une scène, une ambiance, un acteur, ou un titre mal écrit.
Réponds avec les titres qui correspondent le mieux, du plus probable au moins probable, 15 au maximum :
- title : le titre original exact s'il s'écrit en alphabet latin, sinon le titre anglais international ;
- title_fr : le titre français s'il existe, sinon le même que title ;
- title_en : le titre anglais international, sinon le même que title ;
- year : l'année de sortie (pour une série : l'année de la première saison) ;
- type : "film" ou "serie" ;
- saga : true si l'œuvre a des suites ou des préquelles, sinon false.
Chaque détail de la requête compte : nationalité des personnages ou du film, pays, lieu, époque, métier, objet, situation. L'œuvre recherchée est celle qui réunit TOUS ces détails, même si elle est peu connue ou indépendante : elle passe avant une œuvre célèbre qui n'en réunit qu'une partie (« une japonaise part chercher un trésor aux états-unis » → Kumiko, the Treasure Hunter, pas Indiana Jones).
Si la requête désigne une œuvre précise, mets-la en premier, puis ajoute des œuvres proches (même sujet, même genre) : donne toujours au moins 8 titres quand c'est possible. Si elle décrit une envie (« un thriller coréen glauque »), propose les titres les plus réputés qui correspondent.
Si la requête est une réplique, même approximative, en français ou en version originale (« je suis ton père », « Houston, on a un problème »), mets en premier l'œuvre d'où elle vient, puis des œuvres proches.
Si elle demande un mélange (« entre Amélie et Fight Club », « comme Alien mais en comédie »), propose des œuvres qui réunissent les deux, sans remettre en tête les œuvres citées.
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
          title: { type: "STRING" }, title_fr: { type: "STRING" }, title_en: { type: "STRING" },
          year: { type: "INTEGER" }, type: { type: "STRING", enum: ["film", "serie"] }, saga: { type: "BOOLEAN" },
        },
        required: ["title", "title_fr", "title_en", "year", "type", "saga"],
      },
    },
  },
  required: ["titles"],
};

// Niveau de réflexion le plus bas accepté par le modèle (« minimal » n'existe pas sur 3.8 Flash).
const thinkingOf = (model) => (/3\.8-flash/.test(model) ? "low" : "minimal");

// Gemini abîme parfois les lettres accentuées (« Hr\u0001tur » pour « Hrútar », « Hr#00fat#00ar »).
const BROKEN = /[\u0000-\u001f\ufffd]|#00/;
const NAMES = ["title", "title_fr", "title_en"];

/** Question à Gemini, reposée une fois si la réponse a des titres abîmés ; ceux qui le restent sont vidés. */
async function askGemini(env, query, model, thinking) {
  const ask = async () => ((await geminiJSON(env, model, PROMPT, query, SCHEMA, thinking)).titles || [])
    .filter((t) => t && t.title).slice(0, 15);
  let titles = await ask();
  if (titles.some((t) => NAMES.some((k) => BROKEN.test(t[k] || "")))) titles = await ask();
  return titles
    .map((t) => ({ ...t, ...Object.fromEntries(NAMES.map((k) => [k, BROKEN.test(t[k] || "") ? "" : (t[k] || "").trim()])) }))
    .map((t) => ({ ...t, title: t.title || t.title_en || t.title_fr }))
    .filter((t) => t.title);
}

/**
 * Une question à un modèle Gemini → texte de la réponse (erreur avec .status sinon). `user` : le texte, ou une
 * liste de parties ({ text } ou { inlineData: { mimeType, data } }, pour une image).
 * opts.schema → réponse JSON selon ce schéma ; opts.thinking → niveau de réflexion ; opts.timeout →
 * attente maximale (5 s par défaut).
 */
async function geminiText(env, model, system, user, opts = {}) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: Array.isArray(user) ? user : [{ text: user }] }],
      generationConfig: {
        temperature: 0.2,
        ...(opts.schema ? { responseMimeType: "application/json", responseSchema: opts.schema } : {}),
        thinkingConfig: { thinkingLevel: opts.thinking || thinkingOf(model) },
      },
    }),
    signal: AbortSignal.timeout(opts.timeout || ATTEMPT_MS),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    // Quota dépassé (429) : par minute (« réessaie dans 12 s ») ou pour la journée (quotaId « …PerDay… »).
    const details = (j.error || {}).details || [];
    const retry = (details.find((x) => /RetryInfo/.test(x["@type"] || "")) || {}).retryDelay || "";
    const daily = details.some((x) => /QuotaFailure/.test(x["@type"] || "") && (x.violations || []).some((v) => /PerDay/i.test(v.quotaId || "")));
    throw Object.assign(new Error(`${res.status} ${((j.error || {}).message || "").slice(0, 600)}`), {
      status: res.status, daily, retryMs: /^\d+(\.\d+)?s$/.test(retry) ? Math.ceil(parseFloat(retry) * 1000) : 0,
    });
  }
  const j = await res.json();
  const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
  return parts.filter((p) => !p.thought).map((p) => p.text || "").join("");
}

/** Une question à un modèle Gemini, réponse JSON selon le schéma. */
async function geminiJSON(env, model, system, user, schema, thinking) {
  return JSON.parse((await geminiText(env, model, system, user, { schema, thinking })) || "{}");
}

/**
 * L'env d'une requête, avec la clé Gemini à utiliser : celle collée par l'utilisateur dans la salle 2
 * (cfg.k), sinon celle de l'instance si elle est partagée (GEMINI_PUBLIC=on), sinon aucune (lecture
 * des réponses déjà en cache seulement). L'env d'origine n'est pas modifié.
 */
export function aiEnv(env, cfg) {
  const key = (cfg && cfg.k) || (env.GEMINI_PUBLIC === "on" ? env.GEMINI_API_KEY || "" : "");
  return { ...env, GEMINI_API_KEY: key };
}

// Deux requêtes qui posent la même question en même temps (les catalogues Films et Séries d'une
// recherche) : une seule part.
const PENDING = new Map();
// Clé + modèle → moment où on peut le solliciter de nouveau. Par clé : un utilisateur à court de
// quota (ou dont la clé est refusée) ne bloque pas les autres.
const RESTING = new Map();
const keyTag = (env) => String(env.GEMINI_API_KEY).slice(-8);
const restKey = (env, model) => `${keyTag(env)}|${model}`;
// Clé refusée par Google (fausse, révoquée) : toute la clé au repos 10 min, sans essayer les autres
// modèles (ils la refuseraient aussi). Une autre erreur 400 vient de la requête : pas de repos.
const keyRefused = (e) => e.status === 401 || e.status === 403 || (e.status === 400 && /API[_ ]?key/i.test(e.message || ""));
const restKeyRefused = (env) => RESTING.set(`${keyTag(env)}|*`, Date.now() + 10 * 60e3);
const keyResting = (env) => RESTING.get(`${keyTag(env)}|*`) > Date.now();

/** Millisecondes jusqu'à minuit, heure du Pacifique (remise à zéro des quotas journaliers de Gemini). */
function untilPacificMidnight() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" })
    .formatToParts(new Date());
  const get = (type) => Number((parts.find((x) => x.type === type) || {}).value || 0);
  return ((24 - get("hour")) * 3600 - get("minute") * 60 - get("second")) * 1000;
}

/**
 * Repos d'un modèle après une erreur : quota du jour épuisé → jusqu'à minuit (Pacifique) ; quota de
 * la minute → le délai que donne Gemini (une minute par défaut) ; surchargé ou muet → une minute.
 * (Clé refusée : voir keyRefused.)
 */
function restFor(e) {
  if (e.status === 429) return e.daily ? untilPacificMidnight() : Math.max(e.retryMs || 60e3, 5e3);
  return e.status >= 500 || !e.status ? 60e3 : 0;
}

// Appels de la dernière minute, par clé (par instance de l'addon) : bonus de fiche, et rangées préparées.
const OPTIONAL_CALLS = new Map(), BATCH_CALLS = new Map();
function allowed(store, env, max) {
  const now = Date.now(), tag = keyTag(env);
  const calls = (store.get(tag) || []).filter((t) => t >= now - 60e3);
  store.set(tag, calls);
  if (calls.length >= max) return false;
  calls.push(now);
  return true;
}
const optionalAllowed = (env) => allowed(OPTIONAL_CALLS, env, OPTIONAL_PER_MIN);

/**
 * Modèles à essayer, dans l'ordre ; ceux au repos sont sautés. S'ils le sont tous : tous quand
 * même pour une recherche, aucun pour un bonus de fiche (rappel, « pour qui ») qui attendra.
 */
function modelsFor(env, opts) {
  if (opts.model) return [opts.model];
  if (keyResting(env)) return [];
  const chain = env.GEMINI_MODEL ? [env.GEMINI_MODEL, ...MODELS.filter((m) => m !== env.GEMINI_MODEL)] : MODELS;
  const all = opts.optional ? chain.filter((m) => !SEARCH_ONLY.has(m)) : chain;
  const ready = all.filter((m) => !(RESTING.get(restKey(env, m)) > Date.now()));
  return ready.length || opts.optional ? ready : all;
}

/**
 * Réponse de Gemini gardée en cache → { value, cached, ms, model, tried, error }.
 * ask(model) pose la question à un modèle ; un modèle en panne ou à court de quota passe la main au
 * suivant. Ne lève jamais d'erreur : en cas de souci, value est null et error dit pourquoi.
 * La réponse finit d'arriver et part en cache même si la requête a cessé de l'attendre.
 */
function cachedAsk(env, ctx, cacheUrl, ttl, ask, opts = {}) {
  const key = new Request(cacheUrl);
  // Sans clé : lecture seule (réponse déjà en cache ou rien), jamais partagée avec une vraie demande.
  const readOnly = !env.GEMINI_API_KEY;
  const pendingKey = `${key.url}|${readOnly ? "" : keyTag(env)}`;
  if (PENDING.has(pendingKey) && !opts.model) return PENDING.get(pendingKey);
  const start = Date.now();
  const job = (async () => {
    const hit = opts.fresh ? null : await caches.default.match(key);
    if (hit) return { value: await hit.json(), cached: true, ms: Date.now() - start };
    if (readOnly) return { value: null, cached: false, ms: Date.now() - start, readOnly: true };
    const tried = [];
    const models = modelsFor(env, opts);
    // Bonus de fiche : pas plus de OPTIONAL_PER_MIN appels par minute (la recherche passe avant).
    if (opts.optional && models.length && !optionalAllowed(env)) {
      return { value: null, cached: false, ms: Date.now() - start, tried, error: "trop de demandes cette minute" };
    }
    for (const model of models) {
      try {
        const value = await ask(model);
        await caches.default.put(key, new Response(JSON.stringify(value), {
          headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttl}` },
        }));
        return { value, cached: false, ms: Date.now() - start, model, tried };
      } catch (e) {
        tried.push(`${model} : ${e.name === "TimeoutError" ? "pas de réponse en 5 s" : e.message}`);
        if (keyRefused(e)) { restKeyRefused(env); break; }
        const rest = restFor(e);
        if (rest) RESTING.set(restKey(env, model), Date.now() + rest);
      }
    }
    if (tried.length) console.warn("Gemini :", tried.join(" / "));
    return { value: null, cached: false, ms: Date.now() - start, tried, error: tried.join(" / ") || "tous les modèles au repos" };
  })().finally(() => { if (PENDING.get(pendingKey) === job) PENDING.delete(pendingKey); });
  if (!opts.model) PENDING.set(pendingKey, job);
  if (ctx) ctx.waitUntil(job);
  return job;
}

/**
 * Pourquoi une réponse de l'IA ne peut pas servir à une recherche : "attente" (pas de réponse à
 * temps), "erreur" (Gemini en panne, à court de quota, clé refusée), "absent" (pas de clé et rien
 * en cache) ; null si elle peut servir.
 */
export const aiMiss = (answer) => (!answer ? "attente" : answer.error ? "erreur" : answer.readOnly ? "absent" : null);

/**
 * Titres proposés par Gemini pour une requête → { titles, cached, ms, model, tried, error }.
 * opts.model → un seul modèle, imposé ; opts.thinking → niveau de réflexion ; opts.fresh → sans le
 * cache (diagnostic).
 */
export async function aiTitles(env, ctx, query, opts = {}) {
  const url = `https://cache.local/ai/v5/${encodeURIComponent(norm(query))}`;
  const r = await cachedAsk(env, ctx, url, CACHE_S, (model) => askGemini(env, query, model, opts.thinking), opts);
  return { ...r, titles: r.value || [] };
}

// ---------- rappel avant la suite ----------
const RECAP_PROMPT = `Tu écris des rappels pour des spectateurs français qui vont regarder la suite d'un film ou la saison suivante d'une série, et qui ont oublié l'histoire.
Écris en français, au présent, en 4 à 6 phrases, sans titre, sans liste et sans phrase d'introduction (pas de « Dans ce film… »).
Raconte toute l'histoire, fin comprise, avec des faits précis : les événements clés, les révélations (qui est vraiment le méchant, quel est le secret), qui meurt, ce que deviennent les personnages principaux (avec leurs noms), et où en est l'intrigue à la toute fin, puisque la suite part de là.
Ne paraphrase pas le synopsis et n'écris aucune phrase vague (« une victoire éclatante », « de nouvelles aventures ») : chaque phrase doit apprendre quelque chose de concret.
N'invente rien. Si des résumés d'épisodes sont fournis, appuie-toi uniquement sur eux. Si tu ne connais pas bien l'œuvre, renvoie un texte vide.`;
const RECAP_SCHEMA = { type: "OBJECT", properties: { recap: { type: "STRING" } }, required: ["recap"] };
const RECAP_CACHE_S = 180 * 86400;

/**
 * Rappel de l'histoire d'un film ou d'une saison (fin comprise), gardé 6 mois → { recap, … }.
 * id → clé de cache (« movie-438631 », « tv-1399-s3 ») ; prompt → l'œuvre et ce qu'on en sait.
 * recap vaut "" quand Gemini ne connaît pas assez l'œuvre (réponse gardée aussi : pas reposée).
 */
export async function aiRecap(env, ctx, id, prompt) {
  const ask = async (model) => {
    // Un peu plus de réflexion qu'une recherche : de meilleurs souvenirs de l'histoire, et le rappel
    // n'est écrit qu'une fois (gardé 6 mois).
    const recap = String((await geminiJSON(env, model, RECAP_PROMPT, prompt, RECAP_SCHEMA, "low")).recap || "").trim();
    // Texte abîmé (retours à la ligne permis) : le modèle suivant, sans mettre celui-ci au repos.
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]|#00/.test(recap)) throw Object.assign(new Error("texte abîmé"), { status: -1 });
    return recap;
  };
  const r = await cachedAsk(env, ctx, `https://cache.local/recap/v2/${id}`, RECAP_CACHE_S, ask, { optional: true });
  return { ...r, recap: r.value || "" };
}

// ---------- « Pour qui ? » et « À savoir » ----------
const PROFILE_PROMPT = `Tu aides des spectateurs français à choisir un film ou une série. Pour l'œuvre décrite, réponds :
- pour_qui : une seule phrase de 25 mots au plus, qui commence par « Pour » et dit à qui l'œuvre va plaire et, si c'est utile, à qui elle ne plaira pas (« Pour les fans de thrillers lents et d'ambiances pesantes ; à éviter si tu cherches de l'action. »). Tutoie, sans rien dévoiler de l'histoire.
- a_savoir : ce qui peut choquer ou gêner, en une phrase courte et factuelle : violence, gore, sexe ou nudité, langage cru, drogue, peur (jump scares), thèmes durs (suicide, maltraitance…). Seulement ce qui est vraiment présent ; s'il n'y a rien de notable, « Rien de choquant ».
N'invente rien. Si tu ne connais pas l'œuvre, appuie-toi sur le résumé, les genres, les mots-clés et la classification ; si tu ne peux pas savoir ce qu'elle montre, renvoie un texte vide pour a_savoir.
Écris dans un français sans aucune faute d'orthographe ni de conjugaison (« si tu sursautes facilement », pas « si tu surotes ») ; dans le doute sur un mot, choisis-en un plus simple.`;
const PROFILE_SCHEMA = {
  type: "OBJECT",
  properties: { pour_qui: { type: "STRING" }, a_savoir: { type: "STRING" } },
  required: ["pour_qui", "a_savoir"],
};

/**
 * « Pour qui » et « À savoir » d'un film ou d'une série, gardés 6 mois → { pourQui, aSavoir, … }.
 * id → clé de cache (« movie-438631 ») ; prompt → l'œuvre (titre, année, genres, résumé…).
 */
export async function aiProfile(env, ctx, id, prompt) {
  const clean = (s) => String(s || "").trim();
  const ask = async (model) => {
    const r = await geminiJSON(env, model, PROFILE_PROMPT, prompt, PROFILE_SCHEMA);
    const value = { pourQui: clean(r.pour_qui), aSavoir: clean(r.a_savoir) };
    if (BROKEN.test(value.pourQui + value.aSavoir)) throw Object.assign(new Error("texte abîmé"), { status: -1 });
    return value;
  };
  const r = await cachedAsk(env, ctx, `https://cache.local/profile/v3/${id}`, RECAP_CACHE_S, ask, { optional: true });
  return { ...r, ...(r.value || { pourQui: "", aSavoir: "" }) };
}

const results = (d) => (d && d.results) || [];
const yearOf = (it) => Number((it.release_date || it.first_air_date || "").slice(0, 4));

/**
 * Juge des résultats TMDB pour un titre proposé par Gemini : renvoie la bonne fiche d'une liste,
 * ou null (titre inventé ou pas dans cette liste).
 */
function matcher(pick) {
  const names = [...new Set([pick.title, pick.title_fr, pick.title_en].filter(Boolean))];
  // Ressemblance : seulement avec les titres d'au moins 5 lettres (« Shi », titre coréen de Poetry,
  // ressemble au début de « Shinjuku Incident ») ; les plus courts doivent être identiques.
  const long = names.filter((n) => norm(n).replace(/ /g, "").length >= 5);
  // Dans les deux sens : le titre TMDB peut être une partie du titre proposé (« L'Empire
  // contre-attaque » dans « Star Wars : Épisode V - L'Empire contre-attaque »). Titres TMDB d'au
  // moins deux mots seulement : pas un film « Star » pour n'importe quel Star Wars.
  const inside = (it) => Math.max(0, ...[it.title || it.name, it.original_title || it.original_name]
    .filter((t) => norm(t).split(" ").length >= 2).flatMap((t) => long.map((n) => similarity(t, n))));
  const sim = (it) => Math.max(0, ...long.map((n) => scoreOf(n, it)), inside(it));
  const gap = (it) => (pick.year ? Math.abs(yearOf(it) - pick.year) : 0);
  // Titre identique (année à 5 ans près : TMDB donne la date de sortie en France, parfois bien
  // après la sortie d'origine, Coherence 2013 sorti en 2017 ; « The Upside » 2017 ou 2019) ou titre
  // ressemblant à un an près. Les remakes au même titre sont presque toujours plus éloignés. Puis : identique
  // d'abord (pas « The Upside-down Triangle »), bonne année, et le plus connu (Aladdin de Disney,
  // pas un Aladdin obscur de la même année).
  const exactOf = (it) => names.some((n) => isExact(n, it));
  const fits = (it) => it && it.poster_path && it.vote_count > 0 && (exactOf(it) ? gap(it) <= 5 : sim(it) >= MATCH && gap(it) <= 1);
  const rank = (it) => 2 * exactOf(it) + (gap(it) <= 1);
  return (list) => list.filter(fits).sort((a, b) => rank(b) - rank(a) || (b.vote_count || 0) - (a.vote_count || 0))[0] || null;
}

/**
 * Fiches TMDB des titres proposés par Gemini (null pour un titre inventé), en trois vagues :
 *   1. titre + année, pour tous les titres en même temps ;
 *   2. sans l'année (TMDB filtre sur la date de sortie du pays : Coherence, 2013 pour Gemini, 2014
 *      en France), titre français ;
 *   3. titre anglais (sans accents : sûr même quand Gemini abîme les autres), cherché en anglais,
 *      puis sa fiche en français.
 * Chaque vague part dans l'ordre de Gemini : le budget d'appels va d'abord aux titres les plus probables.
 */
async function findAll(wanted, kind, search) {
  const yearKey = kind === "series" ? "first_air_date_year" : "year";
  const byYear = (t) => (t.year ? { [yearKey]: t.year } : {});
  const judge = wanted.map(matcher);
  const hits = wanted.map(() => null);
  const wave = async (ids, ask, pickOut) => {
    const answers = await Promise.all(ids.map((i) => ask(wanted[i]).catch(() => null)));
    await Promise.all(ids.map(async (i, k) => { hits[i] = await pickOut(i, answers[k]); }));
  };
  const misses = () => wanted.map((_, i) => i).filter((i) => !hits[i]);
  await wave(misses(), (t) => search(t.title, 1, byYear(t)), (i, d) => judge[i](results(d)));
  await wave(misses(), (t) => search(t.title_fr || t.title, 1), (i, d) => judge[i](results(d)));
  await wave(misses().filter((i) => wanted[i].title_en), (t) => search(t.title_en, 1, { language: "en-US" }), async (i, d) => {
    const en = judge[i](results(d));
    if (!en) return null;
    const fr = await search(en.original_title || en.original_name, 1, byYear(wanted[i])).catch(() => null);
    return results(fr).find((it) => it.id === en.id) || en;
  });
  return hits;
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
  const wanted = titles.filter((t) => (t.type === "serie") === (kind === "series")).slice(0, MAX_PICKS);
  const hits = await findAll(wanted, kind, search);
  const seen = new Set();
  const pairs = wanted.map((t, i) => ({ t, it: hits[i] })).filter(({ it }) => it && !seen.has(it.id) && seen.add(it.id));
  const found = pairs.map((p) => p.it);
  if (kind === "series" || !api || !found.length) return found;
  // Seulement les films que Gemini dit de saga : un appel TMDB de plus chacun.
  const sagaOf = await Promise.all(pairs.map(({ t, it }) => (t.saga === false ? null
    : api(`/movie/${it.id}`).then((d) => d && d.belongs_to_collection, () => null))));
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

const PROFILES_PROMPT = `${PROFILE_PROMPT}
On te donne plusieurs œuvres d'un coup, chacune avec son numéro (id) : réponds pour chacune d'elles, avec le même id.`;
const PROFILES_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { id: { type: "INTEGER" }, pour_qui: { type: "STRING" }, a_savoir: { type: "STRING" } },
        required: ["id", "pour_qui", "a_savoir"],
      },
    },
  },
  required: ["items"],
};

/**
 * « Pour qui » et « À savoir » de toute une rangée en une seule question à Gemini, rangés comme ceux
 * d'aiProfile (même clé de cache). Un peu plus de réflexion qu'à l'ouverture d'une fiche : c'est en
 * arrière-plan, et le français en est plus soigné : à l'ouverture de la fiche, ils sont déjà prêts.
 * items → [{ key: « movie-438631 », id: identifiant TMDB, text: l'œuvre }] ; ceux déjà en cache sont sautés.
 */
export async function aiProfiles(env, items) {
  const keyOf = (it) => new Request(`https://cache.local/profile/v3/${it.key}`);
  const known = await Promise.all(items.map((it) => caches.default.match(keyOf(it)).then(Boolean, () => false)));
  let todo = items.filter((_, i) => !known[i]).slice(0, 20);
  // Sans clé : rien à préparer (on ne lit que ce qui est déjà en cache).
  if (!todo.length || !env.GEMINI_API_KEY) return { asked: 0 };
  if (!allowed(BATCH_CALLS, env, BATCH_PER_MIN)) return { asked: 0, error: "trop de demandes cette minute" };
  // Texte d'un titre : tel quel, ou lu à la demande (seulement pour ceux qui manquent au cache).
  const texts = await Promise.all(todo.map((it) => (typeof it.text === "function" ? Promise.resolve(it.text()).catch(() => "") : it.text)));
  todo = todo.map((it, i) => ({ ...it, text: texts[i] })).filter((it) => it.text);
  if (!todo.length) return { asked: 0 };
  const prompt = todo.map((it) => `id ${it.id}\n${it.text}`).join("\n\n");
  const tried = [];
  for (const model of modelsFor(env, { optional: true })) {
    try {
      const r = JSON.parse((await geminiText(env, model, PROFILES_PROMPT, prompt, { schema: PROFILES_SCHEMA, thinking: "low", timeout: 20000 })) || "{}");
      const byId = new Map((r.items || []).map((x) => [Number(x.id), x]));
      const saved = await Promise.all(todo.map(async (it) => {
        const x = byId.get(it.id);
        const value = x && { pourQui: String(x.pour_qui || "").trim(), aSavoir: String(x.a_savoir || "").trim() };
        if (!value || !value.pourQui || BROKEN.test(value.pourQui + value.aSavoir)) return 0;
        await caches.default.put(keyOf(it), new Response(JSON.stringify(value), {
          headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${RECAP_CACHE_S}` },
        }));
        return 1;
      }));
      return { asked: todo.length, saved: saved.reduce((a, b) => a + b, 0), model };
    } catch (e) {
      tried.push(`${model} : ${e.name === "TimeoutError" ? "pas de réponse" : e.message}`);
      if (keyRefused(e)) { restKeyRefused(env); break; }
      const rest = restFor(e);
      if (rest) RESTING.set(restKey(env, model), Date.now() + rest);
    }
  }
  return { asked: todo.length, saved: 0, error: tried.join(" / ") || "tous les modèles au repos" };
}

// ---------- Série renouvelée ? (d'après Wikipédia) ----------
const RENEWAL_PROMPT = `Tu suis l'actualité des séries pour des spectateurs français. On te donne une série, la date du jour et des extraits de son article Wikipédia (en anglais). D'après ces extraits SEULEMENT, dis ce qu'il en est de la saison suivante :
- statut : RENOUVELEE (saison suivante officiellement commandée ou annoncée), ANNULEE (la chaîne ou la plateforme a arrêté la série), TERMINEE (la dernière saison diffusée était prévue comme la dernière) ou EN_ATTENTE (rien d'officiel dans les extraits) ;
- precision : quelques mots en français, sans point final : la date ou l'année de sortie prévue si les extraits la donnent (« prévue en 2027 », « tournage en cours »), sinon vide.
Ne réponds RENOUVELEE, ANNULEE ou TERMINEE que si les extraits le disent clairement ; dans le doute, EN_ATTENTE.`;
const RENEWAL_SCHEMA = {
  type: "OBJECT",
  properties: { statut: { type: "STRING", enum: ["RENOUVELEE", "ANNULEE", "TERMINEE", "EN_ATTENTE"] }, precision: { type: "STRING" } },
  required: ["statut", "precision"],
};
const RENEWAL_CACHE_S = 7 * 86400;

/**
 * Saison suivante d'une série que TMDB dit « pas terminée » sans saison annoncée, d'après les
 * extraits de son article Wikipédia, gardée 7 jours → { status, detail, … } ; status vide si
 * Gemini n'a pas pu répondre. id → clé de cache (« tv-100088-s3 ») ; prompt → série, date, extraits.
 */
export async function aiRenewal(env, ctx, id, prompt) {
  const ask = async (model) => {
    const r = await geminiJSON(env, model, RENEWAL_PROMPT, prompt, RENEWAL_SCHEMA);
    const detail = String(r.precision || "").replace(/[.\s]+$/, "").trim().slice(0, 90);
    if (BROKEN.test(detail)) throw Object.assign(new Error("texte abîmé"), { status: -1 });
    return { status: r.statut || "EN_ATTENTE", detail };
  };
  const r = await cachedAsk(env, ctx, `https://cache.local/renewal/v2/${id}`, RENEWAL_CACHE_S, ask, { optional: true });
  return { ...r, ...(r.value || { status: "", detail: "" }) };
}

/**
 * Une photo à lire (diagnostic par photo du guide, voir diagnostic.js) → { value, model } ou
 * { value: null, refused, quota, error }. Mêmes modèles et mêmes repos que les bonus de fiche (jamais
 * 3.6 Flash, gardé pour la recherche), sans leur limite par minute : quelqu'un attend la réponse, et la
 * liaison LIMITE_DIAGNOSTIC compte déjà les envois. Jamais en cache : rien de la photo n'est gardé.
 * image : le JPEG en base64.
 */
export async function aiImage(env, system, text, image, schema) {
  const tried = [];
  let refused = false, quota = false;
  for (const model of modelsFor(env, { optional: true })) {
    try {
      const parts = [{ text }, { inlineData: { mimeType: "image/jpeg", data: image } }];
      const raw = await geminiText(env, model, system, parts, { schema, thinking: "low", timeout: 20000 });
      let value;
      try { value = JSON.parse(raw || "{}"); } catch (e) { throw Object.assign(new Error("réponse illisible"), { status: -1 }); }
      return { value, model };
    } catch (e) {
      tried.push(`${model} : ${e.name === "TimeoutError" ? "pas de réponse" : String(e.message).slice(0, 200)}`);
      if (keyRefused(e)) { refused = true; restKeyRefused(env); break; }
      if (e.status === 429) quota = true;
      const rest = restFor(e);
      if (rest) RESTING.set(restKey(env, model), Date.now() + rest);
    }
  }
  if (tried.length) console.warn("Gemini (photo) :", tried.join(" / "));
  // Aucun modèle essayé : tous au repos (quota atteint il y a peu), ou clé refusée il y a moins de 10 min.
  if (!tried.length) return { value: null, refused: keyResting(env), quota: !keyResting(env), error: "tous les modèles au repos" };
  return { value: null, refused, quota, error: tried.join(" / ") };
}
