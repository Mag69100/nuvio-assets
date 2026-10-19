import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

// Worker appelé comme par Cloudflare, avec un cache en mémoire et TMDB / Gemini simulés.
let store, calls;
beforeEach(() => {
  store = new Map();
  calls = [];
  globalThis.caches = {
    default: {
      match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
      put: async (req, res) => { store.set(req.url, await res.text()); },
    },
  };
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ results: [], page: 1, total_pages: 1 }), { headers: { "Content-Type": "application/json" } });
  };
});
const ctx = { waitUntil: () => {} };
const INSTANCE = "AIzaSyInstanceKey0123456789abcdefghijk";
const env = { TMDB_API_KEY: "tmdb", GEMINI_API_KEY: INSTANCE };
const seg = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const get = (path) => worker.fetch(new Request(`https://x${path}`), env, ctx);

test("debug_reserve_sans_cle", async () => {
  for (const path of ["/debug/search/movie/dune", "/debug/renewal/1399"]) {
    const res = await get(path);
    assert.equal(res.status, 403, path);
  }
  assert.equal(calls.length, 0);
});

test("debug_reserve_autre_cle", async () => {
  const res = await get(`/${seg({ k: "AIzaSyAutreCle0123456789abcdefghijklm" })}/debug/search/movie/dune`);
  assert.equal(res.status, 403);
});

test("debug_ouvert_avec_la_cle_de_l_instance", async () => {
  const res = await get(`/${seg({ k: INSTANCE })}/debug/search/movie/dune`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray((await res.json()).final));
});

const at = (url, init) => worker.fetch(new Request(url, init), env, ctx);

test("manifeste_source", async () => {
  const m = await (await at("https://nuvio-assets.xnzxflix.workers.dev/manifest.json")).json();
  assert.equal(m.id, "com.xnzx07.catalogue-fr");
});

test("manifeste_copie", async () => {
  const m = await (await at("https://catalogue.exemple.fr/manifest.json")).json();
  assert.equal(m.id, "com.xnzx07.catalogue-fr.perso");
});

test("hote_absent_sur_la_source", async () => {
  const res = await at("https://nuvio-assets.xnzxflix.workers.dev/hote/etat");
  assert.equal(res.status, 404);
});

// ---------- espace hébergeur d'une copie ----------
const COPY = "https://copie.exemple";
const hostEnv = { ...env, ADMIN_PASSWORD: "secret-hote" };
const hostAt = (path, init = {}, e = hostEnv) => worker.fetch(new Request(COPY + path, init), e, ctx);
const login = (motDePasse, e) => hostAt("/hote/connexion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motDePasse }) }, e);
const cookieOf = (res) => (res.headers.getSetCookie()[0] || "").split(";")[0];
// GitHub simulé : la source a publié la 5.99.1 (palier toujours plus récent que la copie).
const githubSays = () => {
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes("raw.githubusercontent.com") && String(url).endsWith("/worker/index.js")) return new Response('const VERSION = "5.99.1";');
    if (String(url).includes("api.github.com")) return new Response(JSON.stringify([{ commit: { message: "v5.99.1 : B" } }, { commit: { message: "v5.99.0 : A" } }]));
    return new Response(JSON.stringify({ results: [] }));
  };
};

test("connexion_mauvais_mot_de_passe", async () => {
  const res = await login("faux");
  assert.equal(res.status, 403);
  assert.equal(res.headers.getSetCookie().length, 0);
});

test("connexion_puis_etat", async () => {
  githubSays();
  const res = await login("secret-hote");
  assert.equal(res.status, 200);
  const cookie = cookieOf(res);
  assert.match(cookie, /^hote=[a-f0-9]{64}$/);
  assert.ok(!cookie.includes("secret-hote"));
  const etat = await (await hostAt("/hote/etat", { headers: { cookie } })).json();
  assert.equal(etat.hote, true);
  assert.match(etat.alerte, /^https:\/\/copie\.exemple\/[^/]+\/manifest\.json$/);
  assert.equal(etat.maj.version, "5.99.1");
  assert.deepEqual(await (await hostAt("/hote/etat")).json(), { hote: false });
});

test("cookie_forge", async () => {
  assert.deepEqual(await (await hostAt("/hote/etat", { headers: { cookie: "hote=abc" } })).json(), { hote: false });
});

test("sans_mot_de_passe", async () => {
  for (const mdp of ["", "secret-hote", undefined]) assert.equal((await login(mdp, env)).status, 403);
  assert.deepEqual(await (await hostAt("/hote/etat", { headers: { cookie: "hote=" } }, env)).json(), { hote: false });
});

test("plus_tard_masque", async () => {
  githubSays();
  const cookie = cookieOf(await login("secret-hote"));
  assert.equal((await (await hostAt("/hote/etat", { headers: { cookie } })).json()).maj.version, "5.99.1");
  assert.equal((await hostAt("/hote/plus-tard", { method: "POST", headers: { cookie } })).status, 200);
  assert.equal((await (await hostAt("/hote/etat", { headers: { cookie } })).json()).maj, null);
});

test("plus_tard_reserve", async () => {
  assert.equal((await hostAt("/hote/plus-tard", { method: "POST" })).status, 403);
});

test("connexion_en_http_sans_secure", async () => {
  const res = await worker.fetch(new Request("http://192.168.1.10:8787/hote/connexion", { method: "POST", body: JSON.stringify({ motDePasse: "secret-hote" }) }), hostEnv, ctx);
  assert.equal(res.status, 200);
  assert.doesNotMatch(res.headers.getSetCookie()[0], /Secure/);
  const https = await login("secret-hote");
  assert.match(https.headers.getSetCookie()[0], /Secure/);
});
