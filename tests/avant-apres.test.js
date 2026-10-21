import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
import { hallPage } from "../worker/hall.js";
import { APERCU_JS, APERCU_CSS } from "../worker/apercu.js";
import { NUVIO_JS, NUVIO_CSS } from "../worker/nuvio.js";
import { allege, CINEMETA } from "../worker/cinemeta.js";

// Cinemeta simulé : 30 titres complets (champs en trop compris), et un cache Cloudflare en mémoire.
let store, calls, cinemetaOk;
const titre = (i) => ({
  id: `tt${1000 + i}`, imdb_id: `tt${1000 + i}`, type: "movie", name: `Film ${i}`, poster: `https://images.metahub.space/poster/small/tt${1000 + i}/img`,
  background: `https://images.metahub.space/background/medium/tt${1000 + i}/img`, logo: `https://images.metahub.space/logo/medium/tt${1000 + i}/img`,
  description: "Un résumé.", releaseInfo: "2026", runtime: "109 min", genres: ["Drama", "Romance"], imdbRating: "7.1", released: "2026-10-14T00:00:00.000Z",
  cast: ["A", "B"], trailers: [{ source: "x" }], popularities: { a: 1 }, links: [{ name: "x" }],
});
beforeEach(() => {
  store = new Map(); calls = []; cinemetaOk = true;
  globalThis.caches = { default: {
    match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
    put: async (req, res) => { store.set(req.url, await res.text()); },
  } };
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).startsWith(CINEMETA)) return cinemetaOk ? new Response(JSON.stringify({ metas: Array.from({ length: 30 }, (_, i) => titre(i)) })) : new Response("panne", { status: 503 });
    return new Response(JSON.stringify({ results: [] }));
  };
});
const ctx = { waitUntil: () => {} };
const get = (p) => worker.fetch(new Request("https://x.exemple" + p), { TMDB_API_KEY: "x" }, ctx);

test("cinemeta_relaye_allege_et_garde_un_jour", async () => {
  const r = await get("/cinemeta/movie/top.json");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("Cache-Control"), "public, max-age=86400");
  const { metas } = await r.json();
  assert.equal(metas.length, 20);
  assert.deepEqual(Object.keys(metas[0]).sort(), ["background", "description", "genres", "id", "imdbRating", "logo", "name", "poster", "releaseInfo", "released", "runtime", "type"]);
  assert.equal(calls.filter((u) => u === `${CINEMETA}/catalog/movie/top.json`).length, 1);
  // Deuxième demande : depuis le cache, sans rappeler Cinemeta.
  await get("/cinemeta/movie/top.json");
  assert.equal(calls.filter((u) => u.startsWith(CINEMETA)).length, 1);
});

test("cinemeta_seulement_les_rangees_de_l_accueil", async () => {
  for (const p of ["/cinemeta/movie/year.json", "/cinemeta/series/last-videos.json", "/cinemeta/movie/top/genre=Action.json", "/cinemeta/anime/top.json"]) assert.equal((await get(p)).status, 404, p);
  for (const p of ["/cinemeta/series/top.json", "/cinemeta/movie/imdbRating.json", "/cinemeta/series/imdbRating.json"]) assert.equal((await get(p)).status, 200, p);
  assert.ok(calls.every((u) => !u.includes("year") && !u.includes("last-videos")));
});

test("cinemeta_en_panne_rien_de_garde", async () => {
  cinemetaOk = false;
  const r = await get("/cinemeta/movie/top.json");
  assert.equal(r.status, 502);
  assert.deepEqual(await r.json(), { metas: [] });
  assert.equal(r.headers.get("Cache-Control"), "public, max-age=300");
  assert.equal(store.size, 0);
});

test("cinemeta_fiche_allegee", () => {
  const m = allege({ ...titre(1), name: "x".repeat(900), genres: ["Drama", 3, "Crime", "War", "Action"], imdbRating: "" }, "series");
  assert.equal(m.type, "series");
  assert.equal(m.name.length, 300);
  assert.deepEqual(m.genres, ["Drama", "Crime", "War"]);
  assert.ok(!("imdbRating" in m) && !("cast" in m) && !("trailers" in m));
});

// Les rangées de Nuvio tout juste installé : celles de Cinemeta sans filtre obligatoire, dans l'ordre de son manifest,
// titrées comme HomeViewModelCatalogPipeline (« nom - type », type en français : l'appli suit la langue de la TV).
test("avant_apres_rangees_comme_nuvio_tv", () => {
  const rangees = [...APERCU_JS.matchAll(/\["(movie|series)", "(top|imdbRating)", "([^"]+)"\]/g)].map((m) => m.slice(1).join("/"));
  assert.deepEqual(rangees, ["movie/top/Popular - Film", "series/top/Popular - Série", "movie/imdbRating/Featured - Film", "series/imdbRating/Featured - Série"]);
  assert.match(APERCU_JS, /ORIG_AP \+ "\/cinemeta\/" \+ type/);
  assert.doesNotMatch(APERCU_JS, /strem\.io|metahub/);
  assert.doesNotThrow(() => new Function(APERCU_JS));
  assert.doesNotThrow(() => new Function(NUVIO_JS));
});

test("avant_apres_curseur_accessible", () => {
  assert.match(APERCU_JS, /setAttribute\("role", "slider"\)/);
  for (const a of ["aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext", "aria-label"]) assert.ok(APERCU_JS.includes(`"${a}"`), a);
  for (const k of ["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]) assert.ok(APERCU_JS.includes(k), k);
  assert.match(APERCU_JS, /"Nuvio de base"/);
  assert.match(APERCU_JS, /"Avec le guide"/);
  assert.match(APERCU_CSS, /\.aa-trait \{[^}]*touch-action: none/);
  assert.match(APERCU_CSS, /\.aa-poignee:focus-visible/);
  assert.match(APERCU_CSS, /prefers-reduced-motion: reduce\) \{ \.ecran\.aa-balaye/);
});

// L'écran commun dessine aussi Nuvio tel qu'installé : thème Blanc, coins de 12 dp, pas de relief, barre classique.
test("ecran_nuvio_par_defaut", () => {
  assert.match(NUVIO_CSS, /\.nvo\.defaut \.nvo-carte \{ border-radius: 1\.25cqw; background-color: #222222; \}/);
  assert.match(NUVIO_CSS, /\.nvo\.defaut \.nvo-carte::before \{ display: none; \}/);
  assert.match(NUVIO_CSS, /\.nvo-rail \{[^}]*width: 7\.5cqw/);
  assert.match(NUVIO_JS, /opts\.defaut/);
  assert.match(NUVIO_JS, /hero\(\{ local: defaut \}\)/);
});

test("hall_propose_l_avant_apres", () => {
  const html = hallPage({ origin: "https://x.exemple", season: null });
  assert.match(html, /<button type="button" class="apercu-lien" data-resultat data-avant-apres>/);
  assert.match(html, /location\.hash === "#avant-apres"/);
});
