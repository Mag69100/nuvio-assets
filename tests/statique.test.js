import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import worker from "../worker/index.js";
import { contenuStatique } from "../worker/statique.js";
import { POLICES } from "../worker/polices.js";
import { QRCODE_SRI } from "../worker/tiers/qrcode.js";
import { AFFICHES_JS } from "../worker/nuvio.js";
import { APERCU_V } from "../worker/reglages.js";

globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };
globalThis.fetch = async (url) => new Response(String(url).endsWith("collections.json") ? "[]" : JSON.stringify({ results: [] }));
const O = "https://x.exemple";
const env = { TMDB_API_KEY: "x" }, ctx = { waitUntil() {} };
const get = (p) => worker.fetch(new Request(O + p), env, ctx);
const PAGES = ["/", "/guide", "/configure", "/copie", "/lien"];
const statiques = (html) => [...html.matchAll(/(?:href|src)="(\/statique\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

// Polices et bibliothèque des QR codes servies par le site : plus rien chez Google Fonts ni jsDelivr (l'adresse IP
// du visiteur n'y part plus), et chaque page ne cite que des fichiers qui existent.
test("pages_sans_google_fonts_ni_cdn", async () => {
  for (const p of PAGES) {
    const html = await (await get(p)).text();
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr/, p);
    assert.ok(statiques(html).some((u) => u.startsWith("/statique/polices.css?v=")), p);
    for (const u of statiques(html)) assert.equal((await get(u)).status, 200, p + " " + u);
  }
  for (const s of ["outils.js", "salle2.js", "guide.js", "guide-fin.js"]) assert.doesNotMatch(contenuStatique(s), /cdn\.jsdelivr|googleapis/, s);
});

test("polices_servies_et_gardees", async () => {
  const css = await (await get(statiques(await (await get("/")).text()).find((u) => u.includes("polices.css")))).text();
  const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]);
  assert.equal(urls.length, POLICES.length);
  for (const fam of ["Bebas Neue", "Figtree", "Inter", "Courier Prime", "Instrument Serif", "Limelight", "Pacifico", "Orbitron"]) assert.ok(css.includes(`font-family: "${fam}"`), fam);
  assert.match(css, /font-family: "Instrument Serif"; font-style: italic;/);
  for (const u of urls) {
    const r = await get(u);
    assert.equal(r.headers.get("Content-Type"), "font/woff2");
    assert.equal(r.headers.get("Cache-Control"), "public, max-age=31536000, immutable");
    assert.equal(new TextDecoder().decode((await r.arrayBuffer()).slice(0, 4)), "wOF2", u);
  }
  // Une ancienne empreinte : le contenu actuel, gardé une minute seulement.
  assert.equal((await get(urls[0].replace(/v=\w+/, "v=ancienne"))).headers.get("Cache-Control"), "public, max-age=60");
});

test("qrcode_tel_que_publie", async () => {
  const outils = contenuStatique("outils.js");
  const src = /sc\.src = "([^"]+)"/.exec(outils)[1];
  const lib = await (await get(src)).text();
  assert.equal("sha384-" + createHash("sha384").update(lib).digest("base64"), QRCODE_SRI);
  assert.ok(outils.includes(`sc.integrity = "${QRCODE_SRI}"`));
  assert.match(lib, /Copyright \(c\) 2009 Kazuhiko Arase/);
  assert.match(lib, /Licensed under the MIT license/);
});

// Salle 2 et guide : leurs styles et leurs scripts, les mêmes pour tous, sont servis à part ; la page ne garde que
// ce qui change avec elle (les réglages D, l'adresse du site).
test("salle_2_et_guide_legeres", async () => {
  for (const p of ["/configure", "/guide"]) {
    const html = await (await get(p)).text();
    const enLigne = [...html.matchAll(/<(script|style)>([\s\S]*?)<\/\1>/g)].map((m) => m[2]);
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    for (const s of scripts) assert.doesNotThrow(() => new Function(s));
    assert.ok(enLigne.every((s) => s.length < 20000 || s.startsWith("\nconst D = ") || /^const D = /.test(s.trim())), p);
    assert.doesNotMatch(html, /<style>/, p);
  }
  for (const s of ["salle2.js", "salle2-hote.js", "guide.js", "guide-fin.js", "outils.js"]) assert.doesNotThrow(() => new Function(contenuStatique(s)), s);
});

// Le hall ne charge l'écran Nuvio (nuvio.js) et l'aperçu qu'au premier clic ; le mur n'a besoin que des affiches.
test("hall_sans_nuvio_js_au_depart", async () => {
  const html = await (await get("/")).text();
  const tags = statiques(html);
  assert.ok(tags.some((u) => u.startsWith("/statique/affiches.js?v=")));
  assert.ok(!tags.some((u) => /\/statique\/(nuvio|apercu)\.js/.test(u)));
  assert.match(html, /script\("\/statique\/nuvio\.js\?v=\w+"\)\.then\(\(\) => script\("\/statique\/apercu\.js\?v=\w+"\)\)/);
  assert.match(html, /NV_AFFICHES\.ppSrc\(m, "poster"\)/);
});

test("affiches_du_mur_comme_l_ecran_nuvio", () => {
  const stockage = {};
  const window = {};
  const localStorage = { getItem: (k) => (k in stockage ? stockage[k] : null), setItem: (k, v) => { stockage[k] = String(v); }, removeItem: (k) => { delete stockage[k]; } };
  const NVA = new Function("window", "localStorage", "NV_ORIG", AFFICHES_JS + "\nreturn window.NV_AFFICHES;")(window, localStorage, "https://x");
  assert.equal(NVA.ppSrc({ id: "tt0133093", type: "movie" }, "poster"), `https://x/affiche/movie/poster/tt0133093?v=${APERCU_V}`);
  assert.equal(NVA.ppSrc({ id: "tmdb:1399", imdb_id: "tt0944947", type: "series" }, "poster"), `https://x/affiche/series/poster/tmdb%3A1399?imdb=tt0944947&v=${APERCU_V}`);
  assert.equal(NVA.cssUrl("https://x/a'b.jpg"), "url('https://x/a%27b.jpg')");
  // Affiches maison désactivées dans l'aperçu : l'affiche d'origine.
  stockage["apercu-pp-v2"] = "0";
  assert.equal(NVA.ppSrc({ id: "tt0133093", type: "movie" }, "poster"), "");
});

// Les fichiers du site en fichiers statiques (worker/construire/statiques.mjs, [assets] de wrangler.toml) : servis par
// Cloudflare sans lancer le Worker, hors des 100 000 requêtes par jour. Tous les noms ont un contenu.
test("fichiers_du_site_en_fichiers_statiques", async () => {
  const { nomsStatiques, contenuStatique } = await import("../worker/statique.js");
  const noms = nomsStatiques();
  for (const n of ["scene.css", "nuvio.js", "polices.css", "qrcode.js"]) assert.ok(noms.includes(n), n);
  assert.ok(noms.some((n) => n.startsWith("polices/") && n.endsWith(".woff2")));
  for (const n of noms) assert.ok(contenuStatique(n) !== undefined, n);
  const toml = (await import("node:fs")).readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  assert.match(toml, /\[build\]\r?\ncommand = "node worker\/construire\/statiques\.mjs"/);
  assert.match(toml, /\[assets\]\r?\ndirectory = "\.statique-site"/);
});
