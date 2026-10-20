import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { draw, SIZES } from "../lib/dessin.js";

const gris = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 128, g: 128, b: 128 } } }).jpeg().toBuffer();
const logoPng = () => sharp({ create: { width: 600, height: 200, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer();
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><rect width="300" height="100" fill="#fff"/></svg>`;

/** Faux fetch d'images TMDB : chemin → { corps, type } ; tout le reste répond 404. */
function images(map) {
  return async (url) => {
    const path = "/" + String(url).split("/").pop();
    const it = map[path];
    if (!it) return new Response("absent", { status: 404 });
    return new Response(await it.corps(), { headers: { "Content-Type": it.type } });
  };
}

const base = { shape: "poster", image: "/base.jpg", full: true, logo: "/logo.png", line: ["SF", "8,4", "2024"], rank: 4, quality: { extra: "DV" } };
const f = images({
  "/base.jpg": { corps: () => gris(500, 750), type: "image/jpeg" },
  "/large.jpg": { corps: () => gris(1280, 720), type: "image/jpeg" },
  "/logo.png": { corps: logoPng, type: "image/png" },
  "/logo.svg": { corps: async () => Buffer.from(LOGO_SVG), type: "image/svg+xml" },
});

/** Moyenne (canal rouge) du quart du bas d'une image. */
async function moyenneBas(buf) {
  const { width, height } = await sharp(buf).metadata();
  const q = Math.floor(height / 4);
  // stats() lit l'image d'entrée : on découpe d'abord dans un nouveau tampon.
  const zone = await sharp(buf).extract({ left: 0, top: height - q, width, height: q }).toBuffer();
  const s = await sharp(zone).stats();
  return s.channels[0].mean;
}

test("taille portrait", async () => {
  const m = await sharp(await draw(base, f)).metadata();
  assert.equal(m.format, "jpeg");
  assert.deepEqual([m.width, m.height], SIZES.poster);
  assert.deepEqual(SIZES.poster, [400, 600]);
});

test("taille paysage", async () => {
  const m = await sharp(await draw({ ...base, shape: "landscape", image: "/large.jpg" }, f)).metadata();
  assert.deepEqual([m.width, m.height], [800, 450]);
});

test("paysage : image de fond en w780 (assez pour 800 px, 3 fois plus léger que w1280)", async () => {
  const urls = [];
  await draw({ ...base, shape: "landscape", image: "/large.jpg" }, async (u, o) => { urls.push(String(u)); return f(u, o); });
  assert.ok(urls.some((u) => u.endsWith("/w780/large.jpg")), urls.join(" "));
});

test("logo svg", async () => {
  const buf = await draw({ ...base, logo: "/logo.svg" }, f);
  assert.equal((await sharp(buf).metadata()).format, "jpeg");
});

test("bas intact sans logo ni image sans texte", async () => {
  const buf = await draw({ ...base, full: false, logo: null, line: null }, f);
  assert.ok(Math.abs(await moyenneBas(buf) - 128) <= 3, `bas modifié : ${await moyenneBas(buf)}`);
});

test("bas assombri sous la ligne", async () => {
  // Sans logo (blanc, il éclaircirait la zone mesurée) : on mesure le dégradé seul.
  const buf = await draw({ ...base, logo: null, line: ["SF"], rank: null, quality: null }, f);
  assert.ok(await moyenneBas(buf) <= 88, `pas assez sombre : ${await moyenneBas(buf)}`);
});

test("image introuvable : erreur", async () => {
  await assert.rejects(draw({ ...base, image: "/absente.jpg" }, f));
});
