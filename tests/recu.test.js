// « Ta TV l'a reçu » : le site note quand Nuvio relit le manifest d'un lien fixe (colonne vu de la table liens),
// au plus une fois par 10 minutes sauf juste après un enregistrement, et ne le dit qu'à qui a la clé de modification.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

// Base D1 simulée : les requêtes de fixe.js, avec la colonne vu (absente au départ si sansColonne).
function fakeD1({ sansColonne = false } = {}) {
  const rows = new Map();
  const base = { rows, ecritures: 0, alter: 0, colonne: !sansColonne };
  const manque = () => { if (!base.colonne) throw new Error("D1_ERROR: no such column: vu: SQLITE_ERROR"); };
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async run() {
      if (sql.startsWith("CREATE")) return {};
      if (sql.startsWith("ALTER")) { base.alter++; if (base.colonne) throw new Error("duplicate column name: vu"); base.colonne = true; return {}; }
      if (sql.startsWith("INSERT")) { const [h, c, e, t] = args; rows.set(h, { c, e, t, vu: null }); return {}; }
      if (sql.startsWith("UPDATE liens SET vu")) {
        manque();
        const [vu, h, avant] = args, r = rows.get(h);
        if (r && (r.vu == null || r.vu < avant || r.vu < r.t)) { r.vu = vu; base.ecritures++; }
        return {};
      }
      if (sql.startsWith("UPDATE")) { const [c, t, h] = args; rows.set(h, { ...rows.get(h), c, t }); return {}; }
      throw new Error("requête inattendue : " + sql);
    },
    async first() {
      const r = rows.get(args[0]);
      if (sql.includes("vu")) manque();
      if (!r) return null;
      return sql.startsWith("SELECT c, e, t, vu") ? { ...r } : sql.startsWith("SELECT c, e") ? { c: r.c, e: r.e } : { e: r.e };
    },
  });
  base.prepare = (sql) => stmt(sql);
  return base;
}

let env, enCours;
const ctx = { waitUntil: (p) => enCours.push(p) };
beforeEach(() => {
  const store = new Map();
  globalThis.caches = {
    default: {
      match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
      put: async (req, res) => { store.set(req.url, await res.text()); },
    },
  };
  globalThis.fetch = async (url) => new Response(String(url).endsWith("collections.json") ? "[]" : JSON.stringify({ results: [] }));
  env = { TMDB_API_KEY: "tmdb", LIENS: fakeD1() };
  enCours = [];
});
const O = "https://nuvio-assets.xnzxflix.workers.dev";
const at = async (path, init) => { const r = await worker.fetch(new Request(O + path, init), env, ctx); await Promise.all(enCours); return r; };
const post = (path, body) => at(path, { method: "POST", headers: { "Content-Type": "application/json", Origin: O }, body: JSON.stringify(body) });
const seg = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const lire = async (id, modif) => (await post(`/lien-fixe/${id}/lire`, { modif })).json();
// Nuvio (appli, pas de Sec-Fetch-*) relit le manifest.
const nuvio = (id) => at(`/${id}/manifest.json`, { headers: { "User-Agent": "okhttp/4.12.0" } });

test("recu_pas_encore_puis_lu_par_nuvio", async () => {
  const { id, modif } = await (await post("/lien-fixe", { c: seg({ n: "Salon" }) })).json();
  const avant = await lire(id, modif);
  assert.equal(avant.vu, 0);
  assert.ok(avant.t > 0 && Math.abs(avant.maintenant - Date.now()) < 5000);
  await nuvio(id);
  const apres = await lire(id, modif);
  assert.ok(apres.vu >= apres.t, "lu après la création");
});

test("recu_en_attente_apres_un_enregistrement_puis_recu", async () => {
  const { id, modif } = await (await post("/lien-fixe", { c: seg({ n: "Avant" }) })).json();
  await nuvio(id);
  await new Promise((ok) => setTimeout(ok, 5));
  const enr = await (await post(`/lien-fixe/${id}`, { c: seg({ n: "Après" }), modif })).json();
  assert.ok(enr.ok && enr.t > 0);
  const attente = await lire(id, modif);
  assert.ok(attente.vu < attente.t, "pas encore relu depuis l'enregistrement");
  // Juste après un enregistrement, la lecture est notée même moins de 10 min après la précédente.
  await nuvio(id);
  const recu = await lire(id, modif);
  assert.ok(recu.vu >= recu.t);
});

test("recu_au_plus_une_ecriture_par_10_minutes", async () => {
  const { id } = await (await post("/lien-fixe", { c: "" })).json();
  for (let i = 0; i < 5; i++) await nuvio(id);
  assert.equal(env.LIENS.ecritures, 1);
  // Onze minutes plus tard : de nouveau notée.
  for (const r of env.LIENS.rows.values()) { r.vu -= 11 * 60e3; r.t -= 11 * 60e3; }
  await nuvio(id);
  assert.equal(env.LIENS.ecritures, 2);
});

test("recu_pas_les_navigateurs_ni_le_site", async () => {
  const { id, modif } = await (await post("/lien-fixe", { c: "" })).json();
  await at(`/${id}/manifest.json`, { headers: { "Sec-Fetch-Mode": "navigate", "Sec-Fetch-Site": "none" } });
  await at(`/${id}/manifest.json`, { headers: { "Sec-Fetch-Mode": "cors", "Sec-Fetch-Site": "same-origin" } });
  // Les rangées et les collections ne comptent pas : seul le manifest dit que Nuvio a relu le lien.
  await at(`/${id}/collections.json`);
  assert.equal((await lire(id, modif)).vu, 0);
  assert.equal(env.LIENS.ecritures, 0);
});

test("recu_seulement_avec_la_cle_de_modification", async () => {
  const { id } = await (await post("/lien-fixe", { c: "" })).json();
  await nuvio(id);
  const res = await post(`/lien-fixe/${id}/lire`, { modif: "x".repeat(22) });
  assert.equal(res.status, 403);
  assert.doesNotMatch(await res.text(), /"vu"/);
  assert.doesNotMatch(await (await nuvio(id)).text(), /"vu"/);
});

// Base d'avant (sans la colonne vu) : elle est ajoutée une fois, à la première lecture, puis tout marche.
test("recu_colonne_ajoutee_aux_bases_d_avant", async () => {
  env.LIENS = fakeD1({ sansColonne: true });
  const { id, modif } = await (await post("/lien-fixe", { c: "" })).json();
  await nuvio(id);
  assert.ok(env.LIENS.colonne);
  const j = await lire(id, modif);
  assert.ok(j.vu > 0);
  assert.equal(env.LIENS.alter, 1);
});

// Sans base (copie sans D1) : rien à noter, le manifest répond comme avant.
test("recu_sans_base", async () => {
  delete env.LIENS;
  const res = await at("/manifest.json");
  assert.equal(res.status, 200);
});
