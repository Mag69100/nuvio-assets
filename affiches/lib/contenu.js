/**
 * Ce qu'une affiche montre, d'après les faits du titre et les réglages de la régie (lib/lien-affiches.js),
 * sans rien dessiner. Le titre ne doit jamais être caché : on ne pose le bas (logo + ligne) que sur une
 * image sans texte, et seulement si on a le logo pour remettre le titre. Sinon, l'affiche normale avec
 * les éléments du haut.
 */
import { createHash } from "node:crypto";
import { DEFAUT_REGLAGES, PALETTE } from "./lien-affiches.js";
import { etatSortie } from "./statut.js";
import { jourParis } from "./jour.js";

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
const LIBELLES_STATUT = { bientot: "BIENTÔT", salle: "AU CINÉMA", nouveau: "NOUVEAU", saison: "NOUVELLE SAISON", vo: "EN VO" };
const MOIS = ["JANV.", "FÉVR.", "MARS", "AVR.", "MAI", "JUIN", "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC."];
const DEBUTS = { dispo: "DISPO LE", cinema: "SORTIE LE", sortie: "SORTIE LE" };

const DEBUTS_COMPTE = { dispo: "DISPO", cinema: "SORTIE", sortie: "SORTIE" };
const jours = (de, a) => Math.round((Date.parse(a) - Date.parse(de)) / 86400000);

/** Compte à rebours : « AU CINÉMA DANS 57 JOURS », « DISPO DANS ENV. 35 JOURS », « AU CINÉMA DEMAIN ». */
function libelleCompte({ quoi, date, vers }, today) {
  const n = jours(today, date);
  const quand = n <= 0 ? "AUJOURD'HUI" : n === 1 ? "DEMAIN" : `DANS ${vers ? "ENV. " : ""}${n} JOURS`;
  return `${DEBUTS_COMPTE[quoi]} ${quand}`;
}

/** « DISPO LE 2 NOV. », « DISPO VERS LE 3 DÉC. », « SORTIE LE 12 MARS 2027 »… (comme les rangées de l'addon). */
function libelleDate({ quoi, date, vers }, today) {
  const jour = `${Number(date.slice(8, 10))} ${MOIS[Number(date.slice(5, 7)) - 1]}`;
  const debut = vers ? DEBUTS[quoi].replace(/ LE$/, " VERS LE") : DEBUTS[quoi];
  return `${debut} ${jour}${date.slice(0, 4) === today.slice(0, 4) ? "" : " " + date.slice(0, 4)}`;
}

const virgule = (s) => s.replace(".", ",");
// Le jour à Paris : « DEMAIN » devient « AUJOURD'HUI » à minuit à Paris, pas à minuit UTC.
const aujourdhui = () => jourParis();

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
  // En dernier, le logo d'une autre langue (ni français ni anglais) : mieux qu'une affiche sans titre ni infos.
  const ordre = { fr: ["fr", "en", "autre"], en: ["en", "fr", "autre"], vo: ["vo", "fr", "en", "autre"] }[langue] || ["fr", "en", "autre"];
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

// Lettres que les polices de l'affiche savent écrire (latin, chiffres, ponctuation) : un titre japonais ou persan
// sans logo garde l'image d'origine plutôt que des carrés vides.
const ECRIVABLE = /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}\p{M}]+$/u;

/** Contenu d'une affiche, ou null si le titre n'a aucune image pour cette forme. */
export function posterContent(facts, { imdbRating, rank, quality, notes }, shape, r = DEFAUT_REGLAGES, today = aujourdhui()) {
  const paysage = shape === "landscape";
  // Image : sans texte + notre logo (défaut) ; en portrait, l'affiche officielle (avec son texte, sans logo) ou
  // l'image du film recadrée (fond sans texte, avec logo).
  const source = r.titre.on && !paysage ? r.image.source : "sanstexte";
  const normale = paysage ? facts.backdrop : facts.poster;
  let image, full, logo = null, titreTexte = null;
  if (source === "officielle") {
    image = normale || null;
    full = !!image;
  } else {
    const sansTexte = paysage || source === "fond" ? facts.textlessBackdrop : facts.textlessPoster;
    logo = r.titre.on ? logoDe(facts, r.titre.langue) : null;
    // Aucun logo chez TMDB, dans aucune langue (EB) : le titre est écrit en texte à sa place, jamais une image sans nom.
    if (r.titre.on && !logo && sansTexte && facts.titre && ECRIVABLE.test(facts.titre)) titreTexte = facts.titre;
    full = !!(r.titre.on && sansTexte && (logo || titreTexte));
    image = full ? sansTexte : normale || null;
    if (!full) logo = null;
  }
  if (!image) return null;
  // Pas sorti = pas encore chez soi en VF, comme les rangées de l'addon (au cinéma compris).
  // Les sources lues avec la qualité (VF ou pas) décident pour un titre récent ; sinon, les dates.
  const { sorti, statut, quand } = etatSortie(facts, today, quality ? { vf: quality.vf, sources: quality.sources } : null);
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
    const autres = notesVisibles && notes && r.note.style !== "grand" ? ["rt", "mc", "lb"].filter((k) => r.note[k] && notes[k]).map((k) => ({ s: k, ...AUTRES_NOTES[k](notes[k]) })) : [];
    if (autres.length) line.notes = autres;
    if (r.annee.on && facts.year) line.annee = facts.year;
    const duree = r.duree.on ? dureeDe(facts) : null;
    if (duree) line.duree = duree;
    if (r.age.on && facts.age) line.age = facts.age;
    if (plateforme && r.plateforme.place === "ligne") line.plateforme = plateforme;
    if (Object.keys(line).length && r.ligne.ordre !== "gna") line.ordre = r.ligne.ordre;
  }
  // Pas encore sorti : la date quand on la connaît, plutôt que « Bientôt » ou « En salle ».
  // Au cinéma en ce moment : « AU CINÉMA », et en petit dessous la date où on pourra le voir chez soi.
  // Pas encore sorti : la date (« SORTIE LE 4 NOV. ») quand on la connaît, sinon « BIENTÔT ».
  const dateDe = (q) => (r.statut.forme === "compte" ? libelleCompte(q, today) : libelleDate(q, today));
  let libelle = null, libelle2 = null;
  if (r.statut.on && statut) {
    if (statut === "salle") { libelle = LIBELLES_STATUT.salle; if (quand) libelle2 = dateDe(quand); }
    else libelle = quand ? dateDe(quand) : LIBELLES_STATUT[statut];
  }
  // Série dont un épisode est sorti il y a moins de 7 jours (si rien de plus fort à dire).
  if (r.statut.on && r.statut.episode && !libelle && facts.type === "series" && facts.lastEpisode && facts.lastEpisode <= today && jours(facts.lastEpisode, today) < 7) libelle = "NOUVEL ÉPISODE";
  let place = r.tendance.on && rank >= 1 && rank <= 20 ? rank : null;
  // Bandeau en coin : il porte le statut ou le N° de tendance, qui ne sont alors plus écrits en haut.
  let bandeau = null;
  if (r.bandeau.on) {
    const texte = r.bandeau.porte === "tendance" ? (place ? `N°${place}` : null) : libelle;
    if (texte) {
      bandeau = { texte, coin: r.bandeau.coin };
      if (r.bandeau.porte === "tendance") place = null; else { libelle = null; libelle2 = null; }
    }
  }
  const b = r.haut, a = r.ambiance;
  const content = {
    shape,
    image,
    full,
    gris: r.sortie.nb && pasSorti,
    logo,
    ...(full && titreTexte ? { titreTexte } : {}),
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
  // Régie v3 : styles hors défaut seulement (couleurs du nuancier, retouches, textes, coins).
  const st = content.styles, t = r.texte, img = r.image;
  if (a.accentC) st.accentC = PALETTE[a.accentC];
  if (t.couleur) st.texteC = PALETTE[t.couleur];
  if (st.badges && b.style === "plein" && b.fond) st.badges = { ...st.badges, fond: PALETTE[b.fond] };
  if (st.fondu && r.fondu.teinte) st.fondu = { ...st.fondu, teinte: PALETTE[r.fondu.teinte] };
  // Fondu réglé finement (curseurs) : force et hauteur exactes, à la place des crans.
  if (st.fondu && r.fondu.opacite > 0) st.fondu = { ...st.fondu, opacite: r.fondu.opacite };
  if (st.fondu && r.fondu.taille > 0) st.fondu = { ...st.fondu, taille: r.fondu.taille };
  const retouche = {
    ...(img.lum !== 1 ? { lum: img.lum } : {}), ...(img.contraste !== 1 ? { contraste: img.contraste } : {}), ...(img.satur !== 1 ? { satur: img.satur } : {}),
    ...(img.filtre !== "aucun" ? { filtre: img.filtre } : {}), ...(img.grain ? { grain: true } : {}),
  };
  if (Object.keys(retouche).length) st.retouche = retouche;
  if (img.cadre !== "aucun") st.cadre = img.cadre === "blanc" ? "#ffffff" : img.cadre === "or" ? "#f5c518" : PALETTE[img.cadreC] || "#ffffff";
  if (t.casse !== "normal") st.casse = t.casse;
  if (t.espace !== "normal") st.espace = t.espace;
  if (t.ombre !== "normale") st.ombre = t.ombre;
  if (full && logo && r.titre.effet !== "aucun") st.effet = r.titre.effet;
  if (b.coinStatut !== "auto" || b.coinQualite !== "auto") st.coins = { statut: b.coinStatut, qualite: b.coinQualite };
  // Petite ligne sous la ligne du bas : réalisateur (ou créateurs), accroche, ou studio.
  if (full && r.infos.ligne2 !== "aucune") {
    const l2 = r.infos.ligne2 === "realisateur" ? (facts.director ? (facts.type === "series" ? "Créée par " : "Un film de ") + facts.director : null)
      : r.infos.ligne2 === "accroche" ? facts.tagline : facts.studio;
    if (l2) content.line2 = l2;
  }
  // Badge « Incontournable » : très bien noté (IMDb 8,0 ou plus, sinon TMDB) et très vu (3 000 votes TMDB ou plus).
  const noteCulte = Number(imdbRating || (facts.vote && facts.vote.average) || 0);
  if (r.infos.culte && noteCulte >= 8 && facts.vote && facts.vote.count >= 3000) content.culte = true;
  // Clés ajoutées seulement quand elles servent (même raison : l'ETag des autres affiches ne bouge pas).
  if (bandeau) content.bandeau = bandeau;
  if (libelle && libelle2) content.statut2 = libelle2;
  if (plateforme && r.plateforme.place === "coin") content.coin = plateforme;
  if (source === "fond" && full) content.fondLarge = true;
  return content;
}

/** Empreinte du contenu (et du dessin) : sert d'ETag. */
export function contentKey(content) {
  return createHash("sha1").update(DESIGN + JSON.stringify(content)).digest("hex");
}
