import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

// Base D1 simulée : juste les requêtes de cpu.js (un total par jour UTC).
function fakeD1() {
  const rows = new Map();
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async run() {
      if (sql.startsWith("CREATE")) return {};
      if (sql.startsWith("INSERT")) { const [j, ms] = args; rows.set(j, (rows.get(j) || 0) + ms); return {}; }
      if (sql.startsWith("DELETE")) { for (const j of [...rows.keys()]) if (j < args[0]) rows.delete(j); return {}; }
      throw new Error("requête inattendue : " + sql);
    },
    async first() { return { t: [...rows].filter(([j]) => j >= args[0]).reduce((s, [, ms]) => s + ms, 0) }; },
  });
  return { rows, prepare: (sql) => stmt(sql) };
}

const ctx = { waitUntil: () => {} };
const envoi = (env, ms, cle = "cle", method = "POST") =>
  worker.fetch(new Request(`https://x/cpu?ms=${ms}`, { method, headers: cle ? { "X-Relais-Cle": cle } : {} }), env, ctx);

test("cpu_additionne_et_rend_le_total", async () => {
  const env = { RELAIS_KEY: "cle", LIENS: fakeD1() };
  assert.deepEqual(await (await envoi(env, 1200)).json(), { ms: 1200, jours: 31 });
  const res = await envoi(env, 300);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await res.json(), { ms: 1500, jours: 31 });
});

test("cpu_fenetre_de_31_jours", async () => {
  const env = { RELAIS_KEY: "cle", LIENS: fakeD1() };
  const jour = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  env.LIENS.rows.set(jour(31), 5000);   // trop vieux : hors du total
  env.LIENS.rows.set(jour(30), 700);
  assert.equal((await (await envoi(env, 0)).json()).ms, 700);
});

test("cpu_refuse_sans_la_cle", async () => {
  const env = { RELAIS_KEY: "cle", LIENS: fakeD1() };
  assert.equal((await envoi(env, 100, "mauvaise")).status, 403);
  assert.equal((await envoi(env, 100, "")).status, 403);
  assert.equal((await envoi(env, 100, "cle", "GET")).status, 405);
  assert.equal(env.LIENS.rows.size, 0);
});

test("cpu_refuse_les_valeurs_bizarres", async () => {
  const env = { RELAIS_KEY: "cle", LIENS: fakeD1() };
  for (const ms of ["-5", "1.5", "abc", "3600001"]) assert.equal((await envoi(env, ms)).status, 400, ms);
  assert.equal(env.LIENS.rows.size, 0);
});

test("cpu_absent_sur_les_copies", async () => {
  // Sans clé (copies auto-hébergées) ou sans base : 404, le service garde son propre compte.
  assert.equal((await envoi({ LIENS: fakeD1() }, 100)).status, 404);
  assert.equal((await envoi({ RELAIS_KEY: "cle" }, 100)).status, 404);
});

test("cpu_base_en_panne", async () => {
  const env = { RELAIS_KEY: "cle", LIENS: { prepare: () => ({ run: async () => { throw new Error("D1_ERROR"); }, bind() { return this; } }) } };
  assert.equal((await envoi(env, 100)).status, 503);
});
