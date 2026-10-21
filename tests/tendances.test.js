import { test, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
import { jourTendances, photoDuJour } from "../worker/tendances.js";

// Base D1 simulée : juste les requêtes de tendances.js (INSERT OR IGNORE : le premier enregistré reste).
function fakeD1() {
  const rows = new Map();
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async run() {
      if (sql.startsWith("CREATE")) return {};
      if (sql.startsWith("INSERT OR IGNORE")) { const [j, k, ids] = args; if (!rows.has(`${j}/${k}`)) rows.set(`${j}/${k}`, ids); return {}; }
      if (sql.startsWith("DELETE")) { for (const cle of [...rows.keys()]) if (cle.split("/")[0] < args[0]) rows.delete(cle); return {}; }
      throw new Error("requête inattendue : " + sql);
    },
    async first() { const ids = rows.get(`${args[0]}/${args[1]}`); return ids ? { ids } : null; },
  });
  return { rows, prepare: (sql) => stmt(sql) };
}

// TMDB simulé : un classement qui bouge d'heure en heure (classement[0] devant, puis le suivant…).
let store, calls, classement, env;
beforeEach(() => {
  store = new Map();
  calls = [];
  classement = [1, 2, 3];
  globalThis.caches = {
    default: {
      match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
      put: async (req, res) => { store.set(req.url, await res.text()); },
    },
  };
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    const page = new URL(u).searchParams.get("page");
    return new Response(JSON.stringify({ results: page === "1" && u.includes("/trending/") ? classement.map((id) => ({ id })) : [] }));
  };
  env = { TMDB_API_KEY: "tmdb", LIENS: fakeD1() };
});
const ctx = { waitUntil: () => {} };
const get = (path, e = env) => worker.fetch(new Request(`https://x${path}`), e, ctx);

// La photo est prise une fois : plus tard dans la journée, le classement a bougé, la photo non.
test("photo_prise_une_fois_par_jour", async () => {
  const res = await get("/tendances/movie.json");
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ids: [1, 2, 3] });
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
  assert.ok(calls.every((u) => u.includes("/trending/movie/day")));
  classement = [3, 2, 1];
  store.clear();   // un autre serveur de Cloudflare, sans cache : il la lit dans la base
  assert.deepEqual(await (await get("/tendances/movie.json")).json(), { ids: [1, 2, 3] });
  assert.deepEqual(await photoDuJour(env, "movie"), [1, 2, 3]);
  assert.deepEqual(await (await get("/tendances/series.json")).json(), { ids: [3, 2, 1] });   // séries : leur propre photo
  assert.ok(calls.some((u) => u.includes("/trending/tv/day")));
});

// La tâche de 4 h UTC prend les deux photos ; celles d'il y a plus d'une semaine sont effacées.
test("tache_de_4h", async () => {
  const quatreHeures = Date.UTC(2026, 9, 22, 4);
  env.LIENS.rows.set("2026-10-01/movie", "[9]");
  const pas = [];
  await worker.scheduled({ scheduledTime: quatreHeures }, env, { waitUntil: (p) => pas.push(p) });
  await Promise.all(pas);
  assert.equal(jourTendances(quatreHeures), "2026-10-22");
  assert.equal(jourTendances(quatreHeures - 1), "2026-10-21");
  assert.deepEqual(JSON.parse(env.LIENS.rows.get("2026-10-22/movie")), [1, 2, 3]);
  assert.deepEqual(JSON.parse(env.LIENS.rows.get("2026-10-22/series")), [1, 2, 3]);
  assert.ok(!env.LIENS.rows.has("2026-10-01/movie"));
  // Plus tard dans la journée, le classement a bougé : toujours la photo de 4 h.
  classement = [7];
  mock.timers.enable({ apis: ["Date"], now: quatreHeures + 3 * 3600000 });
  try { assert.deepEqual(await photoDuJour(env, "movie"), [1, 2, 3]); } finally { mock.timers.reset(); }
});

// Sans base (Docker) : le classement du moment, gardé par Cloudflare jusqu'au changement. TMDB en panne : 503.
test("sans_base_et_tmdb_en_panne", async () => {
  const sansBase = { TMDB_API_KEY: "tmdb" };
  assert.deepEqual(await (await get("/tendances/movie.json", sansBase)).json(), { ids: [1, 2, 3] });
  classement = [3, 2, 1];
  assert.deepEqual(await (await get("/tendances/movie.json", sansBase)).json(), { ids: [1, 2, 3] });
  store.clear();
  globalThis.fetch = async () => new Response("", { status: 500 });
  const res = await get("/tendances/series.json");
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal((await get("/tendances/anime.json")).status, 404);
});
