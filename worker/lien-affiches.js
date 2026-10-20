/**
 * Réglages des affiches maison (la « régie » de la salle 2) et leur écriture dans le lien d'affiches.
 * Deux copies identiques : worker/lien-affiches.js (le site) et affiches/lib/lien-affiches.js (le service sur
 * Vercel) ; un test vérifie qu'elles le restent. Module pur, sans import.
 *
 * Le lien porte un seul paramètre, s=1.<codes> : 2 caractères par réglage qui diffère du défaut, toujours
 * dans le même ordre, sans les sous-réglages d'une voie éteinte. Un même réglage donne donc un seul lien.
 * Les anciens liens (o = lettres des éléments coupés, r=tmdb) sont encore lus.
 */
const geler = (o) => { Object.values(o).forEach((v) => Object.freeze(v)); return Object.freeze(o); };

export const DEFAUT_REGLAGES = geler({
  statut: { on: true, style: "texte" },
  tendance: { on: true, style: "fleche" },
  qualite: { on: true, montrer: "plus", style: "texte" },
  titre: { on: true, taille: "m" },
  note: { on: true, source: "imdb", style: "etoile" },
  genre: { on: true, forme: "court" },
  annee: { on: true },
  texte: { taille: "m", sep: "point" },
  fondu: { on: true, couleur: "noir", force: "m" },
  sortie: { nb: true, salle: false, cacherNote: true },
});

// Chaque code : [lettre, voie, champ, { caractère: valeur }, quand l'écrire]. L'ordre du tableau est l'ordre du lien.
const titreOn = (r) => r.titre.on;
const CODES = [
  ["S", "statut", "on", { 0: false }],
  ["s", "statut", "style", { e: "etiquette" }, (r) => r.statut.on],
  ["T", "tendance", "on", { 0: false }],
  ["t", "tendance", "style", { p: "pastille", r: "ruban" }, (r) => r.tendance.on],
  ["Q", "qualite", "on", { 0: false }],
  ["q", "qualite", "montrer", { 4: "4k" }, (r) => r.qualite.on],
  ["k", "qualite", "style", { p: "pastille" }, (r) => r.qualite.on],
  ["L", "titre", "on", { 0: false }],
  ["l", "titre", "taille", { s: "s", l: "l" }, titreOn],
  ["N", "note", "on", { 0: false }, titreOn],
  ["n", "note", "source", { t: "tmdb" }, (r) => r.titre.on && r.note.on],
  ["e", "note", "style", { n: "nu", g: "grand" }, (r) => r.titre.on && r.note.on],
  ["G", "genre", "on", { 0: false }, titreOn],
  ["g", "genre", "forme", { c: "complet" }, (r) => r.titre.on && r.genre.on],
  ["A", "annee", "on", { 0: false }, titreOn],
  ["x", "texte", "taille", { s: "s", l: "l" }, titreOn],
  ["p", "texte", "sep", { b: "barre", u: "puce" }, titreOn],
  ["F", "fondu", "on", { 0: false }, titreOn],
  ["f", "fondu", "couleur", { a: "affiche" }, (r) => r.titre.on && r.fondu.on],
  ["i", "fondu", "force", { s: "s", l: "l" }, (r) => r.titre.on && r.fondu.on],
  ["B", "sortie", "nb", { 0: false }],
  ["c", "sortie", "salle", { 1: true }, (r) => r.sortie.nb],
  ["h", "sortie", "cacherNote", { 0: false }, (r) => r.titre.on && r.note.on],
];

const copie = (r) => JSON.parse(JSON.stringify(r));

/** Les styles tout prêts de la régie (« mémoires »). */
export const MEMOIRES = (() => {
  const de = (changer) => { const r = copie(DEFAUT_REGLAGES); changer(r); return geler(r); };
  return Object.freeze({
    maison: DEFAUT_REGLAGES,
    essentiel: de((r) => { r.statut.on = false; r.tendance.on = false; r.genre.on = false; r.annee.on = false; }),
    noteSeule: de((r) => {
      r.statut.on = false; r.tendance.on = false; r.qualite.on = false; r.genre.on = false; r.annee.on = false; r.note.style = "grand";
    }),
    nue: de((r) => {
      for (const v of ["statut", "tendance", "qualite", "titre", "note", "genre", "annee", "fondu"]) r[v].on = false;
      r.sortie.nb = false;
    }),
  });
})();

/** Valeur canonique du paramètre s (sans « 1. ») ; "" quand tout est par défaut. */
export function ecrireReglages(r) {
  let s = "";
  for (const [lettre, voie, champ, valeurs, quand] of CODES) {
    if (quand && !quand(r)) continue;
    const v = r[voie][champ];
    if (v === DEFAUT_REGLAGES[voie][champ]) continue;
    const car = Object.keys(valeurs).find((k) => valeurs[k] === v);
    if (car !== undefined) s += lettre + car;
  }
  return s;
}

/** Réglages lus dans les paramètres d'un lien d'affiches (s=1.…, ou les anciens o et r). */
export function lireReglages(params) {
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
export function lienAffiches(r) {
  const s = ecrireReglages(r || DEFAUT_REGLAGES);
  return "https://affiches-catalogue-fr.vercel.app/{type}/{shape}/{id}.jpg?imdb={imdb_id?}" + (s ? "&s=1." + s : "");
}

/** Le nom de la mémoire qui correspond à ces réglages, ou null (réglage perso). */
export function memoireDe(r) {
  const s = ecrireReglages(r);
  return Object.keys(MEMOIRES).find((nom) => ecrireReglages(MEMOIRES[nom]) === s) || null;
}
