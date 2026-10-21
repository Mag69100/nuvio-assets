import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
import { resetFails, hostCookie } from "../worker/hote.js";

// État de l'hébergeur d'une copie (déconnexion, « Plus tard ») gardé dans la base D1 quand elle est là : le cache,
// propre à chaque centre de Cloudflare et vidé à tout moment, ne suffit pas.
function fakeD1() {
  const etat = new Map();
  let table = false, panne = false;
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async run() {
      if (panne) throw new Error("D1_ERROR: network connection lost");
      if (sql.startsWith("CREATE TABLE IF NOT EXISTS etat")) { table = true; return {}; }
      if (sql.startsWith("INSERT INTO etat")) { if (!table) throw new Error("no such table: etat"); etat.set(args[0], args[1]); return {}; }
      throw new Error("requête inattendue : " + sql);
    },
    async first() {
      if (panne) throw new Error("D1_ERROR: network connection lost");
      if (!table) throw new Error("D1_ERROR: no such table: etat: SQLITE_ERROR");
      return etat.has(args[0]) ? { valeur: etat.get(args[0]) } : null;
    },
  });
  return { etat, prepare: (sql) => stmt(sql), panne: (v) => { panne = v; } };
}

let store, env;
beforeEach(() => {
  store = new Map();
  resetFails();
  globalThis.caches = {
    default: {
      match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
      put: async (req, res) => { store.set(req.url, await res.text()); },
    },
  };
  globalThis.fetch = async (url) => {
    if (String(url).includes("raw.githubusercontent.com")) return new Response('const VERSION = "5.99.1";');
    return new Response(JSON.stringify(String(url).includes("api.github.com") ? [] : { results: [] }));
  };
  env = { TMDB_API_KEY: "tmdb", ADMIN_PASSWORD: "secret-hote", LIENS: fakeD1() };
});
const ctx = { waitUntil: () => {} };
const COPY = "https://copie.exemple";
const at = (path, init = {}) => worker.fetch(new Request(COPY + path, init), env, ctx);
const post = (path, cookie) => at(path, { method: "POST", headers: { cookie, Origin: COPY, "Content-Type": "application/json" }, body: "{}" });
const etat = async (cookie) => (await at("/hote/etat", { headers: { cookie } })).json();

test("deconnexion_gardee_dans_la_base", async () => {
  const cookie = `hote=${await hostCookie(env, Date.now() - 1000)}`;
  assert.equal((await etat(cookie)).hote, true);
  assert.equal((await post("/hote/deconnexion", cookie)).status, 200);
  assert.ok(env.LIENS.etat.has("deconnexion"));
  // Cache vidé (ou autre centre de Cloudflare) : la session reste fermée.
  store.clear();
  assert.equal((await etat(cookie)).hote, false);
});

test("plus_tard_garde_dans_la_base", async () => {
  const cookie = `hote=${await hostCookie(env)}`;
  assert.equal((await etat(cookie)).maj.version, "5.99.1");
  assert.equal((await post("/hote/plus-tard", cookie)).status, 200);
  store.clear();
  assert.equal((await etat(cookie)).maj, null);
  assert.equal(env.LIENS.etat.get("plus-tard"), "5.99");
});

test("base_en_panne_copie_du_cache", async () => {
  const cookie = `hote=${await hostCookie(env, Date.now() - 1000)}`;
  await post("/hote/deconnexion", cookie);
  env.LIENS.panne(true);
  // Lecture : la copie du cache. Écriture : on dit de réessayer, plutôt que de laisser croire que c'est fait.
  assert.equal((await etat(cookie)).hote, false);
  const neuf = `hote=${await hostCookie(env)}`;
  assert.equal((await post("/hote/deconnexion", neuf)).status, 503);
});

test("sans_base_le_cache_comme_avant", async () => {
  delete env.LIENS;
  const cookie = `hote=${await hostCookie(env, Date.now() - 1000)}`;
  assert.equal((await post("/hote/deconnexion", cookie)).status, 200);
  assert.equal((await etat(cookie)).hote, false);
});
