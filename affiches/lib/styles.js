/**
 * Les styles servis en fichiers tout faits (affiches statiques, voir scripts/affiches-statiques.mjs). Chaque style
 * est un dossier de l'adresse : /<style>/{type}/{shape}/{id}.jpg. Les fichiers statiques ignorent la partie « ?… »
 * des adresses : le style ne peut pas passer en paramètre, et seuls ces styles sont dessinés (une affiche par style,
 * par forme et par titre demandé ; 20 000 fichiers au plus sur l'offre gratuite de Cloudflare).
 * s et sp : les mêmes codes que le lien d'affiches de la régie (lib/lien-affiches.js), sans « 1. » ; sp seulement
 * quand le paysage a ses propres réglages. Pas de style « nue » : rien à dessiner, le service renvoie à l'affiche
 * d'origine ; c'est ce que montre Nuvio sans adresse d'affiches.
 */
import { MEMOIRES, ecrireReglages } from "./lien-affiches.js";

const memoire = (nom) => ({ s: ecrireReglages(MEMOIRES[nom]), sp: null });

export const STYLES = Object.freeze({
  maison: memoire("maison"),
  essentiel: memoire("essentiel"),
  note: memoire("noteSeule"),
  cine: memoire("cine"),
  postersplus: memoire("postersPlus"),
  plateforme: memoire("plateforme"),
  // Statuts complets (nouvel épisode, fin, avance), note colorée, durée, Incontournable et saga, fondu court et flou
  // aux couleurs de l'affiche ; en paysage, texte plus grand et sans fondu.
  signature: {
    s: "coD1faild1Wc0a10b02do3b13c13e11he1ia3f23h13i13j1",
    sp: "coD1xqfaild1Wc0a10b02do3b13c13e11ia3f23h13i13j1",
  },
});

/** Les paramètres du service d'affiches pour un style (s et sp du lien de la régie). */
export function parametresDuStyle(nom) {
  const st = STYLES[nom];
  if (!st) return null;
  const p = new URLSearchParams();
  if (st.s) p.set("s", "1." + st.s);
  if (st.sp !== null && st.sp !== st.s) p.set("sp", "1." + st.sp);
  return p;
}
