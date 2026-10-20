/**
 * Réglages des affiches maison (la « régie » de la salle 2) et leur écriture dans le lien d'affiches.
 * Deux copies identiques : worker/lien-affiches.js (le site) et affiches/lib/lien-affiches.js (le service sur
 * Vercel) ; un test vérifie qu'elles le restent. Tout tient dans une seule fonction autonome,
 * creerLienAffiches : le script commun des pages du site (worker/nuvio.js) la reprend telle quelle.
 *
 * Le lien porte un seul paramètre, s=1.<codes> : 2 caractères par réglage qui diffère du défaut, toujours
 * dans le même ordre, sans les sous-réglages d'une voie éteinte. Un même réglage donne donc un seul lien.
 * Les anciens liens (o = lettres des éléments coupés, r=tmdb) sont encore lus.
 */
export function creerLienAffiches() {
  const geler = (o) => { Object.values(o).forEach((v) => Object.freeze(v)); return Object.freeze(o); };
  const copie = (r) => JSON.parse(JSON.stringify(r));

  const DEFAUT_REGLAGES = geler({
    statut: { on: true, style: "texte" },
    tendance: { on: true, style: "fleche" },
    qualite: { on: true, montrer: "plus", style: "texte" },
    // Badges du haut : « auto » = le style propre à chaque badge (ci-dessus) ; sinon un style commun.
    haut: { inverse: false, style: "auto", forme: "arrondi", opacite: "l", couleur: "blanc" },
    bandeau: { on: false, porte: "statut", coin: "d" },
    titre: { on: true, taille: 1, place: "auto", langue: "fr", monte: 0, large: 1 },
    note: { on: true, source: "imdb", style: "etoile", rt: false, mc: false, lb: false, couleur: "non" },
    genre: { on: true, forme: "court" },
    annee: { on: true },
    duree: { on: false },
    age: { on: false },
    plateforme: { on: false, place: "ligne" },
    ligne: { ordre: "gna", barre: "aucune" },
    texte: { taille: 1, sep: "point", haut: 1, police: "inter" },
    image: { source: "sanstexte" },
    fondu: { on: true, couleur: "noir", force: "m", flou: false, hauteur: "normal" },
    ambiance: { voile: "m", vignette: false, accent: "or" },
    sortie: { nb: true, cacherNote: true },
  });

  // Tailles réglables à la main : de 60 % à 140 % par pas de 5 %, une lettre par cran (a = 0,6, i = 1, q = 1,4).
  const TAILLES = Object.freeze(Object.fromEntries([..."abcdefghijklmnopq"].map((c, i) => [c, Math.round(60 + i * 5) / 100])));
  const cranDe = (v) => Object.keys(TAILLES).reduce((a, c) => (Math.abs(TAILLES[c] - v) < Math.abs(TAILLES[a] - v) ? c : a));
  // Hauteur du titre : remonté de 0 à 30 % de la hauteur de l'image, par pas de 5 %.
  const MONTEES = Object.freeze({ a: 0, b: 0.05, c: 0.1, d: 0.15, e: 0.2, f: 0.25, g: 0.3 });

  // Chaque code : [lettre, voie, champ, { caractère: valeur }, quand l'écrire]. L'ordre du tableau est l'ordre du lien.
  const titreOn = (r) => r.titre.on;
  const noteOn = (r) => r.titre.on && r.note.on;
  // Un badge en haut (statut, tendance, qualité, ou la plateforme en coin) : les réglages des badges servent.
  const hautOn = (r) => r.statut.on || r.tendance.on || r.qualite.on || (r.plateforme.on && r.plateforme.place === "coin");
  const styleCommun = (r) => hautOn(r) && r.haut.style !== "auto";
  // La couleur d'accent sert à l'étoile, à la flèche ou au ruban de tendance, au bandeau, à la barre fine, au texte « accent » des badges.
  const accentOn = (r) => r.tendance.on || (r.bandeau.on && (r.statut.on || r.tendance.on))
    || (r.titre.on && ((r.note.on && r.note.style === "etoile") || r.ligne.barre === "fine")) || (styleCommun(r) && r.haut.couleur === "or");
  const CODES = [
    ["S", "statut", "on", { 0: false }],
    ["s", "statut", "style", { e: "etiquette" }, (r) => r.statut.on],
    ["T", "tendance", "on", { 0: false }],
    ["t", "tendance", "style", { r: "ruban" }, (r) => r.tendance.on],
    ["Q", "qualite", "on", { 0: false }],
    ["q", "qualite", "montrer", { 4: "4k", t: "tout" }, (r) => r.qualite.on],
    ["k", "qualite", "style", { p: "pastille" }, (r) => r.qualite.on],
    ["I", "haut", "inverse", { 1: true }, hautOn],
    ["H", "haut", "style", { p: "plein", v: "verre", c: "contour" }, hautOn],
    ["y", "haut", "forme", { c: "carre", p: "pilule" }, styleCommun],
    ["a", "haut", "opacite", { s: "s", m: "m" }, styleCommun],
    ["C", "haut", "couleur", { o: "or", n: "noir" }, styleCommun],
    ["J", "bandeau", "on", { 1: true }, (r) => r.statut.on || r.tendance.on],
    ["K", "bandeau", "porte", { t: "tendance" }, (r) => r.bandeau.on && (r.statut.on || r.tendance.on)],
    ["E", "bandeau", "coin", { g: "g" }, (r) => r.bandeau.on && (r.statut.on || r.tendance.on)],
    ["L", "titre", "on", { 0: false }],
    ["l", "titre", "taille", TAILLES, titreOn],
    ["o", "titre", "place", { g: "gauche", c: "centre" }, titreOn],
    ["u", "titre", "langue", { e: "en", v: "vo" }, titreOn],
    ["m", "titre", "monte", MONTEES, titreOn],
    ["j", "titre", "large", TAILLES, titreOn],
    ["N", "note", "on", { 0: false }, titreOn],
    ["n", "note", "source", { t: "tmdb" }, noteOn],
    ["e", "note", "style", { n: "nu", g: "grand", b: "badge" }, noteOn],
    ["R", "note", "rt", { 1: true }, noteOn],
    ["M", "note", "mc", { 1: true }, noteOn],
    ["b", "note", "lb", { 1: true }, noteOn],
    ["c", "note", "couleur", { o: "oui", h: "halo" }, noteOn],
    ["G", "genre", "on", { 0: false }, titreOn],
    ["g", "genre", "forme", { c: "complet" }, (r) => r.titre.on && r.genre.on],
    ["A", "annee", "on", { 0: false }, titreOn],
    ["D", "duree", "on", { 1: true }, titreOn],
    ["Y", "age", "on", { 1: true }, titreOn],
    ["P", "plateforme", "on", { 1: true }, (r) => r.titre.on || r.plateforme.place === "coin"],
    ["v", "plateforme", "place", { c: "coin" }, (r) => r.plateforme.on],
    ["O", "ligne", "ordre", { n: "nga", a: "agn" }, titreOn],
    ["r", "ligne", "barre", { v: "verre", f: "fine" }, titreOn],
    ["x", "texte", "taille", TAILLES, titreOn],
    ["p", "texte", "sep", { b: "barre", u: "puce" }, titreOn],
    ["z", "texte", "haut", TAILLES, hautOn],
    ["w", "texte", "police", { b: "bebas" }, (r) => r.titre.on || r.statut.on || r.tendance.on || r.qualite.on],
    ["F", "fondu", "on", { 0: false }, titreOn],
    ["f", "fondu", "couleur", { a: "affiche" }, (r) => r.titre.on && r.fondu.on],
    ["i", "fondu", "force", { s: "s", l: "l" }, (r) => r.titre.on && r.fondu.on],
    ["d", "fondu", "flou", { 1: true }, (r) => r.titre.on && r.fondu.on],
    ["W", "fondu", "hauteur", { c: "court", l: "long" }, (r) => r.titre.on && r.fondu.on],
    ["U", "image", "source", { o: "officielle", f: "fond" }, titreOn],
    ["V", "ambiance", "voile", { 0: "0", s: "s", l: "l" }, (r) => hautOn(r) || (r.bandeau.on && (r.statut.on || r.tendance.on))],
    ["X", "ambiance", "vignette", { 1: true }],
    ["Z", "ambiance", "accent", { b: "blanc", r: "rouge", u: "bleu", a: "affiche" }, accentOn],
    ["B", "sortie", "nb", { 0: false }],
    ["h", "sortie", "cacherNote", { 0: false }, (r) => r.titre.on && r.note.on],
  ];

  /** Les styles tout prêts de la régie (« mémoires »). */
  const de = (changer) => { const r = copie(DEFAUT_REGLAGES); changer(r); return geler(r); };
  const MEMOIRES = Object.freeze({
    maison: DEFAUT_REGLAGES,
    essentiel: de((r) => { r.statut.on = false; r.tendance.on = false; r.genre.on = false; r.annee.on = false; }),
    noteSeule: de((r) => {
      r.statut.on = false; r.tendance.on = false; r.qualite.on = false; r.genre.on = false; r.annee.on = false; r.note.style = "grand";
    }),
    // Façon affiche de cinéma : police haute et serrée, note en badge, âge conseillé, fond flouté sous le titre.
    cine: de((r) => {
      r.texte.police = "bebas"; r.note.style = "badge"; r.fondu.flou = true; r.age.on = true; r.statut.style = "etiquette";
    }),
    // Façon Posters+ : plusieurs notes colorées, ligne sur une bande de verre, statut en bandeau, badges en verre.
    postersPlus: de((r) => {
      r.note.rt = true; r.note.mc = true; r.note.couleur = "oui"; r.ligne.barre = "verre"; r.bandeau.on = true;
      r.haut.style = "verre"; r.haut.forme = "pilule";
    }),
    // La plateforme où regarder le titre, la note en badge et la durée.
    plateforme: de((r) => { r.plateforme.on = true; r.note.style = "badge"; r.duree.on = true; }),
    nue: de((r) => {
      for (const v of ["statut", "tendance", "qualite", "titre", "note", "genre", "annee", "fondu"]) r[v].on = false;
      r.sortie.nb = false;
    }),
  });

  /** Valeur canonique du paramètre s (sans « 1. ») ; "" quand tout est par défaut. */
  function ecrireReglages(r) {
    let s = "";
    for (const [lettre, voie, champ, valeurs, quand] of CODES) {
      if (quand && !quand(r)) continue;
      const v = r[voie][champ];
      // Une taille est ramenée au cran le plus proche ; au cran de 100 %, c'est le défaut.
      const car = valeurs === TAILLES ? cranDe(Number(v) || 1) : Object.keys(valeurs).find((k) => valeurs[k] === v);
      if (car === undefined || valeurs[car] === DEFAUT_REGLAGES[voie][champ]) continue;
      s += lettre + car;
    }
    return s;
  }

  /** Réglages lus dans les paramètres d'un lien d'affiches (s=1.…, ou les anciens o et r). */
  function lireReglages(params) {
    const r = copie(DEFAUT_REGLAGES);
    const s = params.get("s");
    if (s !== null) {
      if (!s.startsWith("1.")) return r;
      const codes = s.slice(2);
      for (let i = 0; i + 1 < codes.length; i += 2) {
        const code = CODES.find((c) => c[0] === codes[i]);
        if (code && Object.prototype.hasOwnProperty.call(code[3], codes[i + 1])) r[code[1]][code[2]] = code[3][codes[i + 1]];
      }
      return r;
    }
    // Ancien lien (étape 1) : o = lettres des éléments coupés, r=tmdb = note TMDB.
    const o = params.get("o") || "";
    const coupes = { t: "tendance", q: "qualite", n: "note", g: "genre", a: "annee", l: "titre" };
    for (const [k, voie] of Object.entries(coupes)) if (o.includes(k)) r[voie].on = false;
    if (Object.keys(coupes).every((k) => o.includes(k))) { r.statut.on = false; r.fondu.on = false; r.sortie.nb = false; }
    if (params.get("r") === "tmdb") r.note.source = "tmdb";
    return r;
  }

  /** Réglages du paysage : sp s'il y en a (réglages à part), sinon les mêmes que le portrait (s). */
  function lireReglagesPaysage(params) {
    const sp = params.get("sp");
    return sp === null ? lireReglages(params) : lireReglages(new URLSearchParams({ s: sp }));
  }

  /**
   * Le lien à coller dans Nuvio (Paramètres → Disposition → Custom Poster Source). rp : réglages à part pour le
   * paysage, écrits dans sp seulement s'ils diffèrent du portrait.
   */
  function lienAffiches(r, rp) {
    const s = ecrireReglages(r || DEFAUT_REGLAGES), sp = rp ? ecrireReglages(rp) : s;
    return "https://affiches-catalogue-fr.vercel.app/{type}/{shape}/{id}.jpg?imdb={imdb_id?}" + (s ? "&s=1." + s : "") + (sp !== s ? "&sp=1." + sp : "");
  }

  /** Le nom de la mémoire qui correspond à ces réglages, ou null (réglage perso). */
  function memoireDe(r) {
    const s = ecrireReglages(r);
    return Object.keys(MEMOIRES).find((nom) => ecrireReglages(MEMOIRES[nom]) === s) || null;
  }

  return { DEFAUT_REGLAGES, TAILLES, MONTEES, MEMOIRES, ecrireReglages, lireReglages, lireReglagesPaysage, lienAffiches, memoireDe };
}

export const { DEFAUT_REGLAGES, TAILLES, MONTEES, MEMOIRES, ecrireReglages, lireReglages, lireReglagesPaysage, lienAffiches, memoireDe } = creerLienAffiches();
