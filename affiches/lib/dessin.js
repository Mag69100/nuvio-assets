/**
 * Le dessin d'une affiche maison. sharp pose les images (fond, dégradés, logo) et fait le JPEG ;
 * satori écrit les textes (police Inter) sous forme de tracés SVG, donc sans police à installer.
 * Mesures : maquette « Gras + léger » validée, ×2 en portrait (maquette de 200 px), ×2,25 en paysage.
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";
import satori from "satori";

export const SIZES = { poster: [400, 600], landscape: [800, 450] };
const IMG = "https://image.tmdb.org/t/p/";
const DELAI_MS = 3000;
const OR = "#f5c518";

const police = (fichier) => readFileSync(new URL(`../fonts/${fichier}`, import.meta.url));
const FONTS = [
  { name: "Inter", data: police("Inter-Medium.ttf"), weight: 500, style: "normal" },
  { name: "Inter", data: police("Inter-SemiBold.ttf"), weight: 600, style: "normal" },
  { name: "Inter", data: police("Inter-ExtraBold.ttf"), weight: 800, style: "normal" },
];

// Mesures par forme (en pixels de l'affiche).
const MESURES = {
  poster: { texte: 26, marge: 20, haut: 18, ligneBas: 24, logoBas: 72, logoL: 0.8, logoH: 0.24 },
  landscape: { texte: 29, marge: 22, haut: 20, ligneBas: 27, logoBas: 81, logoL: 0.55, logoH: 0.3 },
};

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

/** Calque des textes (ligne du bas, rang, qualité), en SVG transparent de la taille de l'affiche. */
async function calqueTexte(content, [w, hgt], m) {
  const enfants = [];
  if (content.line && content.line.length) {
    const morceaux = [];
    content.line.forEach((txt, i) => {
      if (i) morceaux.push(h("span", { margin: `0 ${m.texte * 0.35}px`, opacity: 0.9 }, "·"));
      const estNote = /^\d+,\d$/.test(txt), estAnnee = /^\d{4}$/.test(txt);
      if (estNote) morceaux.push(h("div", { display: "flex", marginRight: m.texte * 0.25 }, svg(m.texte * 0.8, "0 0 24 24", ETOILE, OR)));
      morceaux.push(h("span", estAnnee ? { fontWeight: 500, opacity: 0.7 } : {}, txt));
    });
    enfants.push(h("div", {
      position: "absolute", left: 0, right: 0, bottom: m.ligneBas, display: "flex", justifyContent: "center", alignItems: "center",
      fontSize: m.texte, fontWeight: 600, color: "rgba(255,255,255,0.9)", textShadow: OMBRE,
    }, morceaux));
  }
  if (content.rank) {
    enfants.push(h("div", {
      position: "absolute", left: m.marge, top: m.haut, display: "flex", alignItems: "center",
      fontSize: m.texte, fontWeight: 800, color: "#fff", textShadow: OMBRE,
    }, [
      { type: "svg", props: { width: m.texte * 0.9, height: m.texte * 0.9, viewBox: "0 0 24 24", style: { marginRight: m.texte * 0.3 },
        children: { type: "path", props: { d: FLECHE, fill: "none", stroke: OR, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } } } },
      h("span", {}, `N°${content.rank}`),
    ]));
  }
  if (content.quality) {
    const q = [h("span", {}, "4K")];
    if (content.quality.extra) {
      q.push(h("div", { display: "flex", width: 3, height: m.texte * 0.92, background: "rgba(255,255,255,0.55)", margin: `0 ${m.texte * 0.45}px` }));
      q.push(h("span", { fontWeight: 500, opacity: 0.85 }, content.quality.extra));
    }
    enfants.push(h("div", {
      position: "absolute", right: m.marge, top: m.haut, display: "flex", alignItems: "center",
      fontSize: m.texte, fontWeight: 800, color: "#fff", textShadow: OMBRE,
    }, q));
  }
  if (!enfants.length) return null;
  const racine = h("div", { width: w, height: hgt, display: "flex", position: "relative", fontFamily: "Inter" }, enfants);
  return Buffer.from(await satori(racine, { width: w, height: hgt, fonts: FONTS }));
}

/** Dégradés (bas sous le logo et la ligne, voile du haut sous les badges), en SVG. */
function calqueDegrades(content, [w, hgt]) {
  const bas = content.full, haut = !!(content.rank || content.quality);
  if (!bas && !haut) return null;
  const hb = Math.round(hgt * 0.52), hh = Math.round(hgt * 0.22);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}">
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.88"/></linearGradient>
    <linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
  </defs>
  ${bas ? `<rect x="0" y="${hgt - hb}" width="${w}" height="${hb}" fill="url(#b)"/>` : ""}
  ${haut ? `<rect x="0" y="0" width="${w}" height="${hh}" fill="url(#h)"/>` : ""}
</svg>`);
}

/** Le logo du titre, réduit dans sa boîte et centré au-dessus de la ligne. */
async function calqueLogo(content, [w, hgt], m, fetchImpl) {
  if (!content.full || !content.logo) return null;
  const svgLogo = /\.svg$/i.test(content.logo);
  const brut = await telecharger(IMG + (svgLogo ? "original" : "w500") + content.logo, fetchImpl);
  const { data, info } = await sharp(brut, svgLogo ? { density: 300 } : {})
    .resize({ width: Math.round(w * m.logoL), height: Math.round(hgt * m.logoH), fit: "inside" })
    .png().toBuffer({ resolveWithObject: true });
  return { input: data, left: Math.round((w - info.width) / 2), top: hgt - m.logoBas - info.height };
}

/** JPEG d'une affiche (400×600 en portrait, 800×450 en paysage). Lève une erreur si l'image de base manque. */
export async function draw(content, fetchImpl = fetch) {
  const taille = SIZES[content.shape], m = MESURES[content.shape];
  const [w, hgt] = taille;
  const [fond, logo, texte] = await Promise.all([
    telecharger(IMG + (content.shape === "landscape" ? "w1280" : "w500") + content.image, fetchImpl),
    calqueLogo(content, taille, m, fetchImpl).catch(() => null),
    calqueTexte(content, taille, m),
  ]);
  const calques = [];
  const degrades = calqueDegrades(content, taille);
  if (degrades) calques.push({ input: degrades, left: 0, top: 0 });
  if (logo) calques.push(logo);
  if (texte) calques.push({ input: texte, left: 0, top: 0 });
  const base = await sharp(fond).resize(w, hgt, { fit: "cover", position: "attention" }).toBuffer();
  return sharp(base).composite(calques).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}
