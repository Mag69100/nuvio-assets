import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { isNewerStep, notesBetween, updateInfo } from "../worker/hote.js";

const HISTORY = "https://github.com/xnzx07/nuvio-assets/commits/main";
const COMMITS = ["v5.23.1 : B", "Merge branch 'main'", "v5.23.0 : A", "v5.22.3 : vieux"].map((message) => ({ commit: { message } }));

// GitHub simulé : le fichier brut de worker/index.js et l'API des commits.
let raw, api;
beforeEach(() => {
  raw = () => new Response('const VERSION = "5.23.1";');
  api = () => new Response(JSON.stringify(COMMITS));
  globalThis.fetch = async (url) => (String(url).includes("api.github.com") ? api() : raw());
});

test("palier_plus_recent", () => {
  assert.equal(isNewerStep("5.23.0", "5.22.3"), true);
  assert.equal(isNewerStep("5.22.9", "5.22.3"), false);
  assert.equal(isNewerStep("6.0.0", "5.22.3"), true);
  assert.equal(isNewerStep("5.22.3", "5.23.0"), false);
});

test("nouveautes_entre_versions", () => {
  assert.deepEqual(notesBetween(COMMITS, "5.22.3", "5.23.1"), ["B", "A"]);
});

test("mise_a_jour_proposee", async () => {
  assert.deepEqual(await updateInfo("5.22.3"), { version: "5.23.1", notes: ["B", "A"], history: HISTORY });
});

test("pas_de_palier_plus_recent", async () => {
  assert.equal(await updateInfo("5.23.0"), null);
});

test("github_injoignable", async () => {
  globalThis.fetch = async () => { throw new Error("réseau"); };
  assert.equal(await updateInfo("5.22.3"), null);
});

test("api_limite_atteinte", async () => {
  api = () => new Response("{}", { status: 403 });
  assert.deepEqual(await updateInfo("5.22.3"), { version: "5.23.1", notes: [], history: HISTORY });
});

test("github_delai_et_pas_d_erreur_en_cache", async () => {
  const seen = [];
  globalThis.fetch = async (url, init = {}) => { seen.push(init); return String(url).includes("api.github.com") ? api() : raw(); };
  await updateInfo("5.22.3");
  assert.ok(seen.length >= 2);
  for (const init of seen) {
    assert.ok(init.signal, "délai maximal");
    assert.equal(init.cf.cacheTtlByStatus["400-599"], 0);
  }
});
