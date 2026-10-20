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

const STYLES = { statut: "texte", tendance: "fleche", qualite: "texte", titre: 1, note: "etoile", texte: 1, sep: "point", haut: 1, fondu: { couleur: "noir", force: "m" } };
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
    { styles: { ...STYLES, texte: 0.7, sep: "barre" } }, { styles: { ...STYLES, texte: 1.4, sep: "puce" } },
    { styles: { ...STYLES, titre: 0.6 } }, { styles: { ...STYLES, haut: 1.4 } }, { styles: { ...STYLES, titre: 1.4 } },
    { line: { genre: "SF", note: "8,4", source: "tmdb", annee: "2024", age: "16" }, styles: { ...STYLES, note: "badge", police: "bebas", place: "gauche" } },
    { line: { note: "8,4", age: "12" }, styles: { ...STYLES, note: "grand", place: "centre", fondu: { couleur: "affiche", force: "l", flou: true } } },
    { statut: "AU CINÉMA LE 16 DÉC. 2027", styles: { ...STYLES, police: "bebas", haut: 1.4 } },
    { bandeau: { texte: "NOUVEAU", coin: "g" }, statut: null, styles: { ...STYLES, badges: { style: "verre", forme: "carre", opacite: "s", couleur: "or" }, inverse: true, accent: "affiche", vignette: true, voile: "l", barre: "verre", monte: 0.3, large: 1.4 } },
    { line: { genre: "SF", note: "8,4", noteN: 5, notes: [{ s: "mc", v: "45", n: 4.5 }], duree: "3 saisons", ordre: "agn" }, quality: { label: "4K", extra: "DV", atmos: true }, styles: { ...STYLES, couleurNote: "halo", barre: "fine", badges: { style: "contour", forme: "arrondi", opacite: "m", couleur: "blanc" }, fondu: { couleur: "noir", force: "l", hauteur: "long", flou: true } } },
    { logo: null, line: { genre: "SF", note: "8,4" }, styles: { ...STYLES, note: "grand", couleurNote: "oui" } },
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

test("taille des badges du haut réglable à la main", async () => {
  const largeur = async (haut) => {
    const buf = await draw({ ...base, logo: null, line: null, quality: null, rank: 4, styles: { ...STYLES, haut } }, f);
    const { data, info } = await pixels(buf, 0, 0, 200, 80);
    let max = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * info.channels; if (data[i] > 225 && data[i + 1] > 225 && data[i + 2] > 225) max = Math.max(max, x); }
    return max;
  };
  assert.ok(await largeur(1.4) > await largeur(0.6) + 20);
});

// Affiche rouge-magenta (le rouge domine, plus de bleu que de vert) : la teinte doit rester une vraie couleur, pas du noir.
test("fondu aux couleurs d'une affiche magenta", async () => {
  const sans = { ...base, logo: null, line: null, rank: null, quality: null };
  const teinte = await draw({ ...sans, styles: { ...STYLES, fondu: { couleur: "affiche", force: "l" } } }, avec(uni(160, 40, 100)));
  const noir = await draw({ ...sans, styles: { ...STYLES, fondu: { couleur: "noir", force: "l" } } }, avec(uni(160, 40, 100)));
  const [rt] = await zone(teinte, 0, 560, 400, 40), [rn] = await zone(noir, 0, 560, 400, 40);
  assert.ok(rt > rn + 15, `teinte noire : rouge ${rt} (noir ${rn})`);
});

// Dolby Vision : le logo (deux « D » arrondis face à face), pas le texte « DV ». HDR reste écrit en toutes lettres.
test("qualité : logo Dolby Vision", async () => {
  const { elementsQualite } = await import("../lib/dessin.js");
  const texte = (n) => JSON.stringify(n);
  const dv = elementsQualite("DV", 26, false);
  assert.match(texte(dv), /"type":"svg"/);
  assert.doesNotMatch(texte(dv), /"DV"/);
  // D de gauche : bord plat à x = 3, arrondi vers la droite ; D de droite : bord plat à x = 45, arrondi vers la gauche.
  const { DOLBY } = await import("../lib/dessin.js");
  assert.match(DOLBY, /^M3 2h10a10 10 0 0 1 0 20H3zM45 2H35a10 10 0 0 0 0 20h10z$/);
  const hdr = elementsQualite("HDR", 26, false);
  assert.match(texte(hdr), /"HDR"/);
  assert.doesNotMatch(texte(hdr), /"type":"svg"/);
  assert.match(texte(elementsQualite(null, 26, false)), /"4K"/);
});

// ---------- ajouts inspirés de Viewio et Posters+ ----------
const compte = async (buf, [left, top, width, height], ok) => {
  const { data, info } = await pixels(buf, left, top, width, height);
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) if (ok(data[i], data[i + 1], data[i + 2])) n++;
  return n;
};
const blanc = (r, g, b) => r > 225 && g > 225 && b > 225;
const seul = { ...base, logo: null, rank: null, quality: null };

test("note en badge : pastille jaune IMDb, bleue TMDB", async () => {
  const jaune = (r, g, b) => r > 200 && g > 150 && b < 90, bleu = (r, g, b) => r < 90 && g > 140 && b > 190;
  const imdb = await draw({ ...seul, line: { genre: "SF", note: "8,4", source: "imdb", annee: "2024" }, styles: { ...STYLES, note: "badge" } }, f);
  assert.ok(await compte(imdb, [0, 520, 400, 80], jaune) > 150, "pas de badge jaune");
  const tmdb = await draw({ ...seul, line: { note: "8,1", source: "tmdb" }, styles: { ...STYLES, note: "badge" } }, f);
  assert.ok(await compte(tmdb, [0, 520, 400, 80], bleu) > 150, "pas de badge bleu");
});

test("âge : un cadre de plus au bout de la ligne", async () => {
  const droite = async (line) => {
    const { data, info } = await pixels(await draw({ ...seul, line }, f), 0, 540, 400, 60);
    let max = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * info.channels; if (blanc(data[i], data[i + 1], data[i + 2])) max = Math.max(max, x); }
    return max;
  };
  const ligne = { genre: "SF", note: "8,4", annee: "2024" };
  assert.ok(await droite({ ...ligne, age: "12" }) > await droite(ligne) + 15);
});

test("police cinéma : un autre dessin des lettres", async () => {
  const inter = await draw({ ...seul, statut: "NOUVEAU" }, f);
  const bebas = await draw({ ...seul, statut: "NOUVEAU", styles: { ...STYLES, police: "bebas" } }, f);
  const [pa, pb] = [await pixels(inter, 0, 520, 400, 80), await pixels(bebas, 0, 520, 400, 80)];
  let differents = 0;
  for (let i = 0; i < pa.data.length; i++) if (Math.abs(pa.data[i] - pb.data[i]) > 60) differents++;
  assert.ok(differents > 500, `même dessin : ${differents}`);
});

test("place du titre : à gauche, au centre", async () => {
  const centre = async (shape, place) => centreBlanc(await draw({ ...base, shape, image: shape === "landscape" ? "/large.jpg" : "/base.jpg", line: null, rank: null, quality: null, styles: { ...STYLES, place } }, f));
  // Logo de 320 px de large : collé à la marge de gauche (20 px), son centre est à 180 px (200 au centre).
  assert.ok(Math.abs(await centre("poster", "gauche") - 180) <= 3, "affiche : logo pas à gauche");
  assert.ok(Math.abs(await centre("landscape", "centre") - 400) <= 4, "paysage : logo pas au centre");
  assert.ok(await centre("landscape", undefined) < 250, "paysage par défaut : à gauche");
});

test("fondu flou : le bas de l'image est adouci", async () => {
  const rayures = () => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750"><defs><pattern id="p" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="3" height="6" fill="#fff"/><rect x="3" width="3" height="6" fill="#000"/></pattern></defs><rect width="500" height="750" fill="url(#p)"/></svg>`)).jpeg().toBuffer();
  const g = avec(rayures);
  const ecart = async (flou) => {
    const buf = await draw({ ...seul, line: null, styles: { ...STYLES, fondu: { couleur: "noir", force: "s", flou } } }, g);
    const z = await sharp(buf).extract({ left: 0, top: 500, width: 400, height: 60 }).toBuffer();
    return (await sharp(z).stats()).channels[0].stdev;
  };
  const net = await ecart(undefined), doux = await ecart(true);
  assert.ok(doux < net * 0.5, `pas flou : ${net} → ${doux}`);
});

// ---------- Régie v2 ----------
const rouge = (r, g, b) => r > 200 && g < 110 && b < 110;
const vert = (r, g, b) => g > 150 && r < 120 && b < 140;
const sombre = async (buf, zoneXY) => (await zone(buf, ...zoneXY))[0];

test("v2_bandeau_dans_le_coin", async () => {
  const sans = { ...seul, line: null, statut: null };
  const avecBandeau = await draw({ ...sans, bandeau: { texte: "NOUVEAU", coin: "d" } }, f);
  const jaune = (r, g, b) => r > 200 && g > 160 && b < 90;
  assert.ok(await compte(avecBandeau, [300, 0, 100, 100], jaune) > 400, "pas de bandeau en haut à droite");
  assert.ok(await compte(avecBandeau, [0, 0, 100, 100], jaune) < 20, "bandeau du mauvais côté");
  const gauche = await draw({ ...sans, bandeau: { texte: "N°2", coin: "g" } }, f);
  assert.ok(await compte(gauche, [0, 0, 100, 100], jaune) > 400, "pas de bandeau en haut à gauche");
});

test("v2_accent_et_note_coloree", async () => {
  const accent = await draw({ ...seul, styles: { ...STYLES, accent: "rouge" } }, f);
  assert.ok(await compte(accent, [0, 520, 400, 80], rouge) > 40, "étoile pas rouge");
  const coloree = await draw({ ...seul, line: { note: "8,4", noteN: 8.4 }, styles: { ...STYLES, couleurNote: "oui" } }, f);
  assert.ok(await compte(coloree, [0, 520, 400, 80], vert) > 80, "note pas verte");
});

test("v2_autres_notes", async () => {
  const buf = await draw({ ...seul, line: { note: "8,4", notes: [{ s: "rt", v: "94 %", n: 9.4 }, { s: "lb", v: "4,1", n: 8.2 }] } }, f);
  assert.ok(await compte(buf, [0, 520, 400, 80], rouge) > 40, "pas de pastille RT");
  const bleu = (r, g, b) => b > 200 && r < 120 && g > 150;
  assert.ok(await compte(buf, [0, 520, 400, 80], bleu) > 5, "pas de points Letterboxd");
});

test("v2_ordre_et_duree", async () => {
  const a = await draw({ ...seul, line: { genre: "SF", note: "8,4", annee: "2024", duree: "2 h 46" } }, f);
  const b = await draw({ ...seul, line: { genre: "SF", note: "8,4", annee: "2024" } }, f);
  const [da, db] = [await pixels(a, 0, 540, 400, 60), await pixels(b, 0, 540, 400, 60)];
  let changes = 0;
  for (let i = 0; i < da.data.length; i++) if (Math.abs(da.data[i] - db.data[i]) > 40) changes++;
  assert.ok(changes > 300, "durée absente");
  const ordre = await draw({ ...seul, line: { genre: "SF", note: "8,4", annee: "2024", ordre: "nga" } }, f);
  const [pa, pb] = [await pixels(b, 0, 540, 400, 60), await pixels(ordre, 0, 540, 400, 60)];
  let diff = 0;
  for (let i = 0; i < pa.data.length; i++) if (Math.abs(pa.data[i] - pb.data[i]) > 60) diff++;
  assert.ok(diff > 300, "ordre sans effet");
});

test("v2_barre_verre_et_fine", async () => {
  const rayures = () => sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750"><defs><pattern id="p" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="3" height="6" fill="#fff"/><rect x="3" width="3" height="6" fill="#000"/></pattern></defs><rect width="500" height="750" fill="url(#p)"/></svg>')).jpeg().toBuffer();
  const g = avec(rayures);
  const ecart = async (barre) => {
    const buf = await draw({ ...seul, line: { genre: "SF" }, styles: { ...STYLES, fondu: null, barre } }, g);
    const z = await sharp(buf).extract({ left: 0, top: 590, width: 60, height: 8 }).toBuffer();
    return (await sharp(z).stats()).channels[0].stdev;
  };
  assert.ok(await ecart("verre") < (await ecart(undefined)) * 0.5, "pas de verre flouté sous la ligne");
  const fine = await draw({ ...seul, line: { genre: "SF" }, styles: { ...STYLES, barre: "fine", accent: "rouge" } }, f);
  assert.ok(await compte(fine, [150, 520, 100, 60], rouge) > 60, "pas de barre fine");
});

test("v2_badges_communs_et_inverse", async () => {
  const plein = await draw({ ...seul, line: null, statut: "NOUVEAU", styles: { ...STYLES, badges: { style: "plein", forme: "pilule", opacite: "l", couleur: "noir" } } }, f);
  const creme = (r, g, b) => r > 225 && g > 215 && b > 190;
  assert.ok(await compte(plein, [0, 0, 160, 50], creme) > 200, "pas de badge plein");
  const inverse = await draw({ ...seul, line: null, quality: { extra: "DV" }, styles: { ...STYLES, inverse: true } }, f);
  assert.ok(await compte(inverse, [0, 0, 150, 60], blanc) > 80, "qualité pas passée à gauche");
  assert.ok(await compte(inverse, [250, 0, 150, 60], blanc) < 20, "qualité restée à droite");
});

test("v2_plateforme_et_logo_monte", async () => {
  const netflix = () => sharp({ create: { width: 92, height: 92, channels: 3, background: { r: 229, g: 9, b: 20 } } }).png().toBuffer();
  const g = images({ "/base.jpg": { corps: () => gris(500, 750), type: "image/jpeg" }, "/logo.png": { corps: logoPng, type: "image/png" }, "/n.jpg": { corps: netflix, type: "image/png" } });
  const ligne = await draw({ ...seul, line: { genre: "SF", plateforme: "/n.jpg" } }, g);
  assert.ok(await compte(ligne, [0, 520, 400, 80], rouge) > 300, "logo de plateforme absent de la ligne");
  const coin = await draw({ ...seul, line: null, coin: "/n.jpg" }, g);
  assert.ok(await compte(coin, [300, 0, 100, 100], rouge) > 300, "logo de plateforme absent du coin");
  const hautBlanc = async (buf) => { const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true }); for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[y * info.width + x] > 240) return y; return -1; };
  const normal = await draw({ ...base, line: null, rank: null, quality: null }, f);
  const monte = await draw({ ...base, line: null, rank: null, quality: null, styles: { ...STYLES, monte: 0.2 } }, f);
  assert.ok(await hautBlanc(monte) < (await hautBlanc(normal)) - 100, "logo pas remonté");
});

test("v2_voile_vignette", async () => {
  const sans = await draw({ ...seul, line: null, logo: null, statut: "NOUVEAU", styles: { ...STYLES, voile: "0" } }, f);
  const avecVoile = await draw({ ...seul, line: null, logo: null, statut: "NOUVEAU" }, f);
  assert.ok(await sombre(sans, [200, 0, 200, 40]) > (await sombre(avecVoile, [200, 0, 200, 40])) + 10, "voile du haut pas retiré");
  const vignette = await draw({ ...seul, line: null, logo: null, full: false, styles: { ...STYLES, vignette: true } }, f);
  assert.ok(await sombre(vignette, [0, 250, 20, 100]) < 110, "bords pas assombris");
  assert.ok(await sombre(vignette, [180, 280, 40, 40]) > 120, "centre assombri");
});

test("v2_qualite_complete", async () => {
  const { elementsQualite } = await import("../lib/dessin.js");
  const q = JSON.stringify(elementsQualite("HDR10+", 26, false, "4K", true));
  assert.match(q, /"HDR10\+"/);
  assert.match(q, /"ATMOS"/);
  assert.match(JSON.stringify(elementsQualite(null, 26, false, "1080p", false)), /"1080p"/);
  const buf = await draw({ ...seul, line: null, quality: { label: "1080p", extra: null, atmos: true } }, f);
  assert.equal((await sharp(buf).metadata()).width, 400);
});

// Une ligne chargée (genre long, plusieurs notes, durée, âge) reste sur une seule ligne, dans les marges :
// le texte rapetisse au besoin plutôt que de passer à la ligne ou de sortir de l'affiche.
test("v2_ligne_chargee_tient", async () => {
  const line = { genre: "Science-fiction", note: "8,7", notes: [{ s: "rt", v: "94 %", n: 9.4 }, { s: "mc", v: "81", n: 8.1 }], annee: "2014", duree: "2 h 49", age: "12" };
  for (const styles of [STYLES, { ...STYLES, note: "badge" }, { ...STYLES, texte: 1.4 }]) {
    const buf = await draw({ ...seul, line, styles }, f);
    assert.equal(await compte(buf, [0, 480, 14, 120], blanc), 0, "déborde à gauche");
    assert.equal(await compte(buf, [386, 480, 14, 120], blanc), 0, "déborde à droite");
    const { data, info } = await pixels(buf, 0, 440, 400, 160);
    const lignes = new Set();
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * info.channels; if (blanc(data[i], data[i + 1], data[i + 2])) lignes.add(y); }
    assert.ok(Math.max(...lignes) - Math.min(...lignes) < 40, `sur plusieurs lignes : ${Math.max(...lignes) - Math.min(...lignes)} px`);
  }
});
