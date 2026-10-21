import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeQualite } from "../api/qualite.js";

const req = (q) => new Request(`https://affiches.test/api/qualite?${q}`);
const torrentio = (streams, calls = []) => async (u) => { calls.push(String(u)); return new Response(JSON.stringify({ streams })); };

test("qualité d'un film, gardée un jour au CDN", async () => {
  const calls = [];
  const res = await makeQualite({ fetchImpl: torrentio([{ name: "4k DV" }], calls) })(req("type=movie&video=tt15239678"));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { uhd: true, extra: "DV", fhd: false, hdr10p: false, atmos: false, vf: false, sources: 1 });
  assert.equal(res.headers.get("Vercel-CDN-Cache-Control"), "max-age=86400");
  assert.deepEqual(calls, ["https://torrentio.strem.fun/language=french/stream/movie/tt15239678.json"]);
});

test("épisode d'une série", async () => {
  const calls = [];
  await makeQualite({ fetchImpl: torrentio([], calls) })(req("type=series&video=tt11126994:2:1"));
  assert.deepEqual(calls, ["https://torrentio.strem.fun/language=french/stream/series/tt11126994:2:1.json"]);
});

test("demandes invalides : 404 sans appel", async () => {
  for (const q of ["type=movie&video=tt1:1:1", "type=series&video=tt1", "type=anime&video=tt1", "type=movie&video=../x", "type=series&video=tt1:2:5"]) {
    const calls = [];
    const res = await makeQualite({ fetchImpl: torrentio([], calls) })(req(q));
    assert.equal(res.status, 404, q);
    assert.equal(calls.length, 0, q);
  }
});

test("Torrentio en panne : 503 sans cache", async () => {
  const res = await makeQualite({ fetchImpl: async () => new Response("", { status: 500 }) })(req("type=movie&video=tt1"));
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});
