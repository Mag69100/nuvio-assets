/**
 * Outils communs aux pages du site (le guide, la salle 2), servis une fois pour toutes (statique.js,
 * /statique/outils.js) : les QR codes. La bibliothèque (qrcode-generator, tiers/qrcode.js) vient du site
 * lui-même, chargée au premier QR code seulement ; son empreinte est vérifiée par le navigateur (integrity).
 */
import { QRCODE_SRI } from "./tiers/qrcode.js";

/** Le script, avec l'adresse versionnée de la bibliothèque (statique.js). */
export const outilsJs = (adresseQr) => `// ---------- QR codes ----------
let qrLib = null;
/** La bibliothèque des QR codes (window.qrcode), chargée une fois ; en échec, on pourra réessayer. */
function chargerQr() {
  if (!qrLib) qrLib = new Promise((ok, ko) => {
    const sc = document.createElement("script");
    sc.src = ${JSON.stringify(adresseQr)};
    // Empreinte du fichier : si le site servait autre chose, le navigateur refuserait de l'exécuter.
    sc.integrity = ${JSON.stringify(QRCODE_SRI)};
    sc.onload = () => ok(window.qrcode); sc.onerror = () => { qrLib = null; ko(); };
    document.head.append(sc);
  });
  return qrLib;
}
/** Le QR code d'un texte en SVG (niveau de correction L au-delà de 300 caractères, pour rester lisible) ;
 *  fond : un carré blanc derrière (sur une page sombre). */
function qrSvg(qrcode, texte, nom, fond) {
  const q = qrcode(0, texte.length > 300 ? "L" : "M"); q.addData(texte); q.make();
  const n = q.getModuleCount(), w = n + 4; let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + c + " " + r + "h1v1h-1z";
  const etiquette = String(nom || "QR code").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return '<svg viewBox="-2 -2 ' + w + " " + w + '" role="img" aria-label="' + etiquette + '" shape-rendering="crispEdges">'
    + (fond ? '<rect x="-2" y="-2" width="' + w + '" height="' + w + '" fill="#fff"/>' : "") + '<path d="' + d + '" fill="#2a1a14"/></svg>';
}
`;
