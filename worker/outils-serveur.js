/**
 * Petits outils communs à l'addon (index.js, fixe.js, hote.js) et aux pages du site (hall, guide, salle 2, réglages).
 */

const TEXTE = new TextEncoder();

/** Octets → texte hexadécimal. */
export const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Empreinte SHA-256 d'un texte, en hexadécimal (64 caractères). */
export const sha256 = async (s) => hex(await crypto.subtle.digest("SHA-256", TEXTE.encode(s)));

/** Texte → HTML (contenu ou valeur d'attribut entre guillemets doubles). */
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
