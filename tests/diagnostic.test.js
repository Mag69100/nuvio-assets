import { test, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
import { PANNES, resumePannes, pannesHTML } from "../worker/pannes.js";

// Gemini simulé : chaque appel est gardé (adresse, en-têtes, corps) ; `gemini` fabrique la réponse.
let appels, gemini;
beforeEach(() => {
  appels = [];
  gemini = () => ({ lisible: true, lu: "Aucune source trouvée", faq: "aucune-source", conseil: "Vérifie ton abonnement AllDebrid premium." });
  globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };
  globalThis.fetch = async (url, init = {}) => {
    appels.push({ url: String(url), headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : null });
    const r = gemini();
    if (r instanceof Response) return r;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] }));
  };
});
const ctx = { waitUntil: () => {} };
const O = "https://nuvio-assets.xnzxflix.workers.dev";
// Un faux JPEG : l'en-tête FF D8 FF, puis du remplissage.
const JPEG = new Uint8Array(2000).fill(7); JPEG.set([0xff, 0xd8, 0xff, 0xe0]);
const cle = (n) => `AIzaSyTestDiagnosticabcdefghijklmno${String(n).padStart(4, "0")}`;   // fin différente : repos de Gemini par clé
const envoi = (env, { body = JPEG, key, origin = O, headers = {} } = {}) => worker.fetch(new Request(O + "/diagnostic", {
  method: "POST", body,
  headers: { "Content-Type": "image/jpeg", ...(origin ? { Origin: origin } : {}), ...(key ? { "X-Cle-Gemini": key } : {}), ...headers },
}), env, ctx);

test("pannes_une_seule_fois", () => {
  // Les pannes du guide et celles données à Gemini viennent de la même liste.
  const ids = PANNES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z-]+$/);
  const lignes = resumePannes().split("\n");
  assert.equal(lignes.length, PANNES.length);
  for (const [i, p] of PANNES.entries()) {
    assert.ok(lignes[i].startsWith(p.id + " — "), lignes[i]);
    assert.doesNotMatch(lignes[i], /<|>|&quot;/);
    assert.ok(pannesHTML().includes(`id="panne-${p.id}"`));
  }
  assert.match(resumePannes(), /aucune-source — Aucune source quand je clique sur Regarder : Vérifie que ton abonnement AllDebrid premium est actif \(étape 5\) : l'essai gratuit de 7 jours ne suffit pas\./);
});

test("diagnostic_avec_la_cle_de_la_personne", async () => {
  const k = cle(1);
  const res = await envoi({ TMDB_API_KEY: "x" }, { key: k });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await res.json(), { lisible: true, lu: "Aucune source trouvée", faq: "aucune-source", conseil: "Vérifie ton abonnement AllDebrid premium." });
  assert.equal(appels.length, 1);
  const a = appels[0];
  assert.match(a.url, /generativelanguage\.googleapis\.com/);
  assert.doesNotMatch(a.url, /gemini-3\.6-flash/);   // le modèle rare reste pour la recherche
  assert.equal(a.headers["x-goog-api-key"], k);
  const [texte, image] = a.body.contents[0].parts;
  assert.equal(image.inlineData.mimeType, "image/jpeg");
  assert.equal(image.inlineData.data, Buffer.from(JPEG).toString("base64"));
  for (const p of PANNES) assert.ok(texte.text.includes(p.id + " — "), p.id);
  assert.deepEqual(a.body.generationConfig.responseSchema.properties.faq.enum, [...PANNES.map((p) => p.id), "aucune"]);
});

test("diagnostic_sans_cle", async () => {
  // Ni clé à soi, ni clé de l'instance partagée : on l'explique, sans rien envoyer à Gemini.
  for (const env of [{ TMDB_API_KEY: "x" }, { TMDB_API_KEY: "x", GEMINI_API_KEY: cle(2) }]) {
    assert.deepEqual(await (await worker.fetch(new Request(O + "/diagnostic"), env, ctx)).json(), { ia: false });
    const res = await envoi(env);
    assert.equal(res.status, 401);
    assert.equal((await res.json()).cle, "absente");
  }
  assert.equal(appels.length, 0);
});

test("diagnostic_avec_la_cle_de_l_instance_partagee", async () => {
  const env = { TMDB_API_KEY: "x", GEMINI_API_KEY: cle(3), GEMINI_PUBLIC: "on" };
  assert.deepEqual(await (await worker.fetch(new Request(O + "/diagnostic"), env, ctx)).json(), { ia: true });
  assert.equal((await envoi(env)).status, 200);
  assert.equal(appels[0].headers["x-goog-api-key"], cle(3));
  // Une clé de visiteur mal formée ne remplace pas celle de l'instance.
  assert.equal((await envoi(env, { key: "pas une clé" })).status, 200);
  assert.equal(appels[1].headers["x-goog-api-key"], cle(3));
});

test("diagnostic_refuse_ce_qui_ne_vient_pas_du_guide", async () => {
  const env = { TMDB_API_KEY: "x", GEMINI_API_KEY: cle(4), GEMINI_PUBLIC: "on" };
  assert.equal((await envoi(env, { origin: "https://ailleurs.exemple" })).status, 403);
  assert.equal((await envoi(env, { origin: null })).status, 403);
  assert.equal((await envoi(env, { body: new Uint8Array(1_600_000).fill(1) })).status, 413);
  assert.equal((await envoi(env, { body: new TextEncoder().encode("<html>" + "x".repeat(500)) })).status, 400);
  assert.equal((await worker.fetch(new Request(O + "/diagnostic", { method: "PUT", headers: { Origin: O } }), env, ctx)).status, 405);
  assert.equal(appels.length, 0);
});

test("diagnostic_limite_par_adresse", async () => {
  const env = { TMDB_API_KEY: "x", LIMITE_DIAGNOSTIC: { limit: async () => ({ success: false }) } };
  const res = await envoi(env, { key: cle(5) });
  assert.equal(res.status, 429);
  assert.match((await res.json()).error, /minute/);
  assert.equal(appels.length, 0);
});

test("diagnostic_reponses_de_gemini_tenues", async () => {
  // Panne inventée : aucune panne ouverte ; textes coupés ; photo floue.
  gemini = () => ({ lisible: true, lu: "x".repeat(500), faq: "panne-inventee", conseil: "Fais ceci.\n\nPuis cela." });
  const j = await (await envoi({ TMDB_API_KEY: "x" }, { key: cle(6) })).json();
  assert.equal(j.faq, null);
  assert.equal(j.lu.length, 160);
  assert.equal(j.conseil, "Fais ceci. Puis cela.");
  gemini = () => ({ lisible: false, lu: "", faq: "aucune", conseil: "" });
  const flou = await (await envoi({ TMDB_API_KEY: "x" }, { key: cle(6) })).json();
  assert.equal(flou.lisible, false);
  assert.equal(flou.faq, null);
});

test("diagnostic_quota_et_cle_refusee", async () => {
  const warn = mock.method(console, "warn", () => {});
  try {
    gemini = () => new Response(JSON.stringify({ error: { message: "Resource exhausted" } }), { status: 429 });
    const quota = await envoi({ TMDB_API_KEY: "x" }, { key: cle(7) });
    assert.equal(quota.status, 429);
    assert.match((await quota.json()).error, /quota/);
    gemini = () => new Response(JSON.stringify({ error: { message: "API key not valid. Please pass a valid API key." } }), { status: 400 });
    const refus = await envoi({ TMDB_API_KEY: "x" }, { key: cle(8) });
    assert.equal(refus.status, 502);
    assert.match((await refus.json()).error, /clé Gemini est refusée/);
    // Rien de la photo (ni de la clé) dans le journal.
    const journal = JSON.stringify(warn.mock.calls.map((c) => c.arguments));
    assert.ok(!journal.includes(Buffer.from(JPEG).toString("base64").slice(0, 40)));
    assert.ok(!journal.includes(cle(8)));
  } finally { warn.mock.restore(); }
});
