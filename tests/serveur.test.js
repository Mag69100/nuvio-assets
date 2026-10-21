import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

// Addon appelé comme par Cloudflare (cache en mémoire, TMDB simulé) : adresses piégées, erreurs, budget d'appels.
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
    return new Response(JSON.stringify({ results: [], page: 1, total_pages: 1 }));
  };
});
const ctx = { waitUntil: () => {} };
const env = { TMDB_API_KEY: "tmdb" };
const get = (path, e = env) => worker.fetch(new Request(`https://x${path}`), e, ctx);

test("fiche_identifiant_tmdb_piege", async () => {
  for (const id of ["tmdb:1%2F..%2F..%2Ftv%2F1396", "tmdb:1%2Fvideos", "tmdb:12abc", "tt1%2F..%2F1396", "tmdb:%2F1396"]) {
    const res = await get(`/meta/movie/${id}.json`);
    assert.equal((await res.json()).meta, null, id);
  }
  // Aucune adresse TMDB autre que celle d'un titre : rien de « /tv/1396 », rien de « .. ».
  assert.ok(!calls.some((u) => /\.\.|%2E%2E|\/tv\/1396|videos/i.test(u)), calls.join("\n"));
});

test("fiche_identifiant_tmdb_valide", async () => {
  await get("/meta/series/tmdb:1396.json");
  await get("/meta/series/tmdb:1396:1:2.json");
  const lus = calls.filter((u) => u.includes("api.themoviedb.org")).map((u) => new URL(u).pathname);
  assert.ok(lus.length >= 2 && lus.every((p) => p.startsWith("/3/tv/1396")), lus.join("\n"));
});

test("adresses_mal_encodees_sans_erreur_500", async () => {
  for (const path of [
    "/catalog/movie/recherche-films/search=%C3%28.json",
    "/catalog/movie/%E0%A4%A.json",
    "/catalog/movie/accueil-top10/skip=%ZZ.json",
    "/meta/movie/tt%E0%A4%A.json",
    "/trailer/movie/%C3%28.json",
  ]) {
    const res = await get(path);
    assert.ok(res.status < 500, `${path} → ${res.status}`);
    await res.json();
  }
  const { metas } = await (await get("/catalog/movie/recherche-films/search=%C3%28.json")).json();
  assert.deepEqual(metas, []);
});

// Une mise à jour de l'addon ne vide plus les caches : leurs clés suivent CACHE_V, pas VERSION.
test("cles_de_cache_sans_la_version", async () => {
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const u = String(url);
    if (u.includes("/discover/")) return new Response(JSON.stringify({ results: [{ id: 5, name: "Série", first_air_date: "2020-01-01" }], page: 1, total_pages: 1 }));
    if (/\/movie\/5\b/.test(u)) return new Response(JSON.stringify({ id: 5, title: "Film", imdb_id: "tt0000005" }));
    return new Response(JSON.stringify({ results: [] }));
  };
  await get("/catalog/series/accueil-series-a-devorer.json");
  await get("/meta/movie/tmdb:5.json");
  const version = /const VERSION = "([\d.]+)"/.exec(await import("node:fs").then((fs) => fs.readFileSync(new URL("../worker/index.js", import.meta.url), "utf8")))[1];
  const cles = [...store.keys()].filter((k) => /\/(catalog|meta)\//.test(k));
  assert.ok(cles.some((k) => k.includes("/catalog/")) && cles.some((k) => k.includes("/meta/")), cles.join("\n"));
  for (const k of cles) assert.ok(!k.includes(version), k);
});

test("erreur_imprevue_reponse_propre", async () => {
  // Cache en panne : l'erreur remonte jusqu'en haut ; la réponse reste du JSON, jamais gardée, sans le détail.
  globalThis.caches = { default: { match: async () => { throw new Error("cache cassé https://x/?api_key=secret"); }, put: async () => {} } };
  const res = await get("/catalog/movie/accueil-top10.json");
  assert.equal(res.status, 500);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  const body = await res.text();
  assert.ok(!/at |secret|cassé/.test(body), body);
  assert.ok(JSON.parse(body).error);
});
