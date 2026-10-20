/**
 * Ce qu'une affiche montre, d'après les faits du titre et les réglages de la régie (lib/lien-affiches.js),
 * sans rien dessiner. Le titre ne doit jamais être caché : on ne pose le bas (logo + ligne) que sur une
 * image sans texte, et seulement si on a le logo pour remettre le titre. Sinon, l'affiche normale avec
 * les éléments du haut.
 */
import { createHash } from "node:crypto";
import { DEFAUT_REGLAGES } from "./lien-affiches.js";
import { etatSortie } from "./statut.js";

// À changer quand le dessin change : l'ETag change avec, et Nuvio recharge les affiches.
export const DESIGN = "3";

// Genres TMDB en français, en version courte pour tenir sur la ligne (repris de worker/index.js).
export const SHORT_GENRES = {
  28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime", 99: "Documentaire",
  18: "Drame", 10751: "Famille", 14: "Fantastique", 36: "Histoire", 27: "Horreur", 10402: "Musique",
  9648: "Mystère", 10749: "Romance", 878: "SF", 10770: "Téléfilm", 53: "Thriller",
  10752: "Guerre", 37: "Western", 10759: "Action", 10762: "Enfants", 10763: "Actualité",
  10764: "Téléréalité", 10765: "SF", 10766: "Feuilleton", 10767: "Talk-show", 10768: "Guerre",
};
// Les mêmes, en entier (GENRE_NAMES de worker/index.js), pour le réglage « Genre complet ».
export const GENRES_COMPLETS = {
  28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime", 99: "Documentaire",
  18: "Drame", 10751: "Familial", 14: "Fantastique", 36: "Histoire", 27: "Horreur", 10402: "Musique",
  9648: "Mystère", 10749: "Romance", 878: "Science-fiction", 10770: "Téléfilm", 53: "Thriller",
  10752: "Guerre", 37: "Western", 10759: "Action & Aventure", 10762: "Enfants", 10763: "Actualité",
  10764: "Téléréalité", 10765: "SF & Fantastique", 10766: "Feuilleton", 10767: "Talk-show",
  10768: "Guerre & Politique",
};
const LIBELLES_STATUT = { bientot: "BIENTÔT", salle: "EN SALLE", nouveau: "NOUVEAU", saison: "NOUVELLE SAISON" };
const MOIS = ["JANV.", "FÉVR.", "MARS", "AVR.", "MAI", "JUIN", "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC."];
const DEBUTS = { dispo: "DISPO LE", cinema: "AU CINÉMA LE", sortie: "SORTIE LE" };

/** « DISPO LE 2 NOV. », « DISPO VERS LE 3 DÉC. », « AU CINÉMA LE 12 MARS 2027 »… (comme les rangées de l'addon). */
function libelleDate({ quoi, date, vers }, today) {
  const jour = `${Number(date.slice(8, 10))} ${MOIS[Number(date.slice(5, 7)) - 1]}`;
  const debut = vers ? DEBUTS[quoi].replace(/ LE$/, " VERS LE") : DEBUTS[quoi];
  return `${debut} ${jour}${date.slice(0, 4) === today.slice(0, 4) ? "" : " " + date.slice(0, 4)}`;
}

const virgule = (s) => s.replace(".", ",");
const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** La note et sa source (« imdb », ou « tmdb » choisie ou en repli), ou null. */
function note(facts, imdbRating, source) {
  if (imdbRating && source !== "tmdb") return { valeur: virgule(imdbRating), source: "imdb" };
  if (facts.vote && facts.vote.count >= 50 && facts.vote.average > 0) return { valeur: virgule(facts.vote.average.toFixed(1)), source: "tmdb" };
  return null;
}

/** Contenu d'une affiche, ou null si le titre n'a aucune image pour cette forme. */
export function posterContent(facts, { imdbRating, rank, quality }, shape, r = DEFAUT_REGLAGES, today = aujourdhui()) {
  const [sansTexte, normale] = shape === "landscape" ? [facts.textlessBackdrop, facts.backdrop] : [facts.textlessPoster, facts.poster];
  const full = !!(r.titre.on && sansTexte && facts.logo);
  const image = full ? sansTexte : normale || null;
  if (!image) return null;
  // Pas sorti = pas encore chez soi en VF, comme les rangées de l'addon (au cinéma compris).
  const { sorti, statut, quand } = etatSortie(facts, today);
  const pasSorti = !sorti;
  const line = {};
  if (full) {
    const genres = r.genre.forme === "complet" ? GENRES_COMPLETS : SHORT_GENRES;
    if (r.genre.on && genres[facts.genreIds[0]]) line.genre = genres[facts.genreIds[0]];
    const n = r.note.on && !(r.sortie.cacherNote && pasSorti) ? note(facts, imdbRating, r.note.source) : null;
    if (n) line.note = n.valeur;
    // La source n'est écrite que pour le badge (« IMDb 8,4 ») : les autres affiches gardent leur ETag.
    if (n && r.note.style === "badge") line.source = n.source;
    if (r.annee.on && facts.year) line.annee = facts.year;
    if (r.age.on && facts.age) line.age = facts.age;
  }
  return {
    shape,
    image,
    full,
    gris: r.sortie.nb && pasSorti,
    logo: full ? facts.logo : null,
    line: Object.keys(line).length ? line : null,
    // Pas encore sorti : la date quand on la connaît, plutôt que « Bientôt » ou « En salle ».
    statut: r.statut.on && statut ? (quand ? libelleDate(quand, today) : LIBELLES_STATUT[statut]) : null,
    rank: r.tendance.on && rank >= 1 && rank <= 20 ? rank : null,
    quality: r.qualite.on && quality && quality.uhd ? { extra: r.qualite.montrer === "4k" ? null : quality.extra || null } : null,
    styles: {
      statut: r.statut.style, tendance: r.tendance.style, qualite: r.qualite.style, titre: r.titre.taille,
      note: r.note.style, texte: r.texte.taille, sep: r.texte.sep, haut: r.texte.haut,
      fondu: full && r.fondu.on ? { couleur: r.fondu.couleur, force: r.fondu.force, ...(r.fondu.flou ? { flou: true } : {}) } : null,
      // Réglages ajoutés ensuite : écrits seulement hors défaut, pour ne pas changer l'ETag des affiches déjà vues.
      ...(r.titre.place !== "auto" ? { place: r.titre.place } : {}),
      ...(r.texte.police !== "inter" ? { police: r.texte.police } : {}),
    },
  };
}

/** Empreinte du contenu (et du dessin) : sert d'ETag. */
export function contentKey(content) {
  return createHash("sha1").update(DESIGN + JSON.stringify(content)).digest("hex");
}
