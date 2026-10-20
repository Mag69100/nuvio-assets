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
    titre: { on: true, taille: 1, place: "auto" },
    note: { on: true, source: "imdb", style: "etoile" },
    genre: { on: true, forme: "court" },
    annee: { on: true },
    age: { on: false },
    texte: { taille: 1, sep: "point", haut: 1, police: "inter" },
    fondu: { on: true, couleur: "noir", force: "m", flou: false },
    sortie: { nb: true, cacherNote: true },
  });

  // Tailles réglables à la main : de 60 % à 140 % par pas de 5 %, une lettre par cran (a = 0,6, i = 1, q = 1,4).
  const TAILLES = Object.freeze(Object.fromEntries([..."abcdefghijklmnopq"].map((c, i) => [c, Math.round(60 + i * 5) / 100])));
  const cranDe = (v) => Object.keys(TAILLES).reduce((a, c) => (Math.abs(TAILLES[c] - v) < Math.abs(TAILLES[a] - v) ? c : a));

  // Chaque code : [lettre, voie, champ, { caractère: valeur }, quand l'écrire]. L'ordre du tableau est l'ordre du lien.
  const titreOn = (r) => r.titre.on;
  const CODES = [
    ["S", "statut", "on", { 0: false }],
    ["s", "statut", "style", { e: "etiquette" }, (r) => r.statut.on],
    ["T", "tendance", "on", { 0: false }],
    ["t", "tendance", "style", { r: "ruban" }, (r) => r.tendance.on],
    ["Q", "qualite", "on", { 0: false }],
    ["q", "qualite", "montrer", { 4: "4k" }, (r) => r.qualite.on],
    ["k", "qualite", "style", { p: "pastille" }, (r) => r.qualite.on],
    ["L", "titre", "on", { 0: false }],
    ["l", "titre", "taille", TAILLES, titreOn],
    ["o", "titre", "place", { g: "gauche", c: "centre" }, titreOn],
    ["N", "note", "on", { 0: false }, titreOn],
    ["n", "note", "source", { t: "tmdb" }, (r) => r.titre.on && r.note.on],
    ["e", "note", "style", { n: "nu", g: "grand", b: "badge" }, (r) => r.titre.on && r.note.on],
    ["G", "genre", "on", { 0: false }, titreOn],
    ["g", "genre", "forme", { c: "complet" }, (r) => r.titre.on && r.genre.on],
    ["A", "annee", "on", { 0: false }, titreOn],
    ["Y", "age", "on", { 1: true }, titreOn],
    ["x", "texte", "taille", TAILLES, titreOn],
    ["p", "texte", "sep", { b: "barre", u: "puce" }, titreOn],
    ["z", "texte", "haut", TAILLES, (r) => r.statut.on || r.tendance.on || r.qualite.on],
    ["w", "texte", "police", { b: "bebas" }, (r) => r.titre.on || r.statut.on || r.tendance.on || r.qualite.on],
    ["F", "fondu", "on", { 0: false }, titreOn],
    ["f", "fondu", "couleur", { a: "affiche" }, (r) => r.titre.on && r.fondu.on],
    ["i", "fondu", "force", { s: "s", l: "l" }, (r) => r.titre.on && r.fondu.on],
    ["d", "fondu", "flou", { 1: true }, (r) => r.titre.on && r.fondu.on],
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

  /** Le lien à coller dans Nuvio (Paramètres → Disposition → Custom Poster Source). */
  function lienAffiches(r) {
    const s = ecrireReglages(r || DEFAUT_REGLAGES);
    return "https://affiches-catalogue-fr.vercel.app/{type}/{shape}/{id}.jpg?imdb={imdb_id?}" + (s ? "&s=1." + s : "");
  }

  /** Le nom de la mémoire qui correspond à ces réglages, ou null (réglage perso). */
  function memoireDe(r) {
    const s = ecrireReglages(r);
    return Object.keys(MEMOIRES).find((nom) => ecrireReglages(MEMOIRES[nom]) === s) || null;
  }

  return { DEFAUT_REGLAGES, TAILLES, MEMOIRES, ecrireReglages, lireReglages, lienAffiches, memoireDe };
}

export const { DEFAUT_REGLAGES, TAILLES, MEMOIRES, ecrireReglages, lireReglages, lienAffiches, memoireDe } = creerLienAffiches();
