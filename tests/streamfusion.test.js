import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

// Base D1 simulée : juste le plafond de StreamFusion (sf_budget, INSERT … ON CONFLICT … RETURNING).
function fakeD1() {
  const budget = new Map();
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async run() { if (sql.startsWith("CREATE")) return {}; throw new Error("requête inattendue : " + sql); },
    async first() {
      if (!sql.startsWith("INSERT INTO sf_budget")) throw new Error("requête inattendue : " + sql);
      const [j, n, plafond] = args, avant = budget.get(j);
      if (avant === undefined) { budget.set(j, n); return { n }; }
      if (avant + n > plafond) return null;
      budget.set(j, avant + n);
      return { n: avant + n };
    },
  });
  return { budget, prepare: (sql) => stmt(sql) };
}

let store, appels, env;
beforeEach(() => {
  store = new Map();
  appels = [];
  globalThis.caches = { default: {
    match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
    put: async (req, res) => { store.set(req.url, await res.text()); },
  } };
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.startsWith("https://sf.test/c/stream/")) {
      appels.push(u);
      return new Response(JSON.stringify({ streams: u.includes("tt802") ? [{ name: "Stream-Fusion", title: "Aucun résultat trouvé, 4 exclus" }]
        : [{ name: "instant / AllDebrid / (2160p)", title: "Film.2026.MULTi.VFF.2160p.WEB.DV" }] }));
    }
    return new Response("{}");
  };
  env = { TMDB_API_KEY: "tmdb", RELAIS_KEY: "cle-relais", STREAMFUSION_URL: "https://sf.test/c/manifest.json", SF_PLAFOND: "2", LIENS: fakeD1() };
});
const ctx = { waitUntil: () => {} };
const sf = (video, cle = "cle-relais", e = env) => worker.fetch(new Request(`https://x/sf/${video}.json`, { headers: cle ? { "X-Relais-Cle": cle } : {} }), e, ctx);

// L'avis de StreamFusion pour le service d'affiches : seulement avec la clé du relais ; gardé un jour (un titre n'est
// demandé qu'une fois) ; jamais au-delà du plafond du jour (ici 2), même pour un titre nouveau.
test("streamfusion_avis_cle_cache_et_plafond", async () => {
  assert.equal((await sf("movie/tt801", null)).status, 403);
  assert.equal((await sf("movie/tt801", "mauvaise")).status, 403);
  assert.equal(appels.length, 0);
  assert.deepEqual(await (await sf("movie/tt801")).json(), { vf: true, sources: 1, qualite: { u: 1, x: "DV", p: 0, f: 0, a: 0 } });
  assert.deepEqual(await (await sf("movie/tt801")).json(), { vf: true, sources: 1, qualite: { u: 1, x: "DV", p: 0, f: 0, a: 0 } });
  assert.equal(appels.length, 1, "gardé : pas redemandé");
  assert.deepEqual(await (await sf("series/tt802:1:1")).json(), { vf: false, sources: 4 });
  assert.deepEqual(await (await sf("movie/tt803")).json(), { plafond: true });
  assert.equal(appels.length, 2, "plafond : StreamFusion pas appelé");
  // Sans clé du relais réglée, ou sans StreamFusion : rien.
  assert.equal((await sf("movie/tt804", "cle-relais", { ...env, RELAIS_KEY: "" })).status, 403);
  assert.deepEqual(await (await sf("movie/tt805", "cle-relais", { ...env, STREAMFUSION_URL: "" })).json(), { plafond: true });
});
