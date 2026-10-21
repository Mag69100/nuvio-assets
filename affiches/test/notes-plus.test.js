import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { parseMdblist, lireMdblist, notesPlus, resetMemo } from "../lib/notes-plus.js";
import { makeNotes } from "../api/notes.js";

beforeEach(() => resetMemo());

// Réponse type de MDBList (api/?i=tt…) : une note par site.
const MDB = { title: "Dune", ratings: [
  { source: "imdb", value: 8.5 }, { source: "tomatoes", value: 94, score: 94 }, { source: "popcorn", value: 95 },
  { source: "metacritic", value: 81 }, { source: "letterboxd", value: 4.1 }, { source: "trakt", value: 85 },
] };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status });

test("parse_mdblist", () => {
  assert.deepEqual(parseMdblist(MDB), { rt: 94, mc: 81, lb: 4.1 });
  assert.deepEqual(parseMdblist({ ratings: [{ source: "tomatoes", value: null }, { source: "metacritic", value: 0 }] }), { rt: null, mc: null, lb: null });
  assert.equal(parseMdblist(null), null);
});

test("lire_mdblist", async () => {
  const calls = [];
  const f = async (u) => { calls.push(String(u)); return json(MDB); };
  assert.deepEqual(await lireMdblist({ MDBLIST_API_KEY: "cle" }, "tt15239678", f), { rt: 94, mc: 81, lb: 4.1 });
  const u = new URL(calls[0]);
  assert.equal(u.origin + u.pathname, "https://mdblist.com/api/");
  assert.equal(u.searchParams.get("i"), "tt15239678");
  // Sans clé : rien demandé ; quota épuisé ou panne : null.
  assert.equal(await lireMdblist({}, "tt15239678", f), null);
  assert.equal(calls.length, 1);
  assert.equal(await lireMdblist({ MDBLIST_API_KEY: "cle" }, "tt1", async () => json({ error: "limit" }, 429)), null);
  assert.equal(await lireMdblist({ MDBLIST_API_KEY: "cle" }, "tt1", async () => { throw new Error("réseau"); }), null);
});

// Le relais du service : gardé 7 jours au CDN, la même lecture sert à toutes les instances.
test("relais_notes", async () => {
  const req = (q) => new Request(`https://affiches.test/api/notes?${q}`);
  const ok = await makeNotes({ fetchImpl: async () => json(MDB), env: { MDBLIST_API_KEY: "cle" } })(req("imdb=tt15239678"));
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { rt: 94, mc: 81, lb: 4.1 });
  assert.equal(ok.headers.get("Vercel-CDN-Cache-Control"), "max-age=604800, stale-if-error=86400");
  assert.equal(ok.headers.get("Cache-Control"), "public, max-age=86400");
  assert.equal((await makeNotes({ fetchImpl: async () => json(MDB), env: { MDBLIST_API_KEY: "cle" } })(req("imdb=abc"))).status, 404);
  const sansCle = await makeNotes({ fetchImpl: async () => json(MDB), env: {} })(req("imdb=tt15239678"));
  assert.equal(sansCle.status, 200);
});

test("notes_plus_par_le_relais", async () => {
  const calls = [];
  const f = async (u) => { calls.push(String(u)); return json({ rt: 94, mc: null, lb: 4.1 }); };
  assert.deepEqual(await notesPlus("tt15239678", f, "https://affiches.test"), { rt: 94, mc: null, lb: 4.1 });
  assert.deepEqual(await notesPlus("tt15239678", f, "https://affiches.test"), { rt: 94, mc: null, lb: 4.1 });
  assert.deepEqual(calls, ["https://affiches.test/notes/tt15239678.json"]);
  assert.equal(await notesPlus("tt2", async () => new Response("", { status: 503 }), "https://affiches.test"), null);
  assert.equal(await notesPlus("", f, "https://affiches.test"), null);
});

// Revue : réponse MDBList sans notes (clé refusée, quota, titre inconnu) : null, pas des notes vides gardées 7 jours.
test("revue_mdblist_reponse_bizarre", async () => {
  assert.equal(parseMdblist({ response: false, error: "Invalid API key" }), null);
  assert.equal(parseMdblist({ title: "x" }), null);
  assert.equal(await lireMdblist({ MDBLIST_API_KEY: "cle" }, "tt1", async () => json({ response: false, error: "limit" })), null);
});

// Revue : sans clé, le relais répond « aucune note » gardé 1 h (pas un échec en boucle) ; une panne répond
// { erreur: true } gardé 1 h (le CDN de Vercel ne garde jamais une 503), que les affiches lisent comme un échec.
test("revue_relais_sans_cle_et_panne", async () => {
  const req = (q) => new Request("https://affiches.test/api/notes?" + q);
  const sansCle = await makeNotes({ fetchImpl: async () => json(MDB), env: {} })(req("imdb=tt15239678"));
  assert.equal(sansCle.status, 200);
  assert.deepEqual(await sansCle.json(), { rt: null, mc: null, lb: null });
  assert.equal(sansCle.headers.get("Vercel-CDN-Cache-Control"), "max-age=3600");
  const panne = await makeNotes({ fetchImpl: async () => json({}, 500), env: { MDBLIST_API_KEY: "cle" } })(req("imdb=tt15239678"));
  assert.equal(panne.status, 200);
  assert.deepEqual(await panne.json(), { erreur: true });
  assert.equal(panne.headers.get("Cache-Control"), "public, max-age=3600");
  assert.equal(panne.headers.get("Vercel-CDN-Cache-Control"), "max-age=3600");
  assert.equal(await notesPlus("tt3", async () => json({ erreur: true }), "https://affiches.test"), null);
});
