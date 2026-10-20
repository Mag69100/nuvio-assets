/**
 * Ce qu'une affiche montre, d'après les faits du titre : les règles du look maison, sans rien dessiner.
 * Le titre ne doit jamais être caché : on ne pose le bas (logo + ligne) que sur une image sans texte,
 * et seulement si on a le logo pour remettre le titre. Sinon, l'affiche normale avec les badges du haut.
 */
import { createHash } from "node:crypto";

// À changer quand le dessin change : l'ETag change avec, et Nuvio recharge les affiches.
export const DESIGN = "2";

// Genres TMDB en français, en version courte pour tenir sur la ligne (repris de worker/index.js).
export const SHORT_GENRES = {
  28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime", 99: "Documentaire",
  18: "Drame", 10751: "Famille", 14: "Fantastique", 36: "Histoire", 27: "Horreur", 10402: "Musique",
  9648: "Mystère", 10749: "Romance", 878: "SF", 10770: "Téléfilm", 53: "Thriller",
  10752: "Guerre", 37: "Western", 10759: "Action", 10762: "Enfants", 10763: "Actualité",
  10764: "Téléréalité", 10765: "SF", 10766: "Feuilleton", 10767: "Talk-show", 10768: "Guerre",
};

const virgule = (s) => s.replace(".", ",");

/**
 * Options de l'éditeur d'affiches (salle 2), lues dans le lien : `o` = lettres des éléments coupés
 * (t rang des tendances, q qualité, n note, g genre, a année, l titre maison), `r=tmdb` = note TMDB.
 */
export const DEFAUT = Object.freeze({ t: true, q: true, n: true, g: true, a: true, l: true, r: "imdb" });
export function optionsDe(params) {
  const coupe = params.get("o") || "";
  const opts = { ...DEFAUT, r: params.get("r") === "tmdb" ? "tmdb" : "imdb" };
  for (const k of ["t", "q", "n", "g", "a", "l"]) if (coupe.includes(k)) opts[k] = false;
  return opts;
}

function note(facts, imdbRating, source) {
  if (imdbRating && source !== "tmdb") return virgule(imdbRating);
  if (facts.vote && facts.vote.count >= 50 && facts.vote.average > 0) return virgule(facts.vote.average.toFixed(1));
  return null;
}

/** Contenu d'une affiche, ou null si le titre n'a aucune image pour cette forme. */
export function posterContent(facts, { imdbRating, rank, quality }, shape, opts = DEFAUT) {
  const [sansTexte, normale] = shape === "landscape" ? [facts.textlessBackdrop, facts.backdrop] : [facts.textlessPoster, facts.poster];
  const full = !!(opts.l && sansTexte && facts.logo);
  const image = full ? sansTexte : normale || null;
  if (!image) return null;
  const line = full ? [
    opts.g && SHORT_GENRES[facts.genreIds[0]],
    opts.n && note(facts, imdbRating, opts.r),
    opts.a && facts.year,
  ].filter(Boolean) : [];
  return {
    shape,
    image,
    full,
    logo: full ? facts.logo : null,
    line: line.length ? line : null,
    rank: opts.t && rank >= 1 && rank <= 20 ? rank : null,
    quality: opts.q && quality && quality.uhd ? { extra: quality.extra || null } : null,
  };
}

/** Empreinte du contenu (et du dessin) : sert d'ETag. */
export function contentKey(content) {
  return createHash("sha1").update(DESIGN + JSON.stringify(content)).digest("hex");
}
