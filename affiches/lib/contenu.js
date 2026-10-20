/**
 * Ce qu'une affiche montre, d'après les faits du titre : les règles du look maison, sans rien dessiner.
 * Le titre ne doit jamais être caché : on ne pose le bas (logo + ligne) que sur une image sans texte,
 * et seulement si on a le logo pour remettre le titre. Sinon, l'affiche normale avec les badges du haut.
 */
import { createHash } from "node:crypto";

// À changer quand le dessin change : l'ETag change avec, et Nuvio recharge les affiches.
export const DESIGN = "1";

// Genres TMDB en français, en version courte pour tenir sur la ligne (repris de worker/index.js).
export const SHORT_GENRES = {
  28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime", 99: "Documentaire",
  18: "Drame", 10751: "Famille", 14: "Fantastique", 36: "Histoire", 27: "Horreur", 10402: "Musique",
  9648: "Mystère", 10749: "Romance", 878: "SF", 10770: "Téléfilm", 53: "Thriller",
  10752: "Guerre", 37: "Western", 10759: "Action", 10762: "Enfants", 10763: "Actualité",
  10764: "Téléréalité", 10765: "SF", 10766: "Feuilleton", 10767: "Talk-show", 10768: "Guerre",
};

const virgule = (s) => s.replace(".", ",");

function note(facts, imdbRating) {
  if (imdbRating) return virgule(imdbRating);
  if (facts.vote && facts.vote.count >= 50 && facts.vote.average > 0) return virgule(facts.vote.average.toFixed(1));
  return null;
}

/** Contenu d'une affiche, ou null si le titre n'a aucune image pour cette forme. */
export function posterContent(facts, { imdbRating, rank, quality }, shape) {
  const [sansTexte, normale] = shape === "landscape" ? [facts.textlessBackdrop, facts.backdrop] : [facts.textlessPoster, facts.poster];
  const full = !!(sansTexte && facts.logo);
  const image = full ? sansTexte : normale || null;
  if (!image) return null;
  const genre = SHORT_GENRES[facts.genreIds[0]];
  return {
    shape,
    image,
    full,
    logo: full ? facts.logo : null,
    line: full ? [genre, note(facts, imdbRating), facts.year].filter(Boolean) : null,
    rank: rank >= 1 && rank <= 20 ? rank : null,
    quality: quality && quality.uhd ? { extra: quality.extra || null } : null,
  };
}

/** Empreinte du contenu (et du dessin) : sert d'ETag. */
export function contentKey(content) {
  return createHash("sha1").update(DESIGN + JSON.stringify(content)).digest("hex");
}
