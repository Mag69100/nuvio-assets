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
