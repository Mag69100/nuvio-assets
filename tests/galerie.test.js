// Galerie des styles d'affiches (worker/galerie.js) : rien que des codes de style, dédoublonnés, triés, paginés.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import worker from "../worker/index.js";
import { lireCode, PAR_PAGE, GALERIE_JS } from "../worker/galerie.js";
import { contenuStatique } from "../worker/statique.js";
import { DEFAUT_REGLAGES, MEMOIRES, ecrireReglages } from "../worker/lien-affiches.js";

// Une vraie base SQLite derrière l'interface de D1 (prepare, bind, first, all, run, batch).
function d1() {
  const db = new DatabaseSync(":memory:");
  const base = { requetes: 0 };
  const stmt = (sql, args = []) => ({
    sql, args,
    bind: (...a) => stmt(sql, a),
    async first() { base.requetes++; return db.prepare(sql).get(...args) ?? null; },
    async all() { base.requetes++; return { results: db.prepare(sql).all(...args) }; },
    async run() { base.requetes++; const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
  });
  base.prepare = (sql) => stmt(sql);
  base.batch = async (list) => list.map((s) => db.prepare(s.sql).run(...s.args));
  base.db = db;
  return base;
}

let env, store;
const ctx = { waitUntil: () => {} };
beforeEach(() => {
  store = new Map();
  globalThis.caches = { default: {
    match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
    put: async (req, res) => { store.set(req.url, await res.text()); },
    delete: async (req) => store.delete(req.url),
  } };
  env = { TMDB_API_KEY: "tmdb", LIENS: d1() };
});
const O = "https://nuvio-assets.xnzxflix.workers.dev";
const at = (path, init) => worker.fetch(new Request(O + path, init), env, ctx);
const post = (path, body, origin = O) => at(path, { method: "POST", headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body) });
const liste = async (tri = "populaires", page = 1) => (await at(`/galerie/styles.json?tri=${tri}&page=${page}`)).json();

// Des styles tous différents : taille du titre (17 crans) × police (5) × style de la note (4).
const style = (i) => {
  const r = structuredClone(DEFAUT_REGLAGES);
  r.titre.taille = 0.6 + (i % 17) * 0.05;
  r.texte.police = ["inter", "bebas", "elegante", "arrondie", "condensee"][Math.floor(i / 17) % 5];
  r.note.style = ["etoile", "nu", "grand", "badge"][Math.floor(i / 85) % 4];
  r.qualite.on = false;   // jamais un style tout prêt de la régie
  return ecrireReglages(r);
};

test("galerie_codes_valides_seulement", () => {
  assert.deepEqual(lireCode(style(3)), { code: style(3) });
  assert.deepEqual(lireCode(style(3) + "_" + style(4)), { code: style(3) + "_" + style(4) }, "paysage réglé à part");
  assert.deepEqual(lireCode(style(3) + "_"), { code: style(3) + "_" }, "paysage par défaut, portrait réglé");
  for (const nom of Object.keys(MEMOIRES)) assert.match(lireCode(ecrireReglages(MEMOIRES[nom])).erreur, /tout prêt/, nom);
  for (const mauvais of [null, 42, "<b>", "a b", "Q0Q0", style(3) + "_" + style(3), "x_y_z", "S0".repeat(500), "Zz"]) {
    assert.ok(lireCode(mauvais).erreur, String(mauvais));
  }
});

test("galerie_publier_puis_lister", async () => {
  assert.deepEqual(await liste(), { styles: [], page: 1, suivante: false }, "table pas encore créée : galerie vide");
  const res = await post("/galerie/publier", { code: style(1) });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, nouveau: true });
  // Le même style une seconde fois : un seul exemplaire.
  assert.deepEqual(await (await post("/galerie/publier", { code: style(1) })).json(), { ok: true, deja: true, n: 0 });
  await post("/galerie/publier", { code: style(2) });
  const nouveaux = await liste("nouveaux");
  assert.deepEqual(nouveaux.styles.map((s) => s.code), [style(2), style(1)]);
  assert.ok(nouveaux.styles.every((s) => Object.keys(s).join() === "code,n,t"), "rien d'autre que le code, le compte et la date");
});

test("galerie_imports_comptes_et_tri_populaires", async () => {
  for (const i of [1, 2, 3]) await post("/galerie/publier", { code: style(i) });
  for (let k = 0; k < 2; k++) assert.equal((await post("/galerie/importer", { code: style(2) })).status, 200);
  await post("/galerie/importer", { code: style(3) });
  const p = await liste("populaires");
  assert.deepEqual(p.styles.map((s) => [s.code, s.n]), [[style(2), 2], [style(3), 1], [style(1), 0]]);
  // Un style inconnu ne crée rien.
  await post("/galerie/importer", { code: style(9) });
  assert.equal(env.LIENS.db.prepare("SELECT COUNT(*) AS c FROM galerie").get().c, 3);
});

test("galerie_pages_de_24", async () => {
  for (let i = 0; i < PAR_PAGE + 5; i++) assert.equal((await post("/galerie/publier", { code: style(i) })).status, 200, String(i));
  const p1 = await liste("nouveaux", 1), p2 = await liste("nouveaux", 2);
  assert.equal(p1.styles.length, PAR_PAGE);
  assert.ok(p1.suivante);
  assert.equal(p2.styles.length, 5);
  assert.ok(!p2.suivante);
  assert.equal(new Set([...p1.styles, ...p2.styles].map((s) => s.code)).size, PAR_PAGE + 5);
});

test("galerie_page_gardee_une_minute", async () => {
  await post("/galerie/publier", { code: style(1) });
  const res = await at("/galerie/styles.json?tri=populaires&page=1");
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=60");
  const avant = env.LIENS.requetes;
  await liste("populaires");
  assert.equal(env.LIENS.requetes, avant, "relue dans le cache, pas dans la base");
  // Une publication montre tout de suite le nouveau style en tête des « Nouveaux » (ce centre de Cloudflare).
  await liste("nouveaux");
  await post("/galerie/publier", { code: style(2) });
  assert.equal((await liste("nouveaux")).styles[0].code, style(2));
});

test("galerie_refuse_ce_qui_ne_vient_pas_du_site", async () => {
  assert.equal((await post("/galerie/publier", { code: style(1) }, "https://ailleurs.exemple")).status, 403);
  assert.equal((await post("/galerie/publier", { code: style(1) }, null)).status, 403);
  assert.equal((await post("/galerie/publier", { code: "<script>" })).status, 400);
  assert.match((await (await post("/galerie/publier", { code: "" })).json()).error, /tout prêt/);
  assert.equal((await at("/galerie/publier")).status, 405);
  assert.equal((await at("/galerie/autre")).status, 404);
  assert.equal(env.LIENS.db.prepare("SELECT name FROM sqlite_master WHERE name = 'galerie'").get(), undefined, "rien n'a été écrit");
});

test("galerie_limite_par_adresse_ip", async () => {
  const cles = [];
  env.LIMITE_GALERIE = { limit: async ({ key }) => { cles.push(key); return { success: cles.length <= 3 }; } };
  for (let i = 0; i < 3; i++) assert.equal((await post("/galerie/publier", { code: style(i) })).status, 200);
  const res = await post("/galerie/publier", { code: style(5) });
  assert.equal(res.status, 429);
  assert.match((await res.json()).error, /minute/);
  assert.ok(cles.every((k) => k.startsWith("publier:")));
});

test("galerie_sans_base", async () => {
  delete env.LIENS;
  assert.equal((await at("/galerie/styles.json")).status, 501);
  assert.equal((await post("/galerie/publier", { code: style(1) })).status, 501);
});

test("galerie_dans_la_regie", () => {
  const js = contenuStatique("salle2-galerie.js");
  assert.equal(js, GALERIE_JS);
  assert.doesNotThrow(() => new Function(js));
  // Essayer un style passe par regieChange : « ↶ Annuler » de la régie le défait.
  assert.match(js, /regieChange\(\(\) => \{ regieR = lu\.r; regieRP = lu\.rp; \}\)/);
  // Un import compté une fois par navigateur ; le stockage toujours entouré de try.
  assert.match(js, /try \{ deja = JSON\.parse\(localStorage\.getItem\(IMPORTES\)/);
  // Une seule affiche, du même film, pour chaque style.
  assert.match(js, /const FILM = \{"id":"tt1375666"/);
  assert.match(js, /NV\.ppSrc\(FILM, "poster", /);
});
