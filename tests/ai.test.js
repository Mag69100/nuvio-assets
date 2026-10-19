import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { aiEnv, aiProfile, aiProfiles, aiTitles, aiMiss } from "../worker/ai.js";

// Cache Cloudflare simulé (clé = adresse) et fetch espion : chaque test choisit ce que répond Gemini.
let store, calls, answer;
beforeEach(() => {
  store = new Map();
  calls = [];
  answer = () => new Response("{}", { status: 500 });
  globalThis.caches = {
    default: {
      match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
      put: async (req, res) => { store.set(req.url, await res.text()); },
    },
  };
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), key: (init.headers || {})["x-goog-api-key"] });
    return answer();
  };
});
const geminiSays = (obj) => () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }));

test("aiEnv_cle_utilisateur", () => {
  const env = { GEMINI_API_KEY: "INST", X: 1 };
  const out = aiEnv(env, { k: "USER" });
  assert.equal(out.GEMINI_API_KEY, "USER");
  assert.equal(out.X, 1);
  assert.equal(env.GEMINI_API_KEY, "INST");
});

test("aiEnv_sans_cle_prive", () => {
  assert.equal(aiEnv({ GEMINI_API_KEY: "INST" }, { k: "" }).GEMINI_API_KEY, "");
});

test("aiEnv_sans_cle_public", () => {
  assert.equal(aiEnv({ GEMINI_API_KEY: "INST", GEMINI_PUBLIC: "on" }, { k: "" }).GEMINI_API_KEY, "INST");
});

test("lecture_seule_en_cache", async () => {
  store.set("https://cache.local/profile/v2/movie-1", JSON.stringify({ pourQui: "Pour toi", aSavoir: "" }));
  const r = await aiProfile({ GEMINI_API_KEY: "" }, null, "movie-1", "…");
  assert.equal(r.pourQui, "Pour toi");
  assert.equal(r.cached, true);
  assert.equal(calls.length, 0);
});

test("lecture_seule_absent", async () => {
  const r = await aiProfile({ GEMINI_API_KEY: "" }, null, "movie-5", "…");
  assert.equal(r.pourQui, "");
  assert.equal(r.error, undefined);
  assert.equal(calls.length, 0);
});

test("cle_refusee_au_repos", async () => {
  answer = () => new Response(JSON.stringify({ error: { message: "API key not valid" } }), { status: 403 });
  const r = await aiProfile({ GEMINI_API_KEY: "BAD-KEY-1" }, null, "movie-2", "…");
  assert.ok(r.error);
  const before = calls.length;
  assert.ok(before > 0);
  await aiProfile({ GEMINI_API_KEY: "BAD-KEY-1" }, null, "movie-3", "…");
  assert.equal(calls.length, before);
});

test("repos_par_cle", async () => {
  answer = () => new Response("{}", { status: 429 });
  await aiProfile({ GEMINI_API_KEY: "QUOTA-KEY-A" }, null, "movie-6", "…");
  answer = geminiSays({ pour_qui: "Pour B", a_savoir: "" });
  calls = [];
  const r = await aiProfile({ GEMINI_API_KEY: "OTHER-KEY-B" }, null, "movie-4", "…");
  assert.ok(calls.length > 0);
  assert.equal(calls[0].key, "OTHER-KEY-B");
  assert.equal(r.pourQui, "Pour B");
});

test("recherche_sans_cle_en_cache", async () => {
  store.set(`https://cache.local/ai/v5/${encodeURIComponent("film ou un mec revit la meme journee")}`, JSON.stringify([{ title: "Groundhog Day", year: 1993 }]));
  const r = await aiTitles({ GEMINI_API_KEY: "" }, null, "film où un mec revit la même journée");
  assert.deepEqual(r.titles, [{ title: "Groundhog Day", year: 1993 }]);
  assert.equal(aiMiss(r), null);
  assert.equal(calls.length, 0);
});

test("recherche_sans_cle_absente", async () => {
  const r = await aiTitles({ GEMINI_API_KEY: "" }, null, "une requete jamais posee");
  assert.equal(aiMiss(r), "absent");
  assert.equal(calls.length, 0);
});

test("recherche_attente_ou_erreur", () => {
  assert.equal(aiMiss(null), "attente");
  assert.equal(aiMiss({ titles: [], error: "429" }), "erreur");
});

test("limite_bonus_par_cle", async () => {
  answer = geminiSays({ pour_qui: "Pour toi", a_savoir: "" });
  for (let i = 0; i < 6; i++) await aiProfile({ GEMINI_API_KEY: "LIMIT-KEY-A" }, null, `limit-a-${i}`, "…");
  const refused = await aiProfile({ GEMINI_API_KEY: "LIMIT-KEY-A" }, null, "limit-a-7", "…");
  assert.equal(refused.error, "trop de demandes cette minute");
  const other = await aiProfile({ GEMINI_API_KEY: "LIMIT-KEY-B" }, null, "limit-b-1", "…");
  assert.equal(other.pourQui, "Pour toi");
});

const row = (n) => [{ key: `movie-${n}`, id: n, text: "Film : « Test »" }];

test("rangee_sans_cle", async () => {
  const r = await aiProfiles({ GEMINI_API_KEY: "" }, row(900));
  assert.equal(r.asked, 0);
  assert.equal(calls.length, 0);
});

test("rangee_repos_par_cle", async () => {
  answer = () => new Response("{}", { status: 429 });
  await aiProfiles({ GEMINI_API_KEY: "ROW-KEY-AAAAAAAA" }, row(901));
  calls = [];
  await aiProfiles({ GEMINI_API_KEY: "ROW-KEY-AAAAAAAA" }, row(903));
  assert.equal(calls.length, 0);
  answer = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ items: [{ id: 902, pour_qui: "Pour B", a_savoir: "" }] }) }] } }] }));
  calls = [];
  const r = await aiProfiles({ GEMINI_API_KEY: "ROW-KEY-BBBBBBBB" }, row(902));
  assert.equal(calls[0].key, "ROW-KEY-BBBBBBBB");
  assert.equal(r.saved, 1);
});
