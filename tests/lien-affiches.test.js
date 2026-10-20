import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAUT_REGLAGES, MEMOIRES, lireReglages, ecrireReglages, lienAffiches, memoireDe } from "../worker/lien-affiches.js";

const DEFAUT_LIEN = "https://affiches-catalogue-fr.vercel.app/{type}/{shape}/{id}.jpg?imdb={imdb_id?}";
const lire = (q) => lireReglages(new URLSearchParams(q));
const ecrit = (q) => ecrireReglages(lire(q));
const clone = (o) => JSON.parse(JSON.stringify(o));

test("defaut_vide", () => {
  assert.equal(ecrireReglages(DEFAUT_REGLAGES), "");
  assert.equal(lienAffiches(DEFAUT_REGLAGES), DEFAUT_LIEN);
  assert.equal(ecrit(""), "");
});

// Petit générateur pseudo-aléatoire à graine fixe : les mêmes réglages à chaque lancement.
function hasard(graine) { let s = graine; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; }
const CHOIX = {
  "statut.on": [true, false], "statut.style": ["texte", "etiquette"],
  "tendance.on": [true, false], "tendance.style": ["fleche", "pastille", "ruban"],
  "qualite.on": [true, false], "qualite.montrer": ["plus", "4k"], "qualite.style": ["texte", "pastille"],
  "titre.on": [true, false], "titre.taille": ["s", "m", "l"],
  "note.on": [true, false], "note.source": ["imdb", "tmdb"], "note.style": ["etoile", "nu", "grand"],
  "genre.on": [true, false], "genre.forme": ["court", "complet"], "annee.on": [true, false],
  "texte.taille": ["s", "m", "l"], "texte.sep": ["point", "barre", "puce"],
  "fondu.on": [true, false], "fondu.couleur": ["noir", "affiche"], "fondu.force": ["s", "m", "l"],
  "sortie.nb": [true, false], "sortie.salle": [true, false], "sortie.cacherNote": [true, false],
};

test("aller_retour", () => {
  const r = hasard(42);
  const essais = [...Object.values(MEMOIRES)];
  for (let i = 0; i < 20; i++) {
    const x = clone(DEFAUT_REGLAGES);
    for (const [chemin, vals] of Object.entries(CHOIX)) { const [a, b] = chemin.split("."); x[a][b] = vals[Math.floor(r() * vals.length)]; }
    essais.push(x);
  }
  for (const x of essais) {
    const s = ecrireReglages(x);
    assert.equal(ecrireReglages(lire(s ? "s=1." + s : "")), s, s);
  }
});

test("ordre_canonique", () => {
  assert.equal(ecrit("s=1.Q0T0"), "T0Q0");
});

test("sous_reglages_ignores", () => {
  assert.equal(ecrit("s=1.N0nteg"), "N0");
  assert.equal(ecrit("s=1.L0gcxs"), "L0");
  assert.equal(ecrit("s=1.F0fail"), "F0");
  assert.equal(ecrit("s=1.B0c1"), "B0");
});

test("codes_inconnus_ignores", () => {
  assert.equal(ecrit("s=1.zz9yT0"), "T0");
  assert.equal(ecrit("s=2.T0"), "");
  assert.equal(ecrit("s=n'importe quoi"), "");
});

test("anciens_liens", () => {
  assert.equal(ecrit("o=tga"), "T0G0A0");
  assert.equal(ecrit("o=tga&r=tmdb"), "T0ntG0A0");
  assert.equal(memoireDe(lire("o=tqngal")), "nue");
  assert.equal(ecrit("o=n&r=tmdb"), "N0");
  assert.equal(ecrit("r=tmdb"), "nt");
});

test("memoires", () => {
  assert.equal(memoireDe(DEFAUT_REGLAGES), "maison");
  const e = MEMOIRES.essentiel;
  assert.deepEqual([e.statut.on, e.tendance.on, e.qualite.on, e.titre.on, e.note.on, e.genre.on, e.annee.on, e.fondu.on, e.sortie.nb], [false, false, true, true, true, false, false, true, true]);
  const n = MEMOIRES.noteSeule;
  assert.deepEqual([n.statut.on, n.tendance.on, n.qualite.on, n.titre.on, n.note.on, n.note.style, n.genre.on, n.annee.on, n.fondu.on, n.sortie.nb], [false, false, false, true, true, "grand", false, false, true, true]);
  const u = MEMOIRES.nue;
  assert.deepEqual([u.statut.on, u.tendance.on, u.qualite.on, u.titre.on, u.note.on, u.genre.on, u.annee.on, u.fondu.on, u.sortie.nb], [false, false, false, false, false, false, false, false, false]);
  for (const [nom, r] of Object.entries(MEMOIRES)) assert.equal(memoireDe(r), nom);
  const perso = clone(DEFAUT_REGLAGES); perso.genre.on = false;
  assert.equal(memoireDe(perso), null);
});

test("lien_avec_reglages", () => {
  assert.equal(lienAffiches(MEMOIRES.essentiel), DEFAUT_LIEN + "&s=1.S0T0G0A0");
});

// Vercel ne déploie que affiches/, Docker que worker/ : le module existe en deux copies, toujours identiques.
test("copies_identiques", () => {
  const a = readFileSync(new URL("../worker/lien-affiches.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const b = readFileSync(new URL("../affiches/lib/lien-affiches.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.equal(a, b);
});
