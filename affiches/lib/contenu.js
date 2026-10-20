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

// Notes des autres sites : écriture, et valeur ramenée sur 10 (pour la couleur selon la note).
const AUTRES_NOTES = {
  rt: (v) => ({ v: `${Math.round(v)} %`, n: Math.round(v) / 10 }),
  mc: (v) => ({ v: String(Math.round(v)), n: Math.round(v) / 10 }),
  lb: (v) => ({ v: virgule(v.toFixed(1)), n: Math.round(v * 20) / 10 }),
};

/** « 2 h 46 », « 45 min » (film) ; « 3 saisons », « 1 saison » (série) ; null si inconnu. */
function dureeDe(facts) {
  if (facts.type === "series") return facts.seasonsCount ? `${facts.seasonsCount} saison${facts.seasonsCount > 1 ? "s" : ""}` : null;
  const m = facts.runtime;
  if (!m) return null;
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

/**
 * Le logo du titre dans la langue choisie, avec repli : français puis anglais (par défaut, comme avant),
 * anglais puis français, ou langue d'origine puis français puis anglais. Sans logos par langue : le logo connu.
 */
function logoDe(facts, langue) {
  const l = facts.logos;
  if (!l) return facts.logo || null;
  const ordre = { fr: ["fr", "en"], en: ["en", "fr"], vo: ["vo", "fr", "en"] }[langue] || ["fr", "en"];
  for (const k of ordre) if (l[k]) return l[k];
  return null;
}

/** La qualité à montrer : { extra } (« 4K + DV/HDR » ou « 4K seul »), ou { label, extra, atmos } (« tout »), ou null. */
function qualiteDe(quality, montrer) {
  if (!quality) return null;
  if (montrer !== "tout") return quality.uhd ? { extra: montrer === "4k" ? null : quality.extra || null } : null;
  const label = quality.uhd ? "4K" : quality.fhd ? "1080p" : null;
  if (!label) return null;
  const extra = quality.uhd ? (quality.extra === "DV" ? "DV" : quality.hdr10p ? "HDR10+" : quality.extra || null) : null;
  return { label, extra, atmos: !!quality.atmos };
}

/** Contenu d'une affiche, ou null si le titre n'a aucune image pour cette forme. */
export function posterContent(facts, { imdbRating, rank, quality, notes }, shape, r = DEFAUT_REGLAGES, today = aujourdhui()) {
  const paysage = shape === "landscape";
  // Image : sans texte + notre logo (défaut) ; en portrait, l'affiche officielle (avec son texte, sans logo) ou
  // l'image du film recadrée (fond sans texte, avec logo).
  const source = r.titre.on && !paysage ? r.image.source : "sanstexte";
  const normale = paysage ? facts.backdrop : facts.poster;
  let image, full, logo = null;
  if (source === "officielle") {
    image = normale || null;
    full = !!image;
  } else {
    const sansTexte = paysage || source === "fond" ? facts.textlessBackdrop : facts.textlessPoster;
    logo = r.titre.on ? logoDe(facts, r.titre.langue) : null;
    full = !!(r.titre.on && sansTexte && logo);
    image = full ? sansTexte : normale || null;
    if (!full) logo = null;
  }
  if (!image) return null;
  // Pas sorti = pas encore chez soi en VF, comme les rangées de l'addon (au cinéma compris).
  const { sorti, statut, quand } = etatSortie(facts, today);
  const pasSorti = !sorti;
  const plateforme = r.plateforme.on && facts.provider ? facts.provider.logo : null;
  const line = {};
  if (full) {
    const genres = r.genre.forme === "complet" ? GENRES_COMPLETS : SHORT_GENRES;
    if (r.genre.on && genres[facts.genreIds[0]]) line.genre = genres[facts.genreIds[0]];
    const notesVisibles = r.note.on && !(r.sortie.cacherNote && pasSorti);
    const n = notesVisibles ? note(facts, imdbRating, r.note.source) : null;
    if (n) line.note = n.valeur;
    // La source n'est écrite que pour le badge (« IMDb 8,4 ») : les autres affiches gardent leur ETag.
    if (n && r.note.style === "badge") line.source = n.source;
    if (n && r.note.couleur !== "non") line.noteN = Number(n.valeur.replace(",", "."));
    const autres = notesVisibles && notes ? ["rt", "mc", "lb"].filter((k) => r.note[k] && notes[k]).map((k) => ({ s: k, ...AUTRES_NOTES[k](notes[k]) })) : [];
    if (autres.length) line.notes = autres;
    if (r.annee.on && facts.year) line.annee = facts.year;
    const duree = r.duree.on ? dureeDe(facts) : null;
    if (duree) line.duree = duree;
    if (r.age.on && facts.age) line.age = facts.age;
    if (plateforme && r.plateforme.place === "ligne") line.plateforme = plateforme;
    if (Object.keys(line).length && r.ligne.ordre !== "gna") line.ordre = r.ligne.ordre;
  }
  // Pas encore sorti : la date quand on la connaît, plutôt que « Bientôt » ou « En salle ».
  let libelle = r.statut.on && statut ? (quand ? libelleDate(quand, today) : LIBELLES_STATUT[statut]) : null;
  let place = r.tendance.on && rank >= 1 && rank <= 20 ? rank : null;
  // Bandeau en coin : il porte le statut ou le N° de tendance, qui ne sont alors plus écrits en haut.
  let bandeau = null;
  if (r.bandeau.on) {
    const texte = r.bandeau.porte === "tendance" ? (place ? `N°${place}` : null) : libelle;
    if (texte) {
      bandeau = { texte, coin: r.bandeau.coin };
      if (r.bandeau.porte === "tendance") place = null; else libelle = null;
    }
  }
  const b = r.haut, a = r.ambiance;
  const content = {
    shape,
    image,
    full,
    gris: r.sortie.nb && pasSorti,
    logo,
    line: Object.keys(line).length ? line : null,
    statut: libelle,
    rank: place,
    quality: r.qualite.on ? qualiteDe(quality, r.qualite.montrer) : null,
    styles: {
      statut: r.statut.style, tendance: r.tendance.style, qualite: r.qualite.style, titre: r.titre.taille,
      note: r.note.style, texte: r.texte.taille, sep: r.texte.sep, haut: r.texte.haut,
      fondu: full && r.fondu.on
        ? { couleur: r.fondu.couleur, force: r.fondu.force, ...(r.fondu.flou ? { flou: true } : {}), ...(r.fondu.hauteur !== "normal" ? { hauteur: r.fondu.hauteur } : {}) }
        : null,
      // Réglages ajoutés ensuite : écrits seulement hors défaut, pour ne pas changer l'ETag des affiches déjà vues.
      ...(r.titre.place !== "auto" ? { place: r.titre.place } : {}),
      ...(r.texte.police !== "inter" ? { police: r.texte.police } : {}),
      ...(r.titre.monte ? { monte: r.titre.monte } : {}),
      ...(r.titre.large !== 1 ? { large: r.titre.large } : {}),
      ...(r.note.couleur !== "non" ? { couleurNote: r.note.couleur } : {}),
      ...(r.ligne.barre !== "aucune" ? { barre: r.ligne.barre } : {}),
      ...(b.inverse ? { inverse: true } : {}),
      ...(b.style !== "auto" ? { badges: { style: b.style, forme: b.forme, opacite: b.opacite, couleur: b.couleur } } : {}),
      ...(a.voile !== "m" ? { voile: a.voile } : {}),
      ...(a.vignette ? { vignette: true } : {}),
      ...(a.accent !== "or" ? { accent: a.accent } : {}),
    },
  };
  // Clés ajoutées seulement quand elles servent (même raison : l'ETag des autres affiches ne bouge pas).
  if (bandeau) content.bandeau = bandeau;
  if (plateforme && r.plateforme.place === "coin") content.coin = plateforme;
  return content;
}

/** Empreinte du contenu (et du dessin) : sert d'ETag. */
export function contentKey(content) {
  return createHash("sha1").update(DESIGN + JSON.stringify(content)).digest("hex");
}
