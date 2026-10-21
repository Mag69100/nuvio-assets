// Soirée à deux (worker/soiree.js) : les rangées du billet d'un ami, lues sans jamais sa clé Gemini ni son jeton.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
import { SOIREE_JS } from "../worker/soiree.js";
import { contenuStatique } from "../worker/statique.js";
import { GENRES, PROVIDERS, LANGUAGES, MAX_CUSTOM } from "../worker/config.js";

function fakeD1() {
  const rows = new Map();
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async run() {
      if (sql.startsWith("INSERT")) { const [h, c, e, t] = args; rows.set(h, { c, e, t }); }
      return {};
    },
    async first() { const r = rows.get(args[0]); return r ? { c: r.c, e: r.e } : null; },
  });
  return { prepare: (sql) => stmt(sql) };
}
let env;
const ctx = { waitUntil: () => {} };
beforeEach(() => {
  const store = new Map();
  globalThis.caches = { default: {
    match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
    put: async (req, res) => { store.set(req.url, await res.text()); },
  } };
  globalThis.fetch = async (url) => new Response(String(url).endsWith("collections.json") ? "[]" : JSON.stringify({ results: [] }));
  env = { TMDB_API_KEY: "tmdb", LIENS: fakeD1() };
});
const O = "https://nuvio-assets.xnzxflix.workers.dev";
const at = (path, init) => worker.fetch(new Request(O + path, init), env, ctx);
const seg = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const KEY = "AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q", AL = "0123456789abcdef01234567";
const AMI = { n: "Salon de Max", r: [1, "p0", 3], x: [{ n: "K-dramas", t: 1, g: [6], l: "ko" }], o: { 3: "Mes séries" }, k: KEY, al: AL, m: 7 };

test("programmation_d_un_lien_sans_secret", async () => {
  const res = await at(`/${seg(AMI)}/programmation.json`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
  const j = await res.json();
  assert.deepEqual(Object.keys(j).sort(), ["n", "o", "r", "x"]);
  assert.equal(j.n, "Salon de Max");
  assert.deepEqual(j.r, ["accueil-top10", "perso-0", "accueil-nouveautes-plateformes"]);
  assert.equal(j.x[0].n, "K-dramas");
  assert.deepEqual(j.o, { "accueil-nouveautes-plateformes": "Mes séries" });
  const texte = JSON.stringify(j);
  assert.ok(!texte.includes("AIza") && !texte.includes(AL), "ni clé Gemini ni jeton d'alerte");
});

test("programmation_d_un_lien_fixe_sans_cle_de_modification", async () => {
  const cree = await at("/lien-fixe", { method: "POST", headers: { "Content-Type": "application/json", Origin: O }, body: JSON.stringify({ c: seg(AMI) }) });
  const { id } = await cree.json();
  const res = await at(`/${id}/programmation.json`);
  const j = await res.json();
  assert.equal(j.n, "Salon de Max");
  assert.ok(!JSON.stringify(j).includes("AIza") && !JSON.stringify(j).includes(AL));
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=60");
  assert.match((await (await at("/f0123456789abcdef/programmation.json")).json()).error, /introuvable/);
  assert.match((await (await at("/pas-du-json/programmation.json")).json()).error, /illisible/);
});

// Le script de la page : la lecture d'un lien collé, et la remise en forme des rangées venues d'ailleurs.
const fonction = (nom) => new RegExp(`  function ${nom}\\([\\s\\S]*?\\n  \\}\\n`).exec(SOIREE_JS)[0];
const D = { origin: O, genres: GENRES, providers: PROVIDERS, languages: LANGUAGES, maxCustom: MAX_CUSTOM };

test("soiree_lien_colle", () => {
  const adresseAmi = new Function("D", "const FIXE = /^f[0-9A-Za-z]{16}$/;\n" + fonction("adresseAmi") + "\nreturn adresseAmi;")(D);
  const s = seg({ n: "X" });
  for (const u of [`${O}/${s}/configure`, `${O}/${s}/manifest.json`, `https://ailleurs.exemple/${s}/configure#modif=abc`, `stremio://ailleurs.exemple/${s}/manifest.json`]) {
    assert.deepEqual(adresseAmi(u), { url: `${O}/${s}/programmation.json` }, u);
  }
  assert.deepEqual(adresseAmi(`${O}/fAbcdefghij012345/manifest.json`), { url: `${O}/fAbcdefghij012345/programmation.json` });
  assert.deepEqual(adresseAmi(`https://copie.exemple/fAbcdefghij012345/configure`), { url: `https://copie.exemple/fAbcdefghij012345/programmation.json` });
  assert.equal(adresseAmi(`http://copie.exemple/fAbcdefghij012345/configure`), null, "lien fixe d'un autre site en http");
  for (const u of [`${O}/configure`, `${O}/manifest.json`, `${O}/`]) assert.deepEqual(adresseAmi(u), { origine: true }, u);
  for (const u of ["bonjour", "", "javascript:alert(1)", `${O}/<script>/configure`]) assert.equal(adresseAmi(u), null, u);
});

test("soiree_rangees_venues_d_ailleurs_nettoyees", () => {
  const propre = new Function("D", "const entier = (v, n) => Number.isInteger(v) && v >= 0 && v < n;\n" + fonction("propre") + "\nreturn propre;")(D);
  assert.deepEqual(propre({ n: "<b>Peur</b>\u0007", t: 9, g: [2, 2, 99, -1, "3"], w: [0, 50], l: "xx", y: [1800, 2020], v: 42, s: 7 }),
    { n: "bPeur/b", t: 0, g: [2], w: [0], l: "", y: [0, 2020], v: 9.5, s: 0 });
  assert.equal(propre(null), null);
  assert.equal(propre({ n: "x".repeat(80) }).n.length, 40);
});

test("soiree_dans_la_page", () => {
  const js = contenuStatique("salle2-soiree.js");
  assert.equal(js, SOIREE_JS);
  assert.doesNotThrow(() => new Function(js));
  // Jamais la clé ni le jeton de l'ami : le script ne lit que n, r, x et o.
  assert.doesNotMatch(js, /j\.k\b|j\.al\b/);
  // Rangées sur mesure : 12 au plus, le reste est refusé et dit ; « Annuler » défait l'ajout.
  assert.match(js, /state\.x\.length >= D\.maxCustom/);
  assert.match(js, /proposeAnnuler\(texte, avant, ordreAvant, \$\("soiree-ouvrir"\)\)/);
});
