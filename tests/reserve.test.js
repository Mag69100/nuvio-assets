import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
import { nettoyerReserve } from "../worker/reserve.js";

// Base D1 simulée : juste les requêtes de reserve.js (clé → { img, n, t }).
function fakeD1() {
  const rows = new Map();
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async run() {
      if (sql.startsWith("CREATE")) return {};
      if (sql.startsWith("INSERT OR REPLACE")) { const [k, img, n, t] = args; rows.set(k, { img: [...img], n, t }); return {}; }
      if (sql.startsWith("UPDATE")) { rows.get(args[1]).t = args[0]; return {}; }
      if (sql.startsWith("DELETE FROM affiches WHERE t < ?")) { for (const [k, r] of [...rows]) if (r.t < args[0]) rows.delete(k); return {}; }
      if (sql.startsWith("DELETE FROM affiches WHERE t = ?")) { for (const [k, r] of [...rows]) if (r.t === args[0]) rows.delete(k); return {}; }
      throw new Error("requête inattendue : " + sql);
    },
    async first() {
      // D1 rend un BLOB comme un tableau d'octets.
      if (sql.startsWith("SELECT img")) { const r = rows.get(args[0]); return r ? { img: r.img, t: r.t } : null; }
      if (sql.startsWith("SELECT COALESCE")) return { total: [...rows.values()].reduce((s, r) => s + r.n, 0) };
      if (sql.startsWith("SELECT t, SUM(n)")) {
        const parJour = new Map();
        for (const r of rows.values()) parJour.set(r.t, (parJour.get(r.t) || 0) + r.n);
        const t = [...parJour.keys()].sort()[0];
        return t ? { t, n: parJour.get(t) } : null;
      }
      throw new Error("requête inattendue : " + sql);
    },
  });
  return { rows, prepare: (sql) => stmt(sql) };
}

const ctx = { waitUntil: () => {} };
const CLE = "a".repeat(40);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const appel = (env, { cle = CLE, method = "GET", body, relais = "cle" } = {}) =>
  worker.fetch(new Request(`https://x/reserve/${cle}`, { method, body, headers: relais ? { "X-Relais-Cle": relais } : {} }), env, ctx);
const jour = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

test("reserve_garde_puis_rend", async () => {
  const env = { RELAIS_KEY: "cle", RESERVE: fakeD1() };
  assert.equal((await appel(env)).status, 404);
  assert.equal((await appel(env, { method: "PUT", body: JPG })).status, 204);
  const res = await appel(env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "image/jpeg");
  assert.deepEqual(new Uint8Array(await res.arrayBuffer()), JPG);
});

test("reserve_lue_gardee_plus_longtemps", async () => {
  const env = { RELAIS_KEY: "cle", RESERVE: fakeD1() };
  env.RESERVE.rows.set(CLE, { img: [...JPG], n: JPG.length, t: jour(5) });
  await appel(env);
  assert.equal(env.RESERVE.rows.get(CLE).t, jour(0));
});

test("reserve_refuse_sans_la_cle_ou_hors_jpeg", async () => {
  const env = { RELAIS_KEY: "cle", RESERVE: fakeD1() };
  assert.equal((await appel(env, { relais: "mauvaise" })).status, 403);
  assert.equal((await appel(env, { relais: "" })).status, 403);
  assert.equal((await appel(env, { cle: "pas-une-cle" })).status, 400);
  assert.equal((await appel(env, { method: "PUT", body: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) })).status, 400);
  assert.equal((await appel(env, { method: "PUT", body: new Uint8Array(500 * 1024).fill(0xff) })).status, 400);
  assert.equal((await appel(env, { method: "DELETE" })).status, 405);
  assert.equal(env.RESERVE.rows.size, 0);
});

test("reserve_absente_sur_les_copies", async () => {
  assert.equal((await appel({ RESERVE: fakeD1() })).status, 404);
  assert.equal((await appel({ RELAIS_KEY: "cle" })).status, 404);
});

test("reserve_menage_de_la_nuit", async () => {
  const env = { RESERVE: fakeD1() };
  const rang = (k, n, t) => env.RESERVE.rows.set(k, { img: [], n, t });
  rang("vieille", 10, jour(9));      // pas lue depuis plus de 8 jours : oubliée
  rang("recente", 10, jour(1));
  await nettoyerReserve(env);
  assert.deepEqual([...env.RESERVE.rows.keys()], ["recente"]);
  // Au-delà de 400 Mo : les jours de lecture les plus anciens partent d'abord.
  rang("a", 300 * 1024 * 1024, jour(3));
  rang("b", 150 * 1024 * 1024, jour(2));
  await nettoyerReserve(env);
  assert.deepEqual([...env.RESERVE.rows.keys()].sort(), ["b", "recente"]);
});
