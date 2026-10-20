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

const STYLES = { statut: "texte", tendance: "fleche", qualite: "texte", titre: "m", note: "etoile", texte: "m", sep: "point", fondu: { couleur: "noir", force: "m" } };
const base = { shape: "poster", image: "/base.jpg", full: true, gris: false, logo: "/logo.png", line: { genre: "SF", note: "8,4", annee: "2024" }, statut: null, rank: 4, quality: { extra: "DV" }, styles: STYLES };
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
  const buf = await draw({ ...base, logo: null, line: { genre: "SF" }, rank: null, quality: null }, f);
  assert.ok(await moyenneBas(buf) <= 88, `pas assez sombre : ${await moyenneBas(buf)}`);
});

/** Centre horizontal de la zone blanche (> 240) d'une affiche : là où est le logo blanc opaque. */
async function centreBlanc(buf) {
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  let min = info.width, max = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[y * info.width + x] > 240) { min = Math.min(min, x); max = Math.max(max, x); }
  return (min + max) / 2;
}
const logoFait = (svg) => ({ corps: async () => sharp(Buffer.from(svg)).png().toBuffer(), type: "image/png" });

test("logo : les marges transparentes ne décentrent pas le nom", async () => {
  // Bloc blanc de 300 px puis 100 px de vide à droite.
  const g = images({ "/base.jpg": { corps: () => gris(500, 750), type: "image/jpeg" },
    "/marge.png": logoFait(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><rect width="300" height="100" fill="#fff"/></svg>`) });
  const buf = await draw({ ...base, logo: "/marge.png", line: null, rank: null, quality: null }, g);
  assert.ok(Math.abs(await centreBlanc(buf) - 200) <= 3, `centre ${await centreBlanc(buf)}`);
});

test("logo : une traînée pâle d'un côté compte moins que les lettres", async () => {
  // Lettres opaques (300 px) puis une traînée semi-transparente de 60 px à droite (comme le logo de
  // Dune : Troisième partie) : ce sont les lettres qui sont centrées, pas la traînée.
  const g = images({ "/base.jpg": { corps: () => gris(500, 750), type: "image/jpeg" },
    "/trainee.png": logoFait(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="100"><rect width="300" height="100" fill="#fff"/><rect x="300" width="60" height="100" fill="#fff" fill-opacity="0.4"/></svg>`) });
  const buf = await draw({ ...base, logo: "/trainee.png", line: null, rank: null, quality: null }, g);
  assert.ok(Math.abs(await centreBlanc(buf) - 200) <= 3, `lettres à ${await centreBlanc(buf)}`);
});

test("image introuvable : erreur", async () => {
  await assert.rejects(draw({ ...base, image: "/absente.jpg" }, f));
});

test("logo introuvable sur une image sans texte : erreur, jamais une affiche sans titre", async () => {
  await assert.rejects(draw({ ...base, logo: "/absent.png" }, f));
});

test("logo svg géant : dessiné vite et bien centré", async () => {
  const geant = `<svg xmlns="http://www.w3.org/2000/svg" width="6000" height="2000"><rect width="6000" height="2000" fill="#fff"/></svg>`;
  const g = images({ "/base.jpg": { corps: () => gris(500, 750), type: "image/jpeg" }, "/geant.svg": { corps: async () => Buffer.from(geant), type: "image/svg+xml" } });
  const t0 = Date.now();
  const buf = await draw({ ...base, logo: "/geant.svg", line: null, rank: null, quality: null }, g);
  assert.ok(Date.now() - t0 < 800, `trop long : ${Date.now() - t0} ms`);
  assert.ok(Math.abs(await centreBlanc(buf) - 200) <= 3, `logo à ${await centreBlanc(buf)}`);
});

// ---------- styles de la régie ----------
const uni = (r, g, b) => () => sharp({ create: { width: 500, height: 750, channels: 3, background: { r, g, b } } }).jpeg().toBuffer();
const avec = (fond) => images({ "/base.jpg": { corps: fond, type: "image/jpeg" }, "/logo.png": { corps: logoPng, type: "image/png" } });
async function zone(buf, left, top, width, height) {
  const z = await sharp(buf).extract({ left, top, width, height }).toBuffer();
  return (await sharp(z).stats()).channels.map((c) => c.mean);
}
async function pixels(buf, left, top, width, height) {
  return sharp(await sharp(buf).extract({ left, top, width, height }).toBuffer()).raw().toBuffer({ resolveWithObject: true });
}

test("la ligne du bas est dessinée", async () => {
  const sans = await draw({ ...base, logo: null, line: null, rank: null, quality: null }, f);
  const avecLigne = await draw({ ...base, logo: null, rank: null, quality: null }, f);
  const [a] = await zone(sans, 100, 560, 200, 30), [b] = await zone(avecLigne, 100, 560, 200, 30);
  assert.ok(b > a + 8, `ligne absente : ${a} → ${b}`);
});

test("gris : l'image devient grise, les badges gardent leur couleur", async () => {
  const buf = await draw({ ...base, gris: true, line: null, logo: null, quality: null }, avec(uni(200, 40, 40)));
  const [r, g] = await zone(buf, 100, 250, 200, 100);
  assert.ok(Math.abs(r - g) <= 3, `pas gris : R ${r} G ${g}`);
  const { data, info } = await pixels(buf, 0, 0, 120, 60);
  let dore = false;
  for (let i = 0; i < data.length; i += info.channels) if (data[i] - data[i + 2] > 80) dore = true;
  assert.ok(dore, "la flèche dorée a disparu");
});

test("fondu : plus sombre en fort qu'en léger", async () => {
  const leger = await draw({ ...base, logo: null, line: null, rank: null, quality: null, styles: { ...STYLES, fondu: { couleur: "noir", force: "s" } } }, f);
  const fort = await draw({ ...base, logo: null, line: null, rank: null, quality: null, styles: { ...STYLES, fondu: { couleur: "noir", force: "l" } } }, f);
  assert.ok(await moyenneBas(fort) < await moyenneBas(leger) - 5);
});

test("fondu aux couleurs de l'affiche", async () => {
  const sans = { ...base, logo: null, line: null, rank: null, quality: null };
  const teinte = await draw({ ...sans, styles: { ...STYLES, fondu: { couleur: "affiche", force: "l" } } }, avec(uni(200, 40, 40)));
  const noir = await draw({ ...sans, styles: { ...STYLES, fondu: { couleur: "noir", force: "l" } } }, avec(uni(200, 40, 40)));
  const [rt, , bt] = await zone(teinte, 0, 560, 400, 40), [rn] = await zone(noir, 0, 560, 400, 40);
  assert.ok(rt > rn + 15 && rt > bt + 20, `pas teinté : rouge ${rt} (noir ${rn}), bleu ${bt}`);
});

test("styles : chaque choix se dessine", async () => {
  const essais = [
    { statut: "NOUVEAU", styles: { ...STYLES, statut: "texte" } }, { statut: "EN SALLE", styles: { ...STYLES, statut: "etiquette" } },
    { styles: { ...STYLES, tendance: "ruban" } },
    { styles: { ...STYLES, qualite: "pastille" } }, { quality: { extra: null } },
    { styles: { ...STYLES, note: "nu" } }, { styles: { ...STYLES, note: "grand" } }, { line: { note: "8,4" }, styles: { ...STYLES, note: "grand" } },
    { styles: { ...STYLES, texte: "s", sep: "barre" } }, { styles: { ...STYLES, texte: "l", sep: "puce" } },
    { styles: { ...STYLES, titre: "s" } }, { styles: { ...STYLES, titre: "l" } },
  ];
  for (const e of essais) {
    for (const shape of ["poster", "landscape"]) {
      const m = await sharp(await draw({ ...base, ...e, shape, image: shape === "landscape" ? "/large.jpg" : "/base.jpg" }, f)).metadata();
      assert.deepEqual([m.width, m.height], SIZES[shape], JSON.stringify(e));
    }
  }
});

test("statut en étiquette : une pastille crème en haut à gauche", async () => {
  const buf = await draw({ ...base, rank: null, statut: "NOUVEAU", styles: { ...STYLES, statut: "etiquette" } }, f);
  const { data, info } = await pixels(buf, 0, 0, 160, 50);
  let creme = 0;
  for (let i = 0; i < data.length; i += info.channels) if (data[i] > 225 && data[i + 1] > 215 && data[i + 2] > 190) creme++;
  assert.ok(creme > 200, `pas d'étiquette : ${creme}`);
});

test("grand chiffre : centré en bas", async () => {
  const buf = await draw({ ...base, logo: null, line: { note: "8,4" }, rank: null, quality: null, styles: { ...STYLES, note: "grand", fondu: { couleur: "noir", force: "l" } } }, f);
  const { data, info } = await pixels(buf, 0, 450, 400, 150);
  let min = 400, max = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * info.channels; if (data[i] > 225 && data[i + 1] > 225 && data[i + 2] > 225) { min = Math.min(min, x); max = Math.max(max, x); } }
  assert.ok(max > 0, "chiffre absent");
  assert.ok(Math.abs((min + max) / 2 - 200) <= 10, `centre ${(min + max) / 2}`);
  assert.ok(max - min > 60, `trop petit : ${max - min}`);
});

// Paysage : le logo en bas à gauche, la ligne du bas en petit en bas à droite (comme une carte de plateforme).
test("paysage : logo à gauche, ligne à droite", async () => {
  const buf = await draw({ ...base, shape: "landscape", image: "/large.jpg", rank: null, quality: null }, f);
  const blancs = async (left, width) => {
    const { data, info } = await pixels(buf, left, 300, width, 150);
    let n = 0;
    for (let i = 0; i < data.length; i += info.channels) if (data[i] > 225 && data[i + 1] > 225 && data[i + 2] > 225) n++;
    return n;
  };
  assert.ok(await blancs(0, 300) > 2000, "logo absent à gauche");
  assert.ok(await blancs(400, 180) < 50, "le milieu doit rester libre");
  assert.ok(await blancs(560, 240) > 150, "ligne absente à droite");
});
