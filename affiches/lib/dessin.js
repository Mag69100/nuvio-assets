/**
 * Le dessin d'une affiche maison. sharp pose les images (fond, flous, dégradés, logo) et fait le JPEG ;
 * satori écrit les textes (police Inter, ou Bebas Neue en style « Cinéma ») sous forme de tracés SVG, donc sans
 * police à installer.
 * Les styles viennent des réglages de la régie (content.styles, voir lib/contenu.js) ; sans réglage, le rendu
 * est celui de la maquette « Gras + léger » validée, en pixels d'une affiche de 400 px de large.
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";
import satori from "satori";

export const SIZES = { poster: [400, 600], landscape: [800, 450] };
const IMG = "https://image.tmdb.org/t/p/";
const DELAI_MS = 3000;
const OR = "#f5c518", ENCRE = "#120b0e", CREME = "#f3ead7";
// Couleur d'accent (étoile, flèche, ruban, bandeau, barre fine) ; « affiche » : la teinte vive de l'image.
const ACCENTS = { or: OR, blanc: "#ffffff", rouge: "#e5484d", bleu: "#4c9aff" };
// Couleur selon la note (sur 10) : bonne, moyenne, mauvaise.
const couleurNote = (n) => (n >= 7.5 ? "#46c46e" : n >= 6 ? "#f5c518" : "#e5484d");

const police = (fichier) => readFileSync(new URL(`../fonts/${fichier}`, import.meta.url));
const FONTS = [
  { name: "Inter", data: police("Inter-Medium.ttf"), weight: 500, style: "normal" },
  { name: "Inter", data: police("Inter-SemiBold.ttf"), weight: 600, style: "normal" },
  { name: "Inter", data: police("Inter-ExtraBold.ttf"), weight: 800, style: "normal" },
  { name: "Bebas Neue", data: police("BebasNeue-Regular.ttf"), weight: 400, style: "normal" },
];
// Police « Cinéma » : Bebas Neue, haute et serrée, un peu agrandie pour se lire aussi bien qu'Inter.
const POLICES = { inter: { nom: "Inter", echelle: 1 }, bebas: { nom: "Bebas Neue", echelle: 1.2 } };

// Mesures par forme (en pixels de l'affiche), puis facteurs des réglages.
const MESURES = {
  poster: { texte: 26, marge: 20, haut: 18, ligneBas: 24, logoL: 0.8, logoH: 0.24 },
  // Paysage : logo en bas à gauche, ligne du bas plus petite en bas à droite, alignés sur le même bas.
  landscape: { texte: 29, marge: 22, haut: 20, ligneBas: 26, logoL: 0.45, logoH: 0.34, cote: true, ligne: 0.72 },
};
// Tailles réglées à la main (0,6 à 1,4) : un facteur appliqué à la mesure de base.
const FORCE = { s: 0.7, m: 0.88, l: 0.96 };
const HAUTEUR_FONDU = { court: 0.4, normal: 0.52, long: 0.66 };
const VOILE = { 0: 0, s: 0.25, m: 0.45, l: 0.65 };
const OPACITE = { s: 0.6, m: 0.8, l: 1 };
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
const OMBRE = "0 2px 8px rgba(0,0,0,0.7)", SANS_OMBRE = "0 0 0 transparent";
const BADGES_NOTE = { imdb: { fond: OR, nom: "IMDb" }, tmdb: { fond: "#01b4e4", nom: "TMDB" } };
const fleche = (t, couleur) => ({
  type: "svg",
  props: { width: t * 0.9, height: t * 0.9, viewBox: "0 0 24 24", style: { marginRight: t * 0.3 },
    children: { type: "path", props: { d: FLECHE, fill: "none", stroke: couleur, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } } },
});
const img = (src, taille, style = {}) => ({ type: "img", props: { src, width: taille, height: taille, style: { width: taille, height: taille, ...style } } });

/** Hauteur occupée par la ligne du bas (pour poser le logo juste au-dessus). */
function hauteurLigne(content, m) {
  if (!content.line) return 0;
  const t = m.texte * (Number(content.styles.texte) || 1);
  return content.styles.note === "grand" && content.line.note ? t * 2.45 : t * 1.2;
}

// ---------- Notes ----------

/** Pastille de marque d'une autre note : Rotten Tomatoes (tomate rouge), Metacritic (carré à la couleur du score), Letterboxd (trois points). */
function sigle(s, n, t) {
  const c = t * 0.82;
  if (s === "lb") {
    const point = (x, couleur) => ({ type: "circle", props: { cx: x, cy: 6, r: 5, fill: couleur } });
    return { type: "svg", props: { width: c * 1.6, height: c * 0.62, viewBox: "0 0 32 12", children: [point(6, "#ff8000"), point(16, "#00e054"), point(26, "#40bcf4")] } };
  }
  const fond = s === "rt" ? "#fa320a" : n >= 6.1 ? "#66cc33" : n >= 4 ? "#ffcc33" : "#ff0000";
  return h("div", { display: "flex", alignItems: "center", justifyContent: "center", width: c * 1.35, height: c, borderRadius: s === "rt" ? c : c * 0.18,
    background: fond, color: s === "rt" ? "#fff" : ENCRE, fontSize: c * 0.52, fontWeight: 800, textShadow: SANS_OMBRE }, s === "rt" ? "RT" : "MC");
}

/** La note principale (★ 8,4, 8,4 ou badge IMDb/TMDB) puis les autres notes, serrées ensemble. */
function blocNotes(content, t, accent) {
  const st = content.styles, l = content.line, morceaux = [];
  const couleur = st.couleurNote && l.noteN ? couleurNote(l.noteN) : null;
  const halo = (c) => (st.couleurNote === "halo" && c ? { textShadow: `0 0 ${t * 0.45}px ${c}` } : {});
  if (l.note && st.note === "badge") {
    // Façon Posters+ : la source en petit et la note, sur une pastille à ses couleurs.
    const b = BADGES_NOTE[l.source === "tmdb" ? "tmdb" : "imdb"];
    morceaux.push(h("div", { display: "flex", alignItems: "center", background: b.fond, color: ENCRE, borderRadius: t * 0.18, padding: `${t * 0.04}px ${t * 0.25}px`, fontWeight: 800, textShadow: SANS_OMBRE }, [
      h("span", { fontSize: t * 0.6, marginRight: t * 0.22 }, b.nom), h("span", {}, l.note)]));
  } else if (l.note) {
    morceaux.push(h("div", { display: "flex", alignItems: "center", ...(couleur ? { color: couleur } : {}), ...halo(couleur) }, st.note === "etoile"
      ? [h("div", { display: "flex", marginRight: t * 0.25 }, svg(t * 0.8, "0 0 24 24", ETOILE, couleur || accent)), h("span", {}, l.note)]
      : [h("span", {}, l.note)]));
  }
  for (const x of l.notes || []) {
    const c = st.couleurNote ? couleurNote(x.n) : null;
    morceaux.push(h("div", { display: "flex", alignItems: "center", marginLeft: morceaux.length ? t * 0.45 : 0, ...(c ? { color: c } : {}), ...halo(c) },
      [h("div", { display: "flex", marginRight: t * 0.22 }, sigle(x.s, x.n, t)), h("span", {}, x.v)]));
  }
  // Une seule note : posée telle quelle (même dessin qu'avant les notes multiples).
  return morceaux.length > 1 ? h("div", { display: "flex", alignItems: "center" }, morceaux) : morceaux[0] || null;
}

// ---------- La ligne du bas ----------

/**
 * Largeur estimée de la ligne du bas, en multiples de la taille du texte (une lettre ≈ 0,56 ; Bebas ≈ 0,42) :
 * assez juste pour réduire le texte d'une ligne trop chargée avant qu'elle ne déborde ou ne passe à la ligne.
 */
function largeurLigne(l, st, police) {
  const c = police === "Bebas Neue" ? 0.44 : 0.6, mots = (x) => (x ? String(x).length * c : 0);
  if (st.note === "grand" && l.note) return mots(l.genre) * 0.77 + mots(l.note) * 2.45 + mots(l.annee) * 0.77 + mots(l.duree) * 0.77 + 2;
  const parts = [l.genre, l.note || (l.notes && l.notes.length), l.annee, l.duree].filter(Boolean).length;
  let em = mots(l.genre) + mots(l.annee) + mots(l.duree) + Math.max(0, parts - 1) * (0.7 + c);
  if (l.note) em += mots(l.note) + (st.note === "badge" ? 4 * c * 0.6 + 0.75 : st.note === "etoile" ? 1.05 : 0);
  for (const x of l.notes || []) em += 1.35 + 0.22 + mots(x.v) + 0.45;
  if (l.age) em += 0.4 + (String(l.age).length + 1) * c * 0.72 + 0.55;
  if (l.plateforme) em += 1.55;
  return em;
}

/** La ligne du bas : genre · notes · année · durée (dans l'ordre choisi), ou la note en grand chiffre, puis l'âge et la plateforme. */
function ligneDuBas(content, m, accent, images, [w]) {
  const st = content.styles;
  // Ligne trop chargée pour sa place : le texte rapetisse (jusqu'à 55 %) au lieu de déborder ; si elle ne tient
  // toujours pas, le genre, puis la durée, puis l'année laissent la place (un texte plus petit ne se lirait plus).
  const place0 = (m.disposition === "cote" ? w * 0.5 : w - 2 * m.marge) - 4;
  let t = m.texte * (m.ligne || 1) * (Number(st.texte) || 1), l = content.line;
  // Seulement pour une ligne qui porte des éléments v2 (autres notes, durée, plateforme) : une ligne d'avant garde
  // exactement son dessin (même ETag, même image).
  const chargee = !!((l.notes && l.notes.length) || l.duree || l.plateforme);
  for (const k of chargee ? ["genre", "duree", "annee"] : []) {
    if (largeurLigne(l, st, m.police) * t * 0.55 <= place0) break;
    l = { ...l };
    delete l[k];
  }
  if (chargee) t *= Math.max(0.55, Math.min(1, place0 / (largeurLigne(l, st, m.police) * t)));
  const grand = st.note === "grand" && l.note;
  const morceaux = [];
  // L'âge conseillé, dans un petit cadre au bout de la ligne (sans séparateur).
  const age = l.age
    ? h("div", { display: "flex", border: `${Math.max(1.5, t * 0.07)}px solid rgba(255,255,255,0.85)`, borderRadius: t * 0.15, padding: `0 ${t * 0.2}px`, marginLeft: t * 0.4, fontSize: t * 0.72, fontWeight: 800, lineHeight: 1.3 }, "-" + l.age)
    : null;
  const plateforme = l.plateforme && images[l.plateforme] ? img(images[l.plateforme], t * 1.1, { borderRadius: t * 0.22, marginLeft: t * 0.45 }) : null;
  if (grand) {
    const couleur = st.couleurNote && l.noteN ? couleurNote(l.noteN) : "#fff";
    if (l.genre) morceaux.push(h("span", { fontSize: t * 0.77, opacity: 0.8, marginRight: t * 0.5 }, l.genre));
    morceaux.push(h("span", { fontSize: t * 2.45, fontWeight: 800, color: couleur, lineHeight: 1, ...(st.couleurNote === "halo" ? { textShadow: `0 0 ${t * 0.6}px ${couleur}` } : {}) }, l.note));
    if (l.annee) morceaux.push(h("span", { fontSize: t * 0.77, fontWeight: 500, opacity: 0.8, marginLeft: t * 0.5 }, l.annee));
    if (l.duree) morceaux.push(h("span", { fontSize: t * 0.77, fontWeight: 500, opacity: 0.8, marginLeft: t * 0.5 }, l.duree));
  } else {
    const parts = {
      g: l.genre ? h("span", {}, l.genre) : null,
      n: blocNotes(content, t, accent),
      a: l.annee ? h("span", { fontWeight: 500, opacity: 0.7 }, l.annee) : null,
    };
    const suite = [...(l.ordre || "gna")].map((k) => parts[k]);
    if (l.duree) suite.push(h("span", { fontWeight: 500, opacity: 0.7 }, l.duree));
    suite.filter(Boolean).forEach((p, i) => {
      if (i) morceaux.push(h("span", { margin: `0 ${t * 0.35}px`, opacity: 0.9 }, SEPARATEURS[st.sep]));
      morceaux.push(p);
    });
  }
  if (age) morceaux.push(age);
  if (plateforme) morceaux.push(plateforme);
  const place = {
    cote: { right: m.marge, justifyContent: "flex-end", alignItems: "flex-end" },
    centre: { left: 0, right: 0, justifyContent: "center", alignItems: "center" },
    gauche: { left: m.marge, justifyContent: "flex-start", alignItems: "center" },
  }[m.disposition];
  return h("div", {
    position: "absolute", bottom: m.ligneBas, display: "flex", ...place, whiteSpace: "nowrap",
    fontSize: t, fontWeight: 600, color: "rgba(255,255,255,0.9)", textShadow: OMBRE,
  }, morceaux);
}

/** Barre fine : un trait à la couleur d'accent juste au-dessus de la ligne du bas. */
function barreFine(content, m, [w], accent) {
  const t = m.texte * (m.ligne || 1) * (Number(content.styles.texte) || 1), large = Math.round(w * 0.22);
  const bas = m.ligneBas + hauteurLigne(content, m) * (m.ligne || 1) + t * 0.35;
  const place = m.disposition === "cote" ? { right: m.marge } : m.disposition === "gauche" ? { left: m.marge } : { left: Math.round((w - large) / 2) };
  return h("div", { position: "absolute", bottom: bas, width: large, height: 3, borderRadius: 2, background: accent, display: "flex", ...place });
}

// ---------- Le haut ----------

/** Boîte commune des badges du haut quand un style commun est choisi (plein, verre, contour). */
function boite(badges, t, accent) {
  if (!badges) return null;
  const a = OPACITE[badges.opacite] || 1, rayon = { arrondi: t * 0.25, carre: 2, pilule: 999 }[badges.forme] || t * 0.25;
  const texte = badges.couleur === "or" ? accent : badges.couleur === "noir" ? ENCRE : "#fff";
  const fond = {
    plein: { background: badges.couleur === "noir" ? `rgba(243,234,215,${a})` : `rgba(18,11,14,${0.85 * a})` },
    verre: { background: `rgba(255,255,255,${0.18 * a})`, border: "1px solid rgba(255,255,255,0.35)" },
    contour: { border: `1.5px solid ${badges.couleur === "or" ? accent : "rgba(255,255,255,0.85)"}` },
  }[badges.style] || {};
  return { display: "flex", alignItems: "center", borderRadius: rayon, padding: `${t * 0.14}px ${t * 0.38}px`, color: texte, textShadow: badges.style === "plein" ? SANS_OMBRE : OMBRE, ...fond };
}

/** Le statut, puis le rang de tendance dessous (en haut à gauche, ou à droite si les côtés sont inversés). */
function blocStatut(content, m, accent, cote, descente) {
  const st = content.styles, t = m.texte * (Number(st.haut) || 1), pile = [], b = boite(st.badges, t, accent);
  if (content.statut) {
    pile.push(b
      ? h("div", { ...b, fontSize: t * 0.62, fontWeight: 800, letterSpacing: t * 0.05 }, content.statut)
      : st.statut === "etiquette"
        ? h("div", { display: "flex", background: CREME, color: ENCRE, borderRadius: 5, padding: "4px 8px", fontSize: t * 0.62, fontWeight: 800, letterSpacing: t * 0.05 }, content.statut)
        : h("div", { display: "flex", fontSize: t * 0.7, fontWeight: 800, letterSpacing: t * 0.08, color: "#fff", textShadow: OMBRE }, content.statut));
  }
  if (content.rank) {
    if (b) {
      pile.push(h("div", { ...b, fontSize: t * 0.86, fontWeight: 800 }, [fleche(t * 0.86, b.color === ENCRE ? ENCRE : accent), h("span", {}, `N°${content.rank}`)]));
    } else if (st.tendance === "ruban") {
      const ruban = cote === "left"
        ? { marginLeft: -m.marge, borderRadius: "0 6px 6px 0", padding: `4px 12px 4px ${m.marge}px` }
        : { marginRight: -m.marge, borderRadius: "6px 0 0 6px", padding: `4px ${m.marge}px 4px 12px` };
      pile.push(h("div", { display: "flex", background: accent, color: ENCRE, fontSize: t * 0.92, fontWeight: 800, ...ruban }, `N°${content.rank}`));
    } else {
      pile.push(h("div", { display: "flex", alignItems: "center", fontSize: t, fontWeight: 800, color: "#fff", textShadow: OMBRE }, [fleche(t, accent), h("span", {}, `N°${content.rank}`)]));
    }
  }
  if (!pile.length) return null;
  return h("div", { position: "absolute", [cote]: m.marge, top: m.haut + descente, display: "flex", flexDirection: "column", alignItems: cote === "left" ? "flex-start" : "flex-end", gap: t * 0.25 }, pile);
}

// Logo Dolby Vision : deux « D » pleins, arrondis face à face au milieu (dessiné ici, en couleur du texte).
export const DOLBY = "M3 2h10a10 10 0 0 1 0 20H3zM45 2H35a10 10 0 0 0 0 20h10z";

/** « 4K » (ou « 1080p »), puis une fine barre et « HDR », « HDR10+ » ou le logo Dolby Vision, puis « ATMOS ». */
export function elementsQualite(extra, t, pastille, label = "4K", atmos = false) {
  const q = [h("span", {}, label)];
  const trait = () => h("div", { display: "flex", width: 3, height: t * 0.92, background: pastille ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.55)", margin: `0 ${t * 0.45}px` });
  if (extra) {
    q.push(trait());
    q.push(extra === "DV"
      ? { type: "svg", props: { width: t * 1.6, height: t * 0.8, viewBox: "0 0 48 24", style: { opacity: 0.92 },
          children: { type: "path", props: { d: DOLBY, fill: pastille ? ENCRE : "#fff", fillRule: "evenodd" } } } }
      : h("span", { fontWeight: 500, opacity: 0.85 }, extra));
  }
  if (atmos) {
    q.push(trait());
    q.push(h("span", { fontSize: t * 0.6, fontWeight: 800, letterSpacing: t * 0.06, opacity: 0.9 }, "ATMOS"));
  }
  return q;
}

/** La qualité (« 4K | HDR »…) et, dessous, le logo de plateforme en coin ; en haut à droite (à gauche si inversé). */
function blocQualite(content, m, accent, cote, descente, images) {
  const st = content.styles, t = m.texte * (Number(st.haut) || 1), b = boite(st.badges, t, accent), pile = [];
  if (content.quality) {
    const pastille = !b && st.qualite === "pastille";
    const q = elementsQualite(content.quality.extra, t, pastille || (b && b.color === ENCRE), content.quality.label || "4K", !!content.quality.atmos);
    pile.push(h("div", b
      ? { ...b, fontSize: t * 0.85, fontWeight: 800 }
      : pastille
        ? { display: "flex", alignItems: "center", background: "rgba(255,255,255,0.92)", color: ENCRE, borderRadius: 6, padding: "3px 9px", fontSize: t * 0.85, fontWeight: 800 }
        : { display: "flex", alignItems: "center", fontSize: t, fontWeight: 800, color: "#fff", textShadow: OMBRE }, q));
  }
  if (content.coin && images[content.coin]) pile.push(img(images[content.coin], Math.round(t * 1.45), { borderRadius: t * 0.3 }));
  if (!pile.length) return null;
  return h("div", { position: "absolute", [cote]: m.marge, top: m.haut + descente, display: "flex", flexDirection: "column", alignItems: cote === "left" ? "flex-start" : "flex-end", gap: t * 0.3 }, pile);
}

/** Bandeau en coin : une bande à la couleur d'accent, en diagonale, qui porte le statut ou le N° de tendance. */
function bandeauEnCoin(content, m, [w], accent) {
  const t = m.texte * (Number(content.styles.haut) || 1), L = Math.round(Math.min(w, 600) * 0.5), H = Math.round(t * 1.15), d = Math.round(L * 0.3);
  const droite = content.bandeau.coin !== "g";
  return h("div", {
    position: "absolute", left: droite ? w - d - L / 2 : d - L / 2, top: d - H / 2, width: L, height: H,
    display: "flex", alignItems: "center", justifyContent: "center", background: accent, color: ENCRE,
    fontSize: t * 0.58, fontWeight: 800, letterSpacing: t * 0.05, transform: `rotate(${droite ? 45 : -45}deg)`, boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
  }, content.bandeau.texte);
}
/** Place que le bandeau prend dans son coin : les badges de ce côté descendent d'autant. */
const descenteBandeau = (content, [w]) => Math.round(Math.min(w, 600) * 0.5 * 0.3 * 1.55);

/** Calque des textes et badges, en SVG transparent de la taille de l'affiche. */
async function calqueTexte(content, taille, m, accent, images) {
  const [w, hgt] = taille, st = content.styles, enfants = [];
  if (content.line) enfants.push(ligneDuBas(content, m, accent, images, taille));
  if (content.line && st.barre === "fine" && content.full) enfants.push(barreFine(content, m, taille, accent));
  const [coteStatut, coteQualite] = st.inverse ? ["right", "left"] : ["left", "right"];
  const coinBandeau = content.bandeau ? (content.bandeau.coin === "g" ? "left" : "right") : null;
  const descente = (cote) => (cote === coinBandeau ? descenteBandeau(content, taille) : 0);
  const statut = blocStatut(content, m, accent, coteStatut, descente(coteStatut));
  if (statut) enfants.push(statut);
  const qualite = blocQualite(content, m, accent, coteQualite, descente(coteQualite), images);
  if (qualite) enfants.push(qualite);
  if (content.bandeau) enfants.push(bandeauEnCoin(content, m, taille, accent));
  if (!enfants.length) return null;
  const racine = h("div", { width: w, height: hgt, display: "flex", position: "relative", fontFamily: m.police }, enfants);
  return Buffer.from(await satori(racine, { width: w, height: hgt, fonts: FONTS }));
}

// ---------- Couleurs, dégradés, flous ----------

/** Couleur moyenne du bas de l'image, en HSL (teinte 0–6, saturation). */
async function hslDuBas(base, [w, hgt]) {
  const bande = await sharp(base).extract({ left: 0, top: Math.round(hgt * 0.6), width: w, height: Math.round(hgt * 0.4) }).toBuffer();
  const [r, g, b] = (await sharp(bande).stats()).channels.map((c) => c.mean / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let hue = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    if (hue < 0) hue += 6;   // rouge dominant avec plus de bleu que de vert (affiches rouges, roses, magenta)
  }
  return { hue, s };
}
const hex = ({ hue, s }, L) => {
  const C = (1 - Math.abs(2 * L - 1)) * s, X = C * (1 - Math.abs((hue % 2) - 1)), M = L - C / 2;
  const [r1, g1, b1] = hue < 1 ? [C, X, 0] : hue < 2 ? [X, C, 0] : hue < 3 ? [0, C, X] : hue < 4 ? [0, X, C] : hue < 5 ? [X, 0, C] : [C, 0, X];
  const x = (v) => Math.round((v + M) * 255).toString(16).padStart(2, "0");
  return `#${x(r1)}${x(g1)}${x(b1)}`;
};
/** Teinte du fondu « couleurs de l'affiche » : la couleur du bas de l'image, sombre (18 %) et saturée. */
const teinteSombre = (hsl) => hex({ hue: hsl.hue, s: Math.min(1, hsl.s * 1.4) }, 0.18);
/** Accent « couleur de l'affiche » : la même teinte, vive (62 %), assez saturée pour se voir. */
const teinteVive = (hsl) => hex({ hue: hsl.hue, s: Math.max(0.55, Math.min(1, hsl.s * 1.6)) }, 0.62);

/** Dégradés : fondu du bas, voile du haut sous les badges, vignette sur les bords. */
function calqueDegrades(content, [w, hgt], teinte) {
  const st = content.styles, fondu = content.full && st.fondu;
  const voile = VOILE[st.voile ?? "m"], haut = voile > 0 && !!(content.statut || content.rank || content.quality || content.bandeau || content.coin);
  if (!fondu && !haut && !st.vignette) return null;
  const hb = Math.round(hgt * HAUTEUR_FONDU[(fondu && fondu.hauteur) || "normal"]), hh = Math.round(hgt * 0.22);
  const couleur = fondu && fondu.couleur === "affiche" && teinte ? teinte : "#000", force = fondu ? FORCE[fondu.force] : 0;
  const bords = teinte && fondu && fondu.couleur === "affiche" ? teinte : "#000";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}">
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${couleur}" stop-opacity="0"/><stop offset="1" stop-color="${couleur}" stop-opacity="${force}"/></linearGradient>
    <linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="${voile}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
    <radialGradient id="v" cx="0.5" cy="0.5" r="0.7"><stop offset="0.45" stop-color="${bords}" stop-opacity="0"/><stop offset="1" stop-color="${bords}" stop-opacity="0.6"/></radialGradient>
  </defs>
  ${st.vignette ? `<rect x="0" y="0" width="${w}" height="${hgt}" fill="url(#v)"/>` : ""}
  ${fondu ? `<rect x="0" y="${hgt - hb}" width="${w}" height="${hb}" fill="url(#b)"/>` : ""}
  ${haut ? `<rect x="0" y="0" width="${w}" height="${hh}" fill="url(#h)"/>` : ""}
</svg>`);
}

/** Une bande de l'image floutée (de top à bottom), avec un masque SVG facultatif pour l'adoucir. */
async function bandeFloue(base, [w, hgt], top, masque) {
  const haut = hgt - top;
  const floue = await sharp(await sharp(base).blur(Math.max(1, w / 40)).toBuffer()).extract({ left: 0, top, width: w, height: haut }).toBuffer();
  const input = masque ? await sharp(floue).ensureAlpha().composite([{ input: masque(w, haut), blend: "dest-in" }]).png().toBuffer() : floue;
  return { input, left: 0, top };
}

/** Le bas de l'image flouté, de plus en plus en descendant (fondu « flou », comme un verre dépoli sous le titre). */
function calqueFlou(base, taille, part) {
  const [w, hgt] = taille, top = hgt - Math.round(hgt * part);
  return bandeFloue(base, taille, top, (lw, lh) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lw}" height="${lh}"><defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.45" stop-color="#fff" stop-opacity="1"/></linearGradient></defs><rect width="${lw}" height="${lh}" fill="url(#m)"/></svg>`));
}

/** Barre d'infos en verre : une bande floutée et assombrie sous la ligne du bas, bordée d'un filet clair. */
async function calquesBarreVerre(base, content, taille, m) {
  const [w, hgt] = taille, t = m.texte * (m.ligne || 1) * (Number(content.styles.texte) || 1);
  const top = Math.max(0, Math.round(hgt - m.ligneBas - hauteurLigne(content, m) * (m.ligne || 1) - t * 0.55));
  const verre = await bandeFloue(base, taille, top);
  const voile = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt - top}"><rect width="${w}" height="${hgt - top}" fill="#000" fill-opacity="0.32"/><rect width="${w}" height="1" fill="#fff" fill-opacity="0.22"/></svg>`);
  return [verre, { input: voile, left: 0, top }];
}

// ---------- Images ----------

// Adresses des images d'une affiche : le fond (w780 suffit pour 800 px de large), le logo, la plateforme.
// Image du film recadrée en portrait (fondLarge) : un fond 16:9 dont on ne garde qu'un tiers, demandé en w1280.
const urlFond = (content) => IMG + (content.fondLarge ? "w1280" : content.shape === "landscape" ? "w780" : "w500") + content.image;
const urlLogo = (content) => (content.full && content.logo ? IMG + (/\.svg$/i.test(content.logo) ? "original" : "w500") + content.logo : null);
const cheminsPlateforme = (content) => [content.line && content.line.plateforme, content.coin].filter(Boolean);
const urlPlateforme = (chemin) => IMG + "w92" + chemin;

/** Les images que draw() téléchargera : on peut les demander en avance. */
export const imageUrls = (content) => [urlFond(content), urlLogo(content), ...cheminsPlateforme(content).map(urlPlateforme)].filter(Boolean);

/** Logos de plateforme en data: URL (satori ne télécharge rien) ; un logo introuvable est simplement omis. */
async function imagesPlateforme(content, fetchImpl) {
  const out = {};
  await Promise.all(cheminsPlateforme(content).map(async (c) => {
    try { out[c] = "data:image/png;base64," + (await sharp(await telecharger(urlPlateforme(c), fetchImpl)).resize(92, 92).png().toBuffer()).toString("base64"); }
    catch { /* pas de logo de plateforme */ }
  }));
  return out;
}

/** Le logo du titre, réduit dans sa boîte (selon la taille choisie) et centré au-dessus de la ligne. */
async function calqueLogo(content, [w, hgt], m, fetchImpl) {
  const url = urlLogo(content);
  if (!url) return null;
  const echelle = Number(content.styles.titre) || 1, large = Number(content.styles.large) || 1;
  // Agrandi à la main, le logo reste dans l'affiche : jamais plus large qu'elle (marges comprises) ni plus haut que sa moitié.
  const boiteL = Math.min(Math.round(w * m.logoL * echelle * large), w - 2 * m.marge), boiteH = Math.min(Math.round(hgt * m.logoH * echelle), Math.round(hgt * 0.5));
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
  // Hauteur du titre réglée à la main : le logo remonte d'une part de la hauteur de l'image.
  const monte = Math.round(hgt * (Number(content.styles.monte) || 0));
  if (m.disposition === "cote") {
    // Paysage : les lettres commencent à la marge de gauche, et le logo descend jusqu'au bas de la ligne.
    const left = Math.min(Math.max(Math.round(m.marge - plein.left), 0), w - info.width);
    return { input: data, left, top: Math.max(0, Math.round(hgt - m.ligneBas - info.height - monte)) };
  }
  // Au centre, ou à gauche (les lettres à la marge), au-dessus de la ligne du bas.
  const voulu = m.disposition === "gauche" ? m.marge - plein.left : w / 2 - (plein.left + plein.width / 2);
  const left = Math.min(Math.max(Math.round(voulu), 0), w - info.width);
  const bas = m.ligneBas + hauteurLigne(content, m) + m.texte * 0.65 + monte;
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

/**
 * Mesures d'une affiche selon ses réglages : place du titre (« auto » : au centre en portrait, logo à gauche et
 * ligne à droite en paysage ; ou partout à gauche, ou partout au centre) et police.
 */
function mesures(content) {
  const st = content.styles, m = { ...MESURES[content.shape] }, police = POLICES[st.police] || POLICES.inter;
  m.disposition = !st.place || st.place === "auto" ? (m.cote ? "cote" : "centre") : st.place;
  m.police = police.nom;
  m.texte *= police.echelle;
  return m;
}

/** JPEG d'une affiche (400×600 en portrait, 800×450 en paysage). Lève une erreur si l'image de base manque. */
export async function draw(content, fetchImpl = fetch) {
  content = { ...content, styles: { ...STYLES_DEFAUT, ...(content.styles || {}) } };
  const st = content.styles, taille = SIZES[content.shape], m = mesures(content);
  const [w, hgt] = taille;
  const [fond, logo, images] = await Promise.all([
    telecharger(urlFond(content), fetchImpl),
    // Pas de repli sans logo : sur l'image sans texte, il porte le titre. Une erreur ici fait répondre
    // une erreur au service, et Nuvio montre l'affiche d'origine.
    calqueLogo(content, taille, m, fetchImpl),
    imagesPlateforme(content, fetchImpl),
  ]);
  // Pas encore sorti : l'image en noir et blanc ; les badges, posés ensuite, gardent leurs couleurs.
  let image = sharp(fond).resize(w, hgt, { fit: "cover", position: "attention" });
  if (content.gris) image = image.grayscale().toColourspace("srgb");
  const base = await image.toBuffer();
  const fondu = content.full && st.fondu;
  const hsl = (fondu && fondu.couleur === "affiche") || st.accent === "affiche" ? await hslDuBas(base, taille) : null;
  const accent = st.accent === "affiche" && hsl ? teinteVive(hsl) : ACCENTS[st.accent] || OR;
  const texte = await calqueTexte(content, taille, m, accent, images);
  const calques = [];
  if (fondu && fondu.flou) calques.push(await calqueFlou(base, taille, HAUTEUR_FONDU[fondu.hauteur || "normal"]));
  const degrades = calqueDegrades(content, taille, fondu && fondu.couleur === "affiche" && hsl ? teinteSombre(hsl) : null);
  if (degrades) calques.push({ input: degrades, left: 0, top: 0 });
  if (content.line && content.full && st.barre === "verre") calques.push(...(await calquesBarreVerre(base, content, taille, m)));
  if (logo) calques.push(logo);
  if (texte) calques.push({ input: texte, left: 0, top: 0 });
  // JPEG standard plutôt que mozjpeg : 3 fois moins de calcul pour des fichiers à peine plus lourds.
  return sharp(base).composite(calques).jpeg({ quality: 82 }).toBuffer();
}
