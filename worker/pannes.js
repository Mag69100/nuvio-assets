/**
 * Les pannes connues, étape 12 du guide (« En cas de souci ») : écrites une seule fois ici, affichées par le guide
 * (guide.js) et données à Gemini par le diagnostic par photo (diagnostic.js), qui choisit la bonne d'après l'écran.
 *   id        → ancre de la panne dans le guide (#panne-<id>), réponse attendue du diagnostic
 *   moments   → voyants du pupitre qui l'allument (accueil, fiche, recherche, lecture, profils)
 *   titre     → le résumé cliquable (HTML)
 *   texte     → la réponse (HTML, un ou plusieurs paragraphes)
 */
export const PANNES = [
  { id: "metadonnees", moments: "fiche", titre: "« Aucun addon installé ne fournit de métadonnées pour… » en ouvrant un film",
    texte: "<p>Les fiches viennent du Catalogue FR : retire-le et rajoute-le (étape 6) pour que Nuvio voie qu'il fournit maintenant les fiches. Si tu avais un autre addon de fiches (TMDB Discover Plus, Cinemeta), tu peux le garder ou le supprimer.</p>" },
  { id: "recherche-absente", moments: "recherche", titre: "« Aucun catalogue de recherche trouvé dans les addons installés »",
    texte: "<p>La recherche vient du Catalogue FR (addon n° 1 de l'étape 6) : vérifie qu'il est bien installé. Si tu viens de le mettre à jour, retire-le et rajoute-le pour que Nuvio voie ses catalogues de recherche.</p>" },
  { id: "aucune-source", moments: "lecture", titre: "Aucune source quand je clique sur Regarder",
    texte: "<p>Vérifie que ton abonnement AllDebrid premium est actif (étape 5) : l'essai gratuit de 7 jours ne suffit pas. Vérifie aussi que ta clé API est bien renseignée dans Lumio, StreamFusion, Torrentio et WAStream. S'il n'y a rien seulement sur certains films, tes exclusions sont peut-être trop strictes : relis l'encadré « Ce que ton appareil sait lire » de l'étape 6.</p>" },
  { id: "saccades", moments: "lecture", titre: "L'image saccade pendant les mouvements de caméra",
    texte: "<p>Si les travellings avancent par à-coups, sans rond de chargement, c'est du <b>judder</b> : le film est en 24 images/s (23,976) et la TV l'affiche en 60 Hz, alors les images sont répétées de façon inégale. Sur Fire TV : <span class=\"path\">Paramètres → Affichage et sons → Affichage → Faire correspondre la fréquence d'images d'origine</span> → activé. Dans Nuvio, active aussi <b>Frame Rate Matching</b> (étape 9).</p><p>Si l'image se fige avec un rond de chargement, c'est autre chose : le fichier est trop lourd pour ta connexion (voir l'encadré de l'étape 6).</p>" },
  { id: "movie", moments: "accueil fiche", titre: "C'est écrit « Movie » au lieu de « Film »",
    texte: "<p>La langue de l'appli est en anglais : <span class=\"path\">Paramètres → Langue de l'application → Français</span> (étape 3).</p>" },
  { id: "bandes-annonces", moments: "accueil fiche", titre: "Les bandes-annonces sont en anglais",
    texte: "<p>Dans <span class=\"path\">Paramètres → Intégrations → TMDB</span>, <b>désactive Bandes-annonces</b> (étape 3), puis force l'arrêt de Nuvio et relance-le. Activé, ce réglage fait passer les bandes-annonces de TMDB, souvent en anglais, avant celles du Catalogue FR, qui va chercher la VF sur TMDB, Allociné et YouTube.</p><p>Si un titre reste en version originale, c'est qu'aucune VF n'a été trouvée (fréquent pour les animés et les séries étrangères). Une VF trouvée en ouvrant la fiche arrive sur l'accueil dans les 3 heures.</p>" },
  { id: "rangee-absente", moments: "accueil", titre: "Une rangée ou une modification n'apparaît pas",
    texte: "<p>Nuvio garde la liste des rangées d'un addon pendant 6 h. Pas besoin de réinstaller : dans <span class=\"path\">Addons</span>, appuie sur <b>Actualiser les addons</b>, qui récupère tout de suite leurs dernières modifications.</p><p>Si tu as changé tes réglages en salle 2 avec un lien habituel, ton lien d'addon a changé : là, il faut bien remplacer l'ancien Catalogue FR par le nouveau lien de ton billet. Avec un lien fixe, rien à remplacer : « Actualiser les addons » suffit.</p><p>Les collections (les grandes tuiles du haut) ne bougent pas avec « Actualiser les addons » : Nuvio les a importées. Pour voir un changement de tuiles, supprime-les dans l'onglet Collections, puis réimporte-les (étape 7 : « Copier le contenu (PC/TEL) », puis le bouton presse-papiers en haut à droite de l'onglet Collections).</p>" },
  { id: "tmdb-search", moments: "recherche", titre: "La recherche affiche « TMDB Search » ou des résultats en double",
    texte: "<p>Ton installation date d’avant le passage de la recherche dans le Catalogue FR. <b>1.</b> Retire le Catalogue FR et remets-le (lien de l’étape 6) pour que Nuvio voie sa recherche et ses fiches. <b>2.</b> Dans Addons, supprime <b>TMDB Discover Plus</b> : il ne sert plus, le Catalogue FR fait maintenant la recherche et les fiches. <b>3.</b> Vérifie que « Afficher le type de catalogue » est désactivé (étape 9).</p>" },
  { id: "date-dispo", moments: "accueil fiche", titre: "Un film à venir n’affiche pas sa date de dispo",
    texte: "<p>Pour un film pas encore regardable, l’addon envoie la date où il arrive chez toi (sortie numérique, ou une estimation) : c’est elle que le grand carrousel affiche, pas la sortie au cinéma. Le rappel « 📅 Dispo le 17 nov. » en tête du résumé n’apparaît que si <span class=\"path\">Paramètres → Intégrations → TMDB → Informations de base</span> est désactivé (étape 3) : sinon, Nuvio remplace le résumé par celui de TMDB. Nuvio garde l’ancienne version environ 5 minutes : si rien ne change, ferme et relance l’appli.</p>" },
  { id: "profil-addons", moments: "profils", titre: "Un autre profil n'a pas les addons",
    texte: "<p>Chaque profil Nuvio a sa propre liste d'addons. Ouvre <span class=\"path\">Paramètres → Profils → Gérer les profils</span>, choisis le profil, puis <b>Modifier</b>, et active <b>Utiliser les addons principaux</b> : il reprend alors exactement les addons du profil principal, et suivra chacune de tes modifications.</p>" },
  { id: "collection-en-bas", moments: "accueil", titre: "Une collection est tout en bas de l'accueil",
    texte: "<p>C'est normal : seule Plateformes est épinglée tout en haut. Genres, J'ai envie de…, Sagas et Studios viennent après les rangées du Catalogue FR. Pour en remonter une : <span class=\"path\">Paramètres → Réorganiser les catalogues de l'accueil</span> (étape 10).</p>" },
];

/** Les pannes telles que le guide les affiche (data-moment : voyants du pupitre ; id : ancre du diagnostic). */
export const pannesHTML = () => PANNES.map((p) => `<details data-moment="${p.moments}" id="panne-${p.id}"><summary>${p.titre}</summary>${p.texte}</details>`).join("\n    ");

const texteSeul = (html) => html.replace(/<\/p><p>/g, " ").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

/** Une ligne par panne, pour Gemini : « id — titre : début de la réponse ». Suit le guide tout seul. */
export function resumePannes() {
  return PANNES.map((p) => {
    const debut = texteSeul(p.texte).split(/(?<=[.!?])\s/)[0];
    return `${p.id} — ${texteSeul(p.titre)} : ${debut.length > 220 ? debut.slice(0, 219) + "…" : debut}`;
  }).join("\n");
}
