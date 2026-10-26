import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STYLES, parametresDuStyle } from "../lib/styles.js";
import { lireReglages, lireReglagesPaysage, ecrireReglages } from "../lib/lien-affiches.js";

test("styles_le_style_signature_est_garde_tel_quel", () => {
  assert.equal(STYLES.signature.s, "coD1faild1Wc0a10b02do3b13c13e11he1ia3f23h13i13j1");
  assert.equal(STYLES.signature.sp, "coD1xqfaild1Wc0a10b02do3b13c13e11ia3f23h13i13j1");
  const p = parametresDuStyle("signature");
  assert.equal(p.get("s"), "1." + STYLES.signature.s);
  assert.equal(p.get("sp"), "1." + STYLES.signature.sp);
  // Le paysage a bien ses propres réglages (texte plus grand, sans fondu).
  assert.notDeepEqual(lireReglagesPaysage(p), lireReglages(p));
});

test("styles_codes_canoniques", () => {
  // Chaque style s'écrit comme la régie l'écrirait : sinon le service renverrait (308) vers une autre adresse.
  for (const [nom, st] of Object.entries(STYLES)) {
    const p = parametresDuStyle(nom);
    assert.equal(ecrireReglages(lireReglages(p)), st.s, nom);
    if (st.sp) assert.equal(ecrireReglages(lireReglagesPaysage(p)), st.sp, nom);
  }
  assert.equal(parametresDuStyle("maison").toString(), "");
  assert.equal(parametresDuStyle("inconnu"), null);
  // Noms de dossier : des minuscules seulement (l'adresse du Worker les reconnaît ainsi).
  for (const nom of Object.keys(STYLES)) assert.match(nom, /^[a-z]+$/);
});

// Le Worker des affiches absentes, avec la liste des styles comme à sa mise en ligne.
async function worker() {
  const code = readFileSync(new URL("../statique/worker.js", import.meta.url), "utf8").replace("__STYLES__", JSON.stringify(Object.keys(STYLES)));
  return (await import("data:text/javascript," + encodeURIComponent(code))).default;
}
function base() {
  const ecrits = [];
  const DB = { prepare: (sql) => ({ bind: (...v) => ({ run: async () => { ecrits.push({ sql, v }); } }) }) };
  return { ecrits, env: { DB } };
}

test("statique_affiche_absente_mise_en_file", async () => {
  const w = await worker(), { ecrits, env } = base(), attentes = [];
  const ctx = { waitUntil: (p) => attentes.push(p) };
  const r = await w.fetch(new Request("https://a.test/signature/movie/poster/tmdb%3A550.jpg"), env, ctx);
  await Promise.all(attentes);
  assert.equal(r.status, 503);
  assert.equal(r.headers.get("Cache-Control"), "no-store");
  assert.equal(ecrits.length, 1);
  // Le chemin décodé : celui des fichiers publiés.
  assert.equal(ecrits[0].v[0], "/signature/movie/poster/tmdb:550.jpg");
  await w.fetch(new Request("https://a.test/maison/series/landscape/tt0903747.jpg"), env, ctx);
  await Promise.all(attentes);
  assert.equal(ecrits[1].v[0], "/maison/series/landscape/tt0903747.jpg");
});

test("statique_adresses_refusees", async () => {
  const w = await worker(), { ecrits, env } = base(), ctx = { waitUntil: () => {} };
  for (const p of ["/inconnu/movie/poster/tt1.jpg", "/maison/movie/poster/kitsu:1.jpg", "/maison/film/poster/tt1.jpg", "/maison/movie/poster/tt1.png", "/", "/maison/movie/poster/%E0%A4%A.jpg"]) {
    assert.equal((await w.fetch(new Request("https://a.test" + p), env, ctx)).status, 404, p);
  }
  assert.equal(ecrits.length, 0);
});

// L'ancienne adresse (Vercel, ?s=…) renvoie vers le même style en fichiers statiques, sans lancer de fonction : un
// style tout prêt vers son dossier, tout le reste (aucun réglage, réglage perso) vers « maison ».
test("vercel_renvoie_chaque_style_vers_les_fichiers", () => {
  const v = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.ok(!v.rewrites.some((r) => r.destination.startsWith("/api/affiche")), "plus de dessin chez Vercel");
  const r = v.redirects;
  for (const nom of Object.keys(STYLES)) {
    const s = parametresDuStyle(nom).get("s");
    if (!s) continue;
    const reg = r.find((x) => x.has && x.has[0].value === s);
    assert.ok(reg, nom);
    assert.equal(reg.destination, `https://affiches.xnzxflix.workers.dev/${nom}/:type/:shape/:id.jpg`);
    assert.equal(reg.permanent, false);
  }
  const dernier = r[r.length - 1];
  assert.ok(!dernier.has);
  assert.match(dernier.destination, /\/maison\/:type\/:shape\/:id\.jpg$/);
});

// Serveur des affiches présent : une affiche absente est dessinée par lui et renvoyée aussitôt (pas de file) ; serveur
// en panne : la file et 503, comme sans serveur.
test("statique_affiche_absente_dessinee_par_le_serveur", async () => {
  const w = await worker(), { ecrits, env } = base(), attentes = [];
  const ctx = { waitUntil: (p) => attentes.push(p) };
  const avant = globalThis.fetch;
  const appels = [];
  try {
    globalThis.fetch = async (url, init) => {
      appels.push([String(url), new Headers(init.headers).get("X-Relais-Cle")]);
      return new Response(new Uint8Array([255, 216, 255]), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=600" } });
    };
    const e = { ...env, SERVEUR: "https://serveur.test", RELAIS_KEY: "k" };
    const r = await w.fetch(new Request("https://a.test/signature/movie/poster/tmdb%3A550.jpg"), e, ctx);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("Content-Type"), "image/jpeg");
    assert.deepEqual(appels, [["https://serveur.test/statique/signature/movie/poster/tmdb:550.jpg", "k"]]);
    await Promise.all(attentes);
    assert.equal(ecrits.length, 0);
    globalThis.fetch = async () => { throw new Error("injoignable"); };
    assert.equal((await w.fetch(new Request("https://a.test/maison/movie/poster/tt1.jpg"), e, ctx)).status, 503);
    await Promise.all(attentes);
    assert.equal(ecrits.length, 1);
  } finally {
    globalThis.fetch = avant;
  }
});

test("serveur_exige_la_cle_pour_les_affiches_statiques", async () => {
  const { creerServeur } = await import("../serveur.js");
  const s = creerServeur({ env: { RELAIS_KEY: "k", TMDB_API_KEY: "x", PORT: "8799" }, fetchImpl: async () => new Response("{}", { status: 404 }) });
  const req = (url, cle) => ({ url, headers: cle ? { "x-relais-cle": cle } : {} });
  assert.equal((await s.route(req("/statique/signature/movie/poster/tt1.jpg"))).status, 403);
  assert.equal((await s.route(req("/statique/signature/movie/poster/tt1.jpg", "mauvaise"))).status, 403);
  // Bonne clé, titre inconnu de TMDB : 404 (pas d'affiche à garder).
  assert.equal((await s.route(req("/statique/signature/movie/poster/tt1.jpg", "k"))).status, 404);
  assert.equal((await s.route(req("/inconnu"))).status, 404);
  const etat = await (await s.route(req("/etat"))).json();
  assert.equal(etat.enAttente, 0);
});

// Publication sous verrou : verrou pris ailleurs → rien ; sinon tout ce qui est en ligne part, la file est vidée de ce
// qui est publié.
test("publication_sous_verrou", async () => {
  const { publierEtEnregistrer } = await import("../lib/statiques.js");
  const journal = [];
  const cf = (libre) => ({
    verrouiller: async () => libre, liberer: async () => journal.push("libéré"),
    publier: async (fichiers) => { journal.push(`publié ${fichiers.length}`); return 1; },
    sql: async (s) => { journal.push(s.split(" ").slice(0, 2).join(" ")); return []; },
  });
  const parChemin = () => new Map([["/maison/movie/poster/tt1.jpg", { chemin: "/maison/movie/poster/tt1.jpg", hash: "a".repeat(32), taille: 3, cree: "2026-10-25", change: true }],
    ["/maison/movie/poster/tt2.jpg", { chemin: "/maison/movie/poster/tt2.jpg", hash: "b".repeat(32), taille: 3, cree: "2026-10-24" }]]);
  assert.deepEqual(await publierEtEnregistrer(cf(false), parChemin(), new Map(), { faits: ["/maison/movie/poster/tt1.jpg"] }), { publie: false, envoyes: 0, retirees: 0 });
  assert.deepEqual(journal, []);
  const p = await publierEtEnregistrer(cf(true), parChemin(), new Map(), { faits: ["/maison/movie/poster/tt1.jpg"] });
  assert.equal(p.publie, true);
  assert.deepEqual(journal, ["publié 2", "INSERT INTO", "libéré", "DELETE FROM"]);
});

// Redemandée à chaque passage sur la carte : une seule écriture par instance en 10 minutes, et jamais de lecture de
// toute la file (5 millions de lignes lues par jour pour tout le compte, dépassées le 26 octobre 2026).
test("statique_meme_affiche_absente_une_seule_ecriture", async () => {
  const w = await worker(), { ecrits, env } = base(), attentes = [], ctx = { waitUntil: (p) => attentes.push(p) };
  for (let i = 0; i < 3; i++) assert.equal((await w.fetch(new Request("https://a.test/note/series/poster/tt7654321.jpg"), env, ctx)).status, 503);
  await Promise.all(attentes);
  assert.equal(ecrits.filter((e) => e.v[0] === "/note/series/poster/tt7654321.jpg").length, 1);
  assert.ok(ecrits.every((e) => !/COUNT/i.test(e.sql)));
});
