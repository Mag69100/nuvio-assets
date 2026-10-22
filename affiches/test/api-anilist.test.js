import { test } from "node:test";
import assert from "node:assert/strict";
import { makeAnilist } from "../api/anilist.js";

const req = (q, headers = {}) => new Request(`https://affiches.test/api/anilist?q=${encodeURIComponent(q)}`, { headers });
const anilist = (data, calls = [], status = 200) => async (u, init) => { calls.push(JSON.parse(init.body).variables.s); return new Response(JSON.stringify({ data }), { status }); };
const DATA = { a: { media: [{ title: { english: "Attack on Titan", romaji: "Shingeki no Kyojin" }, popularity: 1069303 }] }, c: { characters: [] } };

test("relaie AniList, gardé 7 jours au CDN", async () => {
  const calls = [];
  const res = await makeAnilist({ fetchImpl: anilist(DATA, calls), env: {} })(req("shingeki no kyojin"));
  assert.deepEqual(await res.json(), { data: DATA });
  assert.equal(res.headers.get("Vercel-CDN-Cache-Control"), `max-age=${7 * 86400}`);
  assert.deepEqual(calls, ["shingeki no kyojin"]);
});

test("rien trouvé : un jour ; refus d'AniList : une minute", async () => {
  const vide = await makeAnilist({ fetchImpl: anilist({ a: { media: [] }, c: { characters: [] } }), env: {} })(req("zzzz"));
  assert.equal(vide.headers.get("Vercel-CDN-Cache-Control"), "max-age=86400");
  const refus = await makeAnilist({ fetchImpl: anilist(null, [], 429), env: {} })(req("luffy"));
  assert.deepEqual(await refus.json(), { erreur: 429 });
  assert.equal(refus.headers.get("Vercel-CDN-Cache-Control"), "max-age=60");
});

test("requêtes mal écrites ou trop courtes : 404 sans appel", async () => {
  for (const q of ["ich", "Luffy", "re:zero", "a".repeat(61), "un deux trois quatre cinq six sept"]) {
    const calls = [];
    const res = await makeAnilist({ fetchImpl: anilist(DATA, calls), env: {} })(req(q));
    assert.equal(res.status, 404, q);
    assert.equal(calls.length, 0, q);
  }
});

test("avec RELAIS_KEY : seulement l'addon", async () => {
  const env = { RELAIS_KEY: "cle" };
  assert.equal((await makeAnilist({ fetchImpl: anilist(DATA), env })(req("luffy"))).status, 403);
  assert.equal((await makeAnilist({ fetchImpl: anilist(DATA), env })(req("luffy", { "X-Relais-Cle": "cle" }))).status, 200);
});
