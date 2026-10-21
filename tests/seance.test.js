import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
import { codeSeance, SEANCE_ID } from "../worker/seance.js";

// Base D1 simulée : juste les requêtes de seance.js.
function fakeD1() {
  const rows = new Map(), sql = [];
  const stmt = (q, args = []) => ({
    bind: (...a) => stmt(q, a),
    async run() {
      sql.push(q);
      if (q.startsWith("CREATE")) return {};
      if (q.startsWith("INSERT OR REPLACE INTO seances")) { rows.set(args[0], args[1]); return {}; }
      if (q.startsWith("DELETE FROM seances")) { for (const [k, t] of rows) if (t < args[0]) rows.delete(k); return {}; }
      throw new Error("requête inattendue : " + q);
    },
    async first() {
      if (!q.startsWith("SELECT t FROM seances")) throw new Error("requête inattendue : " + q);
      return rows.has(args[0]) ? { t: rows.get(args[0]) } : null;
    },
  });
  return { rows, sql, prepare: (q) => stmt(q) };
}

let store, appels;
beforeEach(() => {
  store = new Map(); appels = [];
  globalThis.caches = {
    default: {
      match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
      put: async (req, res) => { store.set(req.url, await res.text()); },
    },
  };
  globalThis.fetch = async (url) => { appels.push(String(url)); return new Response(JSON.stringify({ results: [] })); };
});
const ctx = { waitUntil: () => {} };
const O = "https://nuvio-assets.xnzxflix.workers.dev";
const at = (env, path) => worker.fetch(new Request(O + path), env, ctx);
const cherche = (env, type, q) => at(env, `/catalog/${type}/recherche-${type === "movie" ? "films" : "series"}/search=${encodeURIComponent(q)}.json`);

test("mot_de_passe_reconnu", () => {
  for (const q of ["séance 4821", "Séance 4821", "SÉANCE 4821", "seance4821", "  seance   4821 ", "séance 4821"]) assert.equal(codeSeance(q), "4821", q);
  for (const q of ["séance", "séance 482", "séance 48210", "la séance 4821", "séances 4821", "4821", "dune"]) assert.equal(codeSeance(q), null, q);
});

test("seance_notee_par_la_recherche_puis_vue_par_le_guide", async () => {
  const env = { TMDB_API_KEY: "tmdb", LIENS: fakeD1() };
  assert.deepEqual(await (await at(env, "/seance/4821")).json(), { ok: false });
  const res = await cherche(env, "movie", "Séance 4821");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  const { metas } = await res.json();
  assert.equal(metas.length, 1);
  assert.equal(metas[0].id, SEANCE_ID);
  assert.equal(metas[0].name, "✓ Salle connectée");
  assert.equal(metas[0].poster, O + "/logo.png");
  // Rien demandé à TMDB, rien gardé dans le cache des rangées.
  assert.equal(appels.length, 0);
  assert.ok(![...store.keys()].some((k) => k.includes("/catalog/")));
  const vu = await at(env, "/seance/4821");
  assert.equal(vu.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await vu.json(), { ok: true });
  assert.deepEqual(await (await at(env, "/seance/1234")).json(), { ok: false });
  // La rangée « Séries » note aussi le code, sans montrer la carte une deuxième fois.
  assert.deepEqual((await (await cherche(env, "series", "seance 5555")).json()).metas, []);
  assert.deepEqual(await (await at(env, "/seance/5555")).json(), { ok: true });
});

test("seance_aussi_depuis_un_lien_perso", async () => {
  const env = { TMDB_API_KEY: "tmdb", LIENS: fakeD1() };
  const seg = Buffer.from(JSON.stringify({ n: "Salon" })).toString("base64url");
  const { metas } = await (await at(env, `/${seg}/catalog/movie/recherche-films/search=s%C3%A9ance%207777.json`)).json();
  assert.equal(metas[0].id, SEANCE_ID);
  assert.deepEqual(await (await at(env, "/seance/7777")).json(), { ok: true });
});

test("seance_valable_15_minutes", async () => {
  const env = { TMDB_API_KEY: "tmdb", LIENS: fakeD1() };
  env.LIENS.rows.set("2468", Date.now() - 16 * 60e3);
  assert.deepEqual(await (await at(env, "/seance/2468")).json(), { ok: false });
  env.LIENS.rows.set("2468", Date.now() - 14 * 60e3);
  assert.deepEqual(await (await at(env, "/seance/2468")).json(), { ok: true });
});

test("seance_sans_base_dans_le_cache", async () => {
  // Copie sans D1 : le code passe par le cache de Cloudflare (propre à chaque centre de données).
  const env = { TMDB_API_KEY: "tmdb" };
  await cherche(env, "movie", "séance 1357");
  assert.deepEqual(await (await at(env, "/seance/1357")).json(), { ok: true });
  assert.deepEqual(await (await at(env, "/seance/1358")).json(), { ok: false });
});

test("seance_table_absente_et_codes_invalides", async () => {
  const env = { TMDB_API_KEY: "tmdb", LIENS: { prepare: () => ({ bind: () => ({ first: async () => { throw new Error("D1_ERROR: no such table: seances"); } }) }) } };
  assert.deepEqual(await (await at(env, "/seance/4821")).json(), { ok: false });
  for (const c of ["482", "abcd", "48211"]) assert.equal((await at(env, "/seance/" + c)).status, 400, c);
  assert.equal((await worker.fetch(new Request(O + "/seance/4821", { method: "POST" }), env, ctx)).status, 405);
});

test("seance_limite_par_adresse", async () => {
  const env = { TMDB_API_KEY: "tmdb", LIENS: fakeD1(), LIMITE_SEANCE: { limit: async () => ({ success: false }) } };
  const { metas } = await (await cherche(env, "movie", "séance 9999")).json();
  assert.equal(metas.length, 1);   // la carte reste, mais le code n'est pas noté
  assert.equal(env.LIENS.rows.size, 0);
});

test("fiche_de_la_carte_seance", async () => {
  const env = { TMDB_API_KEY: "tmdb" };
  const m = await (await at(env, "/manifest.json")).json();
  const meta = m.resources.find((r) => r.name === "meta");
  assert.ok(meta.idPrefixes.includes("catfr-"));
  const { meta: fiche } = await (await at(env, `/meta/movie/${SEANCE_ID}.json`)).json();
  assert.equal(fiche.name, "✓ Salle connectée");
  assert.match(fiche.description, /guide/);
  assert.equal(appels.length, 0);
});

test("recherche_ordinaire_inchangee", async () => {
  const env = { TMDB_API_KEY: "tmdb", LIENS: fakeD1() };
  const res = await cherche(env, "movie", "dune");
  assert.notEqual(res.headers.get("Cache-Control"), "no-store");
  assert.ok(appels.length > 0);
  assert.equal(env.LIENS.rows.size, 0);
});
