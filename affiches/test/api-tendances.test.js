import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeTendances } from "../api/tendances.js";
import { resetMemo, secondesAvantBascule } from "../lib/tendances.js";

beforeEach(() => resetMemo());
const env = { TMDB_API_KEY: "k" };
const req = (q) => new Request(`https://affiches.test/api/tendances?${q}`);
const tmdb = (calls = []) => async (u) => {
  calls.push(String(u));
  const p = Number(new URL(String(u)).searchParams.get("page"));
  return new Response(JSON.stringify({ results: [{ id: p * 10 }, { id: p * 10 + 1 }] }));
};

// La photo du jour, la même pour toutes les instances et pour l'addon : gardée au CDN jusqu'au changement.
test("photo_du_jour", async () => {
  const calls = [];
  const res = await makeTendances({ fetchImpl: tmdb(calls), env })(req("type=movie"));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ids: [10, 11, 20, 21, 30, 31] });
  const s = secondesAvantBascule();
  const age = (h) => Number(/max-age=(\d+)/.exec(res.headers.get(h))[1]);
  assert.ok(Math.abs(age("Cache-Control") - s) <= 2, res.headers.get("Cache-Control"));
  assert.ok(Math.abs(age("Vercel-CDN-Cache-Control") - s) <= 2);
  assert.ok(calls.every((u) => u.includes("/trending/movie/day")));
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
});

test("series_et_demandes_invalides", async () => {
  const calls = [];
  await makeTendances({ fetchImpl: tmdb(calls), env })(req("type=series"));
  assert.ok(calls.every((u) => u.includes("/trending/tv/day")));
  const res = await makeTendances({ fetchImpl: tmdb(), env })(req("type=anime"));
  assert.equal(res.status, 404);
});

test("tmdb_en_panne", async () => {
  const res = await makeTendances({ fetchImpl: async () => new Response("", { status: 500 }), env })(req("type=movie"));
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});
