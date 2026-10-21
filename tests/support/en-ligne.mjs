// Les pages du site citent leurs styles et leurs scripts propres (/statique/…, voir worker/statique.js) au lieu
// de les contenir : pour les tests qui lisent le code d'une page, on les remet dedans, comme avant.
import { contenuStatique } from "../../worker/statique.js";

const PROPRES = /^(salle2|guide|outils)/;
export function enLigne(html, propres = PROPRES) {
  return html
    .replace(/<link rel="stylesheet" href="\/statique\/([^"?]+)\?v=[^"]*">/g, (m, nom) => (propres.test(nom) ? `<style>${contenuStatique(nom)}</style>` : m))
    .replace(/<script src="\/statique\/([^"?]+)\?v=[^"]*"><\/script>/g, (m, nom) => (propres.test(nom) ? `<script>${contenuStatique(nom)}</script>` : m));
}
