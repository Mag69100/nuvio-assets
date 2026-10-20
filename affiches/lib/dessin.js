/**
 * Le dessin d'une affiche maison. sharp pose les images (fond, dégradés, logo) et fait le JPEG ;
 * satori écrit les textes (police Inter) sous forme de tracés SVG, donc sans police à installer.
 * Les styles viennent des réglages de la régie (content.styles, voir lib/contenu.js).
 * Mesures de base : maquette « Gras + léger » validée, en pixels d'une affiche de 400 px de large.
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";
import satori from "satori";

export const SIZES = { poster: [400, 600], landscape: [800, 450] };
const IMG = "https://image.tmdb.org/t/p/";
const DELAI_MS = 3000;
const OR = "#f5c518", ENCRE = "#120b0e", CREME = "#f3ead7";

const police = (fichier) => readFileSync(new URL(`../fonts/${fichier}`, import.meta.url));
const FONTS = [
  { name: "Inter", data: police("Inter-Medium.ttf"), weight: 500, style: "normal" },
  { name: "Inter", data: police("Inter-SemiBold.ttf"), weight: 600, style: "normal" },
  { name: "Inter", data: police("Inter-ExtraBold.ttf"), weight: 800, style: "normal" },
];

// Mesures par forme (en pixels de l'affiche), puis facteurs des réglages.
const MESURES = {
  poster: { texte: 26, marge: 20, haut: 18, ligneBas: 24, logoL: 0.8, logoH: 0.24 },
  // Paysage : logo en bas à gauche, ligne du bas plus petite en bas à droite, alignés sur le même bas.
  landscape: { texte: 29, marge: 22, haut: 20, ligneBas: 26, logoL: 0.45, logoH: 0.34, cote: true, ligne: 0.72 },
};
// Tailles réglées à la main (0,6 à 1,4) : un facteur appliqué à la mesure de base.
const FORCE = { s: 0.7, m: 0.88, l: 0.96 };
const SEPARATEURS = { point: "·", barre: "|", puce: "•" };
const STYLES_DEFAUT = { statut: "texte", tendance: "fleche", qualite: "texte", titre: 1, note: "etoile", texte: 1, sep: "point", haut: 1, fondu: { couleur: "noir", force: "m" } };

async function telecharger(url, fetchImpl) {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(DELAI_MS) });
  if (!res.ok) throw new Error(`image ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const h = (type, style, children) => ({ type, props: { style, children } });
const svg = (taille, viewBox, d, fill) => ({
  type: "svg",
  props: { width: taille, height: taille, viewBox, children: { type: "path", props: { d, fill } } },
});
const ETOILE = "M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.5l7.1-.6z";
const FLECHE = "M7 17L17 7M9 7h8v8";
const OMBRE = "0 2px 8px rgba(0,0,0,0.7)";
const fleche = (t) => ({
  type: "svg",
  props: { width: t * 0.9, height: t * 0.9, viewBox: "0 0 24 24", style: { marginRight: t * 0.3 },
    children: { type: "path", props: { d: FLECHE, fill: "none", stroke: OR, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } } },
});

/** Hauteur occupée par la ligne du bas (pour poser le logo juste au-dessus). */
function hauteurLigne(content, m) {
  if (!content.line) return 0;
  const t = m.texte * (Number(content.styles.texte) || 1);
  return content.styles.note === "grand" && content.line.note ? t * 2.45 : t * 1.2;
}

/** La ligne du bas : genre · note · année, ou la note en grand chiffre entre le genre et l'année. */
function ligneDuBas(content, m) {
  const st = content.styles, t = m.texte * (m.ligne || 1) * (Number(st.texte) || 1), { genre, note, annee } = content.line;
  const grand = st.note === "grand" && note;
  const morceaux = [];
  if (grand) {
    if (genre) morceaux.push(h("span", { fontSize: t * 0.77, opacity: 0.8, marginRight: t * 0.5 }, genre));
    morceaux.push(h("span", { fontSize: t * 2.45, fontWeight: 800, color: "#fff", lineHeight: 1 }, note));
    if (annee) morceaux.push(h("span", { fontSize: t * 0.77, fontWeight: 500, opacity: 0.8, marginLeft: t * 0.5 }, annee));
  } else {
    const parts = [];
    if (genre) parts.push(h("span", {}, genre));
    if (note) {
      parts.push(h("div", { display: "flex", alignItems: "center" }, st.note === "etoile"
        ? [h("div", { display: "flex", marginRight: t * 0.25 }, svg(t * 0.8, "0 0 24 24", ETOILE, OR)), h("span", {}, note)]
        : [h("span", {}, note)]));
    }
    if (annee) parts.push(h("span", { fontWeight: 500, opacity: 0.7 }, annee));
    parts.forEach((p, i) => {
      if (i) morceaux.push(h("span", { margin: `0 ${t * 0.35}px`, opacity: 0.9 }, SEPARATEURS[st.sep]));
      morceaux.push(p);
    });
  }
  const place = m.cote
    ? { right: m.marge, justifyContent: "flex-end", alignItems: "flex-end" }
    : { left: 0, right: 0, justifyContent: "center", alignItems: "center" };
  return h("div", {
    position: "absolute", bottom: m.ligneBas, display: "flex", ...place,
    fontSize: t, fontWeight: 600, color: "rgba(255,255,255,0.9)", textShadow: OMBRE,
  }, morceaux);
}

/** En haut à gauche : le statut, puis le rang de tendance dessous. */
function hautGauche(content, m) {
  const st = content.styles, t = m.texte * (Number(st.haut) || 1), pile = [];
  if (content.statut) {
    pile.push(st.statut === "etiquette"
      ? h("div", { display: "flex", background: CREME, color: ENCRE, borderRadius: 5, padding: "4px 8px", fontSize: t * 0.62, fontWeight: 800, letterSpacing: t * 0.05 }, content.statut)
      : h("div", { display: "flex", fontSize: t * 0.7, fontWeight: 800, letterSpacing: t * 0.08, color: "#fff", textShadow: OMBRE }, content.statut));
  }
  if (content.rank) {
    if (st.tendance === "ruban") {
      pile.push(h("div", { display: "flex", background: OR, color: ENCRE, marginLeft: -m.marge, borderRadius: "0 6px 6px 0", padding: `4px 12px 4px ${m.marge}px`, fontSize: t * 0.92, fontWeight: 800 }, `N°${content.rank}`));
    } else {
      pile.push(h("div", { display: "flex", alignItems: "center", fontSize: t, fontWeight: 800, color: "#fff", textShadow: OMBRE }, [fleche(t), h("span", {}, `N°${content.rank}`)]));
    }
  }
  if (!pile.length) return null;
  return h("div", { position: "absolute", left: m.marge, top: m.haut, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: t * 0.25 }, pile);
}

/** En haut à droite : la qualité (« 4K | DV »), en texte nu ou en pastille claire. */
function hautDroite(content, m) {
  const t = m.texte * (Number(content.styles.haut) || 1), pastille = content.styles.qualite === "pastille";
  const q = [h("span", {}, "4K")];
  if (content.quality.extra) {
    q.push(h("div", { display: "flex", width: 3, height: t * 0.92, background: pastille ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.55)", margin: `0 ${t * 0.45}px` }));
    q.push(h("span", { fontWeight: 500, opacity: 0.85 }, content.quality.extra));
  }
  const style = { position: "absolute", right: m.marge, top: m.haut, display: "flex", alignItems: "center", fontSize: t, fontWeight: 800 };
  return h("div", pastille
    ? { ...style, background: "rgba(255,255,255,0.92)", color: ENCRE, borderRadius: 6, padding: "3px 9px", fontSize: t * 0.85 }
    : { ...style, color: "#fff", textShadow: OMBRE }, q);
}

/** Calque des textes, en SVG transparent de la taille de l'affiche. */
async function calqueTexte(content, [w, hgt], m) {
  const enfants = [];
  if (content.line) enfants.push(ligneDuBas(content, m));
  const gauche = hautGauche(content, m);
  if (gauche) enfants.push(gauche);
  if (content.quality) enfants.push(hautDroite(content, m));
  if (!enfants.length) return null;
  const racine = h("div", { width: w, height: hgt, display: "flex", position: "relative", fontFamily: "Inter" }, enfants);
  return Buffer.from(await satori(racine, { width: w, height: hgt, fonts: FONTS }));
}

/** Teinte du fondu « couleurs de l'affiche » : la couleur moyenne du bas de l'image, sombre et saturée. */
async function teinteDe(base, [w, hgt]) {
  const bande = await sharp(base).extract({ left: 0, top: Math.round(hgt * 0.6), width: w, height: Math.round(hgt * 0.4) }).toBuffer();
  const [r, g, b] = (await sharp(bande).stats()).channels.map((c) => c.mean / 255);
  // RGB → HSL, puis luminosité 18 % et saturation × 1,4.
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let hue = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    if (hue < 0) hue += 6;   // rouge dominant avec plus de bleu que de vert (affiches rouges, roses, magenta)
  }
  const L = 0.18, S = Math.min(1, s * 1.4), C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs((hue % 2) - 1)), M = L - C / 2;
  const [r1, g1, b1] = hue < 1 ? [C, X, 0] : hue < 2 ? [X, C, 0] : hue < 3 ? [0, C, X] : hue < 4 ? [0, X, C] : hue < 5 ? [X, 0, C] : [C, 0, X];
  const hex = (v) => Math.round((v + M) * 255).toString(16).padStart(2, "0");
  return `#${hex(r1)}${hex(g1)}${hex(b1)}`;
}

/** Dégradés : le fondu du bas (noir ou teinté) sous le logo et la ligne, le voile du haut sous les badges. */
function calqueDegrades(content, [w, hgt], teinte) {
  const fondu = content.full && content.styles.fondu, haut = !!(content.statut || content.rank || content.quality);
  if (!fondu && !haut) return null;
  const hb = Math.round(hgt * 0.52), hh = Math.round(hgt * 0.22);
  const couleur = fondu && fondu.couleur === "affiche" && teinte ? teinte : "#000", force = fondu ? FORCE[fondu.force] : 0;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}">
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${couleur}" stop-opacity="0"/><stop offset="1" stop-color="${couleur}" stop-opacity="${force}"/></linearGradient>
    <linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
  </defs>
  ${fondu ? `<rect x="0" y="${hgt - hb}" width="${w}" height="${hb}" fill="url(#b)"/>` : ""}
  ${haut ? `<rect x="0" y="0" width="${w}" height="${hh}" fill="url(#h)"/>` : ""}
</svg>`);
}

// Adresses des images d'une affiche : le fond (w780 suffit pour 800 px de large) et le logo.
const urlFond = (content) => IMG + (content.shape === "landscape" ? "w780" : "w500") + content.image;
const urlLogo = (content) => (content.full && content.logo ? IMG + (/\.svg$/i.test(content.logo) ? "original" : "w500") + content.logo : null);

/** Les images que draw() téléchargera : on peut les demander en avance. */
export const imageUrls = (content) => [urlFond(content), urlLogo(content)].filter(Boolean);

/** Le logo du titre, réduit dans sa boîte (selon la taille choisie) et centré au-dessus de la ligne. */
async function calqueLogo(content, [w, hgt], m, fetchImpl) {
  const url = urlLogo(content);
  if (!url) return null;
  const echelle = Number(content.styles.titre) || 1;
  // Agrandi à la main, le logo reste dans l'affiche : jamais plus large qu'elle (marges comprises) ni plus haut que sa moitié.
  const boiteL = Math.min(Math.round(w * m.logoL * echelle), w - 2 * m.marge), boiteH = Math.min(Math.round(hgt * m.logoH * echelle), Math.round(hgt * 0.5));
  const svgLogo = /\.svg$/i.test(content.logo);
  const brut = await telecharger(url, fetchImpl);
  // Marges transparentes retirées : seule la partie visible du logo compte pour sa taille et sa place.
  // Un SVG est dessiné à la taille utile (environ 2 fois sa boîte), pas à sa taille déclarée, qui peut être énorme.
  let options = {};
  if (svgLogo) {
    const { width } = await sharp(brut).metadata();
    options = { density: Math.min(300, Math.max(1, (72 * 2 * boiteL) / (width || 1))) };
  }
  const source = await sharp(brut, options).ensureAlpha().png().toBuffer();
  const zone = cadreVisible(await sharp(source).raw().toBuffer({ resolveWithObject: true }));
  const { data, info } = await sharp(source).extract(zone)
    .resize({ width: boiteL, height: boiteH, fit: "inside" })
    .png().toBuffer({ resolveWithObject: true });
  // Placé d'après sa partie pleine (les lettres) : halos et traînées semi-transparents ne le décalent pas.
  const plein = cadreVisible(await sharp(data).raw().toBuffer({ resolveWithObject: true }), 128);
  if (m.cote) {
    // Paysage : les lettres commencent à la marge de gauche, et le logo descend jusqu'au bas de la ligne.
    const left = Math.min(Math.max(Math.round(m.marge - plein.left), 0), w - info.width);
    return { input: data, left, top: Math.max(0, Math.round(hgt - m.ligneBas - info.height)) };
  }
  const centre = plein.left + plein.width / 2;
  const left = Math.min(Math.max(Math.round(w / 2 - centre), 0), w - info.width);
  const bas = m.ligneBas + hauteurLigne(content, m) + m.texte * 0.65;
  return { input: data, left, top: Math.max(0, Math.round(hgt - bas - info.height)) };
}

/** Cadre des pixels d'opacité > seuil d'une image RGBA brute ; l'image entière si aucun ne l'est. */
function cadreVisible({ data, info }, seuil = 16) {
  let l = info.width, r = -1, t = info.height, b = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > seuil) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
    }
  }
  return r < 0 ? { left: 0, top: 0, width: info.width, height: info.height } : { left: l, top: t, width: r - l + 1, height: b - t + 1 };
}

/** JPEG d'une affiche (400×600 en portrait, 800×450 en paysage). Lève une erreur si l'image de base manque. */
export async function draw(content, fetchImpl = fetch) {
  content = { ...content, styles: { ...STYLES_DEFAUT, ...(content.styles || {}) } };
  const taille = SIZES[content.shape], m = MESURES[content.shape];
  const [w, hgt] = taille;
  const [fond, logo, texte] = await Promise.all([
    telecharger(urlFond(content), fetchImpl),
    // Pas de repli sans logo : sur l'image sans texte, il porte le titre. Une erreur ici fait répondre
    // une erreur au service, et Nuvio montre l'affiche d'origine.
    calqueLogo(content, taille, m, fetchImpl),
    calqueTexte(content, taille, m),
  ]);
  // Pas encore sorti : l'image en noir et blanc ; les badges, posés ensuite, gardent leurs couleurs.
  let image = sharp(fond).resize(w, hgt, { fit: "cover", position: "attention" });
  if (content.gris) image = image.grayscale().toColourspace("srgb");
  const base = await image.toBuffer();
  const fondu = content.full && content.styles.fondu;
  const teinte = fondu && fondu.couleur === "affiche" ? await teinteDe(base, taille) : null;
  const calques = [];
  const degrades = calqueDegrades(content, taille, teinte);
  if (degrades) calques.push({ input: degrades, left: 0, top: 0 });
  if (logo) calques.push(logo);
  if (texte) calques.push({ input: texte, left: 0, top: 0 });
  // JPEG standard plutôt que mozjpeg : 3 fois moins de calcul pour des fichiers à peine plus lourds.
  return sharp(base).composite(calques).jpeg({ quality: 82 }).toBuffer();
}
