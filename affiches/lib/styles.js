/**
 * Les styles servis en fichiers tout faits (affiches statiques, voir lib/statiques.js) : les styles tout prêts de la
 * régie (lib/lien-affiches.js, MEMOIRES), un dossier chacun dans l'adresse : /<style>/{type}/{shape}/{id}.jpg. Les
 * fichiers statiques ignorent la partie « ?… » des adresses : le style ne peut pas passer en paramètre, et seuls ces
 * styles sont dessinés (une affiche par style, par forme et par titre demandé ; 20 000 fichiers au plus sur l'offre
 * gratuite de Cloudflare). s et sp : les codes du lien de la régie, sans « 1. » ; sp seulement quand le paysage a ses
 * propres réglages (MEMOIRES_PAYSAGE). Pas de style « nue » : rien à dessiner, le service renvoie à l'affiche d'origine ;
 * c'est ce que montre Nuvio sans adresse d'affiches.
 */
import { MEMOIRES, MEMOIRES_PAYSAGE, ecrireReglages } from "./lien-affiches.js";

const memoire = (nom) => ({ s: ecrireReglages(MEMOIRES[nom]), sp: MEMOIRES_PAYSAGE[nom] ? ecrireReglages(MEMOIRES_PAYSAGE[nom]) : null });

export const STYLES = Object.freeze({
  maison: memoire("maison"),
  essentiel: memoire("essentiel"),
  note: memoire("noteSeule"),
  cine: memoire("cine"),
  postersplus: memoire("postersPlus"),
  plateforme: memoire("plateforme"),
  signature: memoire("signature"),
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
