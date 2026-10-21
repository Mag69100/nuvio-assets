/**
 * Le dessin de l'habillage de saison (lib/saison.js) : un calque SVG transparent posé sur l'image, sous le logo et
 * les textes. Tout est dessiné ici (formes simples), aucune image d'ailleurs :
 * - un cadre fin aux couleurs de la fête, dans la marge de l'affiche (les textes commencent plus loin) ;
 * - quelques petits motifs sur les bords gauche et droit, à mi-hauteur (là où il n'y a ni badge ni titre) ;
 * - un emblème (citrouille, étoile et houx, cœurs, œufs, soleil) dans un coin du haut resté libre ; s'il n'y en a
 *   aucun (statut à gauche, qualité à droite), pas d'emblème plutôt qu'un emblème sous un badge.
 * Mêmes proportions en portrait et en paysage (u : un pixel d'une affiche de 400 px de côté court).
 */

// Couleurs : le cadre (c1), son filet intérieur (c2).
const FETES = {
  halloween: { c1: "#ff8a00", c2: "#a970ff" },
  noel: { c1: "#e5484d", c2: "#f5c518" },
  "saint-valentin": { c1: "#ff5c8a", c2: "#ffb3c1" },
  paques: { c1: "#7fd4a0", c2: "#fff3b0" },
  ete: { c1: "#26c6da", c2: "#ffc93c" },
};

const n = (x) => Math.round(x * 100) / 100;
const CHAUVE_SOURIS = "M12 4C11 2 10 1.5 9 2.5 8 1 5.5.5 3 2c1 1 1 3-1 4 2.5 0 4 1 5 3.5 1-1.5 3-1.5 5 .5 2-2 4-2 5-.5 1-2.5 2.5-3.5 5-3.5-2-1-2-3-1-4-2.5-1.5-5-1-6 .5C14 1.5 13 2 12 4z";
const COEUR = "M12 21s-7.5-4.6-9.6-9.2C.9 7.9 3.4 4 7.2 4c2.1 0 3.6 1.1 4.8 2.7C13.2 5.1 14.7 4 16.8 4c3.8 0 6.3 3.9 4.8 7.8C19.5 16.4 12 21 12 21z";
const ETOILE = "M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.5l7.1-.6z";
const ETINCELLE = "M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z";

/** Un flocon (trois traits et leurs petites branches), centré en (cx, cy), de rayon r. */
function flocon(cx, cy, r, couleur) {
  const rad = (deg) => (deg * Math.PI) / 180;
  let d = "";
  for (let a = 0; a < 360; a += 60) {
    d += `M${n(cx)} ${n(cy)}L${n(cx + Math.cos(rad(a)) * r)} ${n(cy + Math.sin(rad(a)) * r)}`;
    const [bx, by] = [cx + Math.cos(rad(a)) * r * 0.55, cy + Math.sin(rad(a)) * r * 0.55];
    for (const t of [40, -40]) d += `M${n(bx)} ${n(by)}L${n(bx + Math.cos(rad(a + t)) * r * 0.38)} ${n(by + Math.sin(rad(a + t)) * r * 0.38)}`;
  }
  return `<path d="${d}" stroke="${couleur}" stroke-width="${n(r * 0.16)}" stroke-linecap="round" fill="none"/>`;
}

/** Une fleur (cinq pétales et un cœur), centrée en (cx, cy), de rayon r. */
function fleur(cx, cy, r, petales = "#ffffff", coeur = "#ffc93c") {
  let s = "";
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 * Math.PI) / 180;
    s += `<circle cx="${n(cx + Math.cos(a) * r * 0.55)}" cy="${n(cy + Math.sin(a) * r * 0.55)}" r="${n(r * 0.45)}" fill="${petales}"/>`;
  }
  return s + `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.35)}" fill="${coeur}"/>`;
}

/** Une forme de 24 × 24 posée en (x, y), de côté t. */
const forme = (d, x, y, t, attrs) => `<path transform="translate(${n(x)} ${n(y)}) scale(${n(t / 24)})" d="${d}" ${attrs}/>`;

// Emblèmes, dessinés dans un carré de 48 × 48.
const EMBLEMES = {
  halloween: () => `
    <path d="M24 13C24 9 26 6 30 5" stroke="#4a7a2a" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="14.5" cy="30" rx="10" ry="13" fill="#c9561a"/>
    <ellipse cx="33.5" cy="30" rx="10" ry="13" fill="#c9561a"/>
    <ellipse cx="24" cy="30" rx="11.5" ry="14.5" fill="#ff8a00"/>
    <path d="M16.5 26l3.5-5 3.5 5zM24.5 26l3.5-5 3.5 5z" fill="#ffe08a"/>
    <path d="M13.5 32.5Q24 42 34.5 32.5Q33 37.5 30 38l-1.5-2-2 2.5-2.5-2-2.5 2-2-2.5-1.5 2Q15 37.5 13.5 32.5z" fill="#ffe08a"/>
    ${forme(CHAUVE_SOURIS, 0, 2, 17, 'fill="#1b1022" stroke="#a970ff" stroke-width="0.9"')}`,
  noel: () => `
    <ellipse cx="17" cy="34" rx="10" ry="4.6" transform="rotate(-28 17 34)" fill="#2e8b3d"/>
    <ellipse cx="31" cy="34" rx="10" ry="4.6" transform="rotate(28 31 34)" fill="#1f6e30"/>
    <path d="M10 37.5L24 30M38 37.5L24 30" stroke="#8fd19e" stroke-width="0.9" fill="none"/>
    <circle cx="21" cy="30.5" r="3.4" fill="#e5484d"/><circle cx="27" cy="30.5" r="3.4" fill="#c21f3a"/><circle cx="24" cy="26" r="3.4" fill="#e5484d"/>
    ${forme(ETOILE, 12, 1, 24, 'fill="#f5c518" stroke="#fff3b0" stroke-width="0.8"')}`,
  "saint-valentin": () => `
    ${forme(COEUR, 3, 9, 32, 'fill="#e5484d"')}
    ${forme(COEUR, 22, 2, 22, 'fill="#ff5c8a" stroke="#ffd6e0" stroke-width="1"')}
    ${forme(COEUR, 26, 28, 12, 'fill="#ffb3c1"')}`,
  paques: () => {
    const oeuf = (cx, cy, fond, bande, i) => `
      <clipPath id="oe${i}"><ellipse cx="${cx}" cy="${cy}" rx="7.5" ry="10"/></clipPath>
      <ellipse cx="${cx}" cy="${cy}" rx="7.5" ry="10" fill="${fond}"/>
      <g clip-path="url(#oe${i})"><path d="M${cx - 9} ${cy}l3-3 3 3 3-3 3 3 3-3 3 3" stroke="${bande}" stroke-width="2.4" fill="none"/>
      <rect x="${cx - 9}" y="${cy + 4}" width="18" height="2" fill="${bande}"/></g>`;
    return oeuf(13, 30, "#a8e6ff", "#ffffff", 1) + oeuf(35, 30, "#ffb3c1", "#fff3b0", 2) + oeuf(24, 25, "#fff3b0", "#ff8fb1", 3) + fleur(24, 41, 6);
  },
  ete: () => {
    let rayons = "";
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      rayons += `M${n(24 + Math.cos(a) * 13.5)} ${n(20 + Math.sin(a) * 13.5)}L${n(24 + Math.cos(a) * 18.5)} ${n(20 + Math.sin(a) * 18.5)}`;
    }
    return `<path d="${rayons}" stroke="#ffc93c" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="24" cy="20" r="10.5" fill="#ffc93c"/><circle cx="21" cy="17" r="4" fill="#fff3b0" fill-opacity="0.7"/>
      <path d="M4 42q5-5 10 0t10 0 10 0 10 0" stroke="#26c6da" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  },
};

// Petits motifs des bords (centrés sur le cadre), à 35 %, 50 % et 65 % de la hauteur.
const SEMIS = {
  halloween: (x, y, t) => forme(CHAUVE_SOURIS, x - t / 2, y - t / 4, t, 'fill="#ff8a00" stroke="#1b1022" stroke-width="0.8"'),
  noel: (x, y, t) => flocon(x, y, t / 2, "#ffffff"),
  "saint-valentin": (x, y, t) => forme(COEUR, x - t / 2, y - t / 2, t, 'fill="#ff5c8a"'),
  paques: (x, y, t) => fleur(x, y, t / 2),
  ete: (x, y, t) => forme(ETINCELLE, x - t / 2, y - t / 2, t, 'fill="#ffc93c"'),
};

/** Neige posée sur le haut du cadre (Noël) : une bande blanche aux bords arrondis, dans la marge. */
function neige(w, u) {
  let d = `M0 0H${w}V${n(5 * u)}`;
  for (let x = w, i = 0; x > 0; x -= 22 * u, i++) d += `Q${n(x - 11 * u)} ${n((i % 2 ? 11 : 14) * u)} ${n(Math.max(0, x - 22 * u))} ${n(5 * u)}`;
  return `<path d="${d}Z" fill="#ffffff" fill-opacity="0.95" filter="url(#ombre)"/>`;
}

/**
 * SVG de l'habillage de la fête, de la taille de l'affiche. libres : coins du haut sans badge, par ordre de
 * préférence (« hd », « hg ») : l'emblème se pose dans le premier.
 */
export function calqueSaison(fete, [w, h], libres = []) {
  const f = FETES[fete];
  if (!f) return null;
  const u = Math.min(w, h) / 400, m = 6 * u, E = 62 * u, t = 17 * u;
  const coin = libres[0];
  const emb = coin ? `<g transform="translate(${n(coin === "hd" ? w - 12 * u - E : 12 * u)} ${n(12 * u)}) scale(${n(E / 48)})" filter="url(#ombre)">${EMBLEMES[fete]()}</g>` : "";
  const semis = [0.35, 0.5, 0.65].flatMap((p, i) => [SEMIS[fete](m + 1.5 * u, h * p + (i - 1) * 4 * u, t), SEMIS[fete](w - m - 1.5 * u, h * p - (i - 1) * 4 * u, t)]).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><filter id="ombre" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="${n(1.6 * u)}"/><feOffset dy="${n(1.2 * u)}" result="b"/>
    <feComponentTransfer in="b" result="c"><feFuncA type="linear" slope="0.65"/></feComponentTransfer><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <rect x="${n(m)}" y="${n(m)}" width="${n(w - 2 * m)}" height="${n(h - 2 * m)}" rx="${n(10 * u)}" fill="none" stroke="${f.c1}" stroke-opacity="0.3" stroke-width="${n(6 * u)}"/>
  <rect x="${n(m)}" y="${n(m)}" width="${n(w - 2 * m)}" height="${n(h - 2 * m)}" rx="${n(10 * u)}" fill="none" stroke="${f.c1}" stroke-width="${n(2.2 * u)}"/>
  <rect x="${n(m + 4.5 * u)}" y="${n(m + 4.5 * u)}" width="${n(w - 2 * m - 9 * u)}" height="${n(h - 2 * m - 9 * u)}" rx="${n(7 * u)}" fill="none" stroke="${f.c2}" stroke-opacity="0.65" stroke-width="${n(1 * u)}"/>
  ${fete === "noel" ? neige(w, u) : ""}
  <g filter="url(#ombre)">${semis}</g>
  ${emb}
</svg>`);
}
