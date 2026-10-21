import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import worker from "../worker/index.js";
import { contenuStatique } from "../worker/statique.js";
import { POLICES } from "../worker/polices.js";
import { QRCODE_SRI } from "../worker/tiers/qrcode.js";

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
  for (const s of ["outils.js"]) assert.doesNotMatch(contenuStatique(s), /cdn\.jsdelivr|googleapis/, s);
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
