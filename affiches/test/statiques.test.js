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
