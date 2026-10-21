/**
 * Les polices du site, servies par le site lui-même (statique.js) au lieu de Google Fonts : la page ne fait plus
 * envoyer l'adresse IP du visiteur à Google. Les fichiers de Google Fonts tels quels (sous-ensembles latin et
 * latin-ext, licence SIL OFL : polices/OFL.txt), avec les mêmes unicode-range : le navigateur ne charge que ceux
 * dont la page a besoin. Une police « variable » (Figtree, Inter, Orbitron) couvre toutes ses graisses d'un fichier.
 * Pour en ajouter : le CSS de fonts.googleapis.com/css2?family=… (demandé avec un navigateur récent, pour les
 * .woff2), ses fichiers dans worker/polices/, une ligne ici.
 */

import bebasNeueLatinExt from "./polices/bebas-neue-latin-ext.woff2";
import bebasNeueLatin from "./polices/bebas-neue-latin.woff2";
import courierPrime400LatinExt from "./polices/courier-prime-400-latin-ext.woff2";
import courierPrime400Latin from "./polices/courier-prime-400-latin.woff2";
import courierPrime700LatinExt from "./polices/courier-prime-700-latin-ext.woff2";
import courierPrime700Latin from "./polices/courier-prime-700-latin.woff2";
import figtreeLatinExt from "./polices/figtree-latin-ext.woff2";
import figtreeLatin from "./polices/figtree-latin.woff2";
import instrumentSerifItaliqueLatinExt from "./polices/instrument-serif-italique-latin-ext.woff2";
import instrumentSerifItaliqueLatin from "./polices/instrument-serif-italique-latin.woff2";
import instrumentSerifLatinExt from "./polices/instrument-serif-latin-ext.woff2";
import instrumentSerifLatin from "./polices/instrument-serif-latin.woff2";
import interLatinExt from "./polices/inter-latin-ext.woff2";
import interLatin from "./polices/inter-latin.woff2";
import limelightLatinExt from "./polices/limelight-latin-ext.woff2";
import limelightLatin from "./polices/limelight-latin.woff2";
import orbitronLatin from "./polices/orbitron-latin.woff2";
import pacificoLatinExt from "./polices/pacifico-latin-ext.woff2";
import pacificoLatin from "./polices/pacifico-latin.woff2";

// [fichier, contenu, famille, style, graisse(s), unicode-range]
export const POLICES = [
  ["bebas-neue-latin-ext.woff2", bebasNeueLatinExt, "Bebas Neue", "normal", "400", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"],
  ["bebas-neue-latin.woff2", bebasNeueLatin, "Bebas Neue", "normal", "400", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"],
  ["courier-prime-400-latin-ext.woff2", courierPrime400LatinExt, "Courier Prime", "normal", "400", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"],
  ["courier-prime-400-latin.woff2", courierPrime400Latin, "Courier Prime", "normal", "400", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"],
  ["courier-prime-700-latin-ext.woff2", courierPrime700LatinExt, "Courier Prime", "normal", "700", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"],
  ["courier-prime-700-latin.woff2", courierPrime700Latin, "Courier Prime", "normal", "700", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"],
  ["figtree-latin-ext.woff2", figtreeLatinExt, "Figtree", "normal", "400 800", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"],
  ["figtree-latin.woff2", figtreeLatin, "Figtree", "normal", "400 800", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"],
  ["instrument-serif-italique-latin-ext.woff2", instrumentSerifItaliqueLatinExt, "Instrument Serif", "italic", "400", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"],
  ["instrument-serif-italique-latin.woff2", instrumentSerifItaliqueLatin, "Instrument Serif", "italic", "400", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"],
  ["instrument-serif-latin-ext.woff2", instrumentSerifLatinExt, "Instrument Serif", "normal", "400", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"],
  ["instrument-serif-latin.woff2", instrumentSerifLatin, "Instrument Serif", "normal", "400", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"],
  ["inter-latin-ext.woff2", interLatinExt, "Inter", "normal", "400 800", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"],
  ["inter-latin.woff2", interLatin, "Inter", "normal", "400 800", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"],
  ["limelight-latin-ext.woff2", limelightLatinExt, "Limelight", "normal", "400", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"],
  ["limelight-latin.woff2", limelightLatin, "Limelight", "normal", "400", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"],
  ["orbitron-latin.woff2", orbitronLatin, "Orbitron", "normal", "500 700", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"],
  ["pacifico-latin-ext.woff2", pacificoLatinExt, "Pacifico", "normal", "400", "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"],
  ["pacifico-latin.woff2", pacificoLatin, "Pacifico", "normal", "400", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"],
];

/** La feuille @font-face ; adresse(nom) donne l'adresse versionnée de chaque fichier. */
export const policesCss = (adresse) => POLICES.map(([f, , famille, style, graisse, plage]) =>
  `@font-face { font-family: "${famille}"; font-style: ${style}; font-weight: ${graisse}; font-display: swap; src: url(${adresse("polices/" + f)}) format("woff2"); unicode-range: ${plage}; }`).join("\n");
