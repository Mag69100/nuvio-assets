import { test, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { makeTendances } from "../api/tendances.js";
import { resetMemo, secondesAvantBascule } from "../lib/tendances.js";

beforeEach(() => resetMemo());
const req = (q) => new Request(`https://affiches.test/api/tendances?${q}`);
const ADDON = "https://addon.test";
const env = { TMDB_API_KEY: "k", ADDON_URL: ADDON };
// L'addon publie la photo qu'il a prise (addon : null = injoignable) ; TMDB, le classement du moment.
const sources = (calls = [], addon = { movie: [3, 1, 2], series: [9] }) => async (u) => {
  calls.push(String(u));
  const m = /^https:\/\/addon\.test\/tendances\/(movie|series)\.json$/.exec(String(u));
  if (m) return addon ? new Response(JSON.stringify({ ids: addon[m[1]] })) : new Response("", { status: 503 });
  const p = Number(new URL(String(u)).searchParams.get("page"));
  return new Response(JSON.stringify({ results: [{ id: p * 10 }, { id: p * 10 + 1 }] }));
};
const age = (res, h) => Number(/max-age=(\d+)/.exec(res.headers.get(h))[1]);

// La photo du jour est celle de l'addon, la même pour toutes les instances : gardée au CDN jusqu'au changement.
test("photo_du_jour", async () => {
  const calls = [];
  const res = await makeTendances({ fetchImpl: sources(calls), env })(req("type=movie"));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ids: [3, 1, 2] });
  const s = secondesAvantBascule();
  assert.ok(Math.abs(age(res, "Cache-Control") - s) <= 2, res.headers.get("Cache-Control"));
  assert.ok(Math.abs(age(res, "Vercel-CDN-Cache-Control") - s) <= 2);
  assert.deepEqual(calls, [`${ADDON}/tendances/movie.json`]);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
});

test("series_et_demandes_invalides", async () => {
  const calls = [];
  const res = await makeTendances({ fetchImpl: sources(calls), env })(req("type=series"));
  assert.deepEqual(await res.json(), { ids: [9] });
  assert.deepEqual(calls, [`${ADDON}/tendances/series.json`]);
  assert.equal((await makeTendances({ fetchImpl: sources(), env })(req("type=anime"))).status, 404);
});

// Addon injoignable : le classement du moment chez TMDB, gardé 5 minutes seulement (on redemande ensuite à l'addon).
test("addon_injoignable_tmdb_en_secours", async () => {
  const calls = [];
  const res = await makeTendances({ fetchImpl: sources(calls, null), env })(req("type=movie"));
  // Signalé comme secours : les affiches ne s'en servent pas pour leurs N° (lib/tendances.js, lireRang).
  assert.deepEqual(await res.json(), { ids: [10, 11, 20, 21, 30, 31], secours: true });
  assert.ok(age(res, "Cache-Control") <= 300 && age(res, "Vercel-CDN-Cache-Control") <= 300, res.headers.get("Cache-Control"));
  assert.ok(calls.some((u) => u.includes("/trending/movie/day")));
  // Le secours n'est pas gardé jusqu'au changement : l'addon revenu, sa photo est servie.
  const t = Date.now();
  mock.timers.enable({ apis: ["Date"], now: t + 301 * 1000 });
  try {
    const apres = await makeTendances({ fetchImpl: sources(), env })(req("type=movie"));
    assert.deepEqual(await apres.json(), { ids: [3, 1, 2] });
  } finally { mock.timers.reset(); }
});

test("addon_et_tmdb_en_panne", async () => {
  const res = await makeTendances({ fetchImpl: async () => new Response("", { status: 500 }), env })(req("type=movie"));
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});
