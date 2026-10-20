import { test } from "node:test";
import assert from "node:assert/strict";
import { AFFICHES_URL, POSTER_URL } from "../worker/reglages.js";
import { DEFAUT_REGLAGES, MEMOIRES, lienAffiches, lireReglages } from "../worker/lien-affiches.js";
import { guidePage } from "../worker/guide.js";
import { configurePage } from "../worker/page.js";
import { defaults, decodeConfig, PROVIDERS, REGIONS, GENRES, LANGUAGES, SORTS, SEASON_KEYS, MAX_CUSTOM, COLLECTIONS } from "../worker/config.js";

const salle2 = () => {
  const rows = [{ id: "a", home: true, name: "A", type: "movie" }];
  return configurePage({ copy: false,
    origin: "https://x", cfg: decodeConfig("", rows, []), rows, discover: [],
    providers: PROVIDERS, collections: COLLECTIONS.map((c) => ({ ...c, pos: 0, folders: [] })), defaults: defaults(rows, []),
    regions: REGIONS, genres: GENRES, languages: LANGUAGES, sorts: SORTS, seasons: SEASON_KEYS, maxCustom: MAX_CUSTOM, season: null,
  });
};

// Le lien à coller dans Nuvio (Custom Poster Source) : sans réglage, le même pour tout le monde, à l'octet près.
test("lien_par_defaut_inchange", () => {
  assert.equal(POSTER_URL, "https://affiches-catalogue-fr.vercel.app/{type}/{shape}/{id}.jpg?imdb={imdb_id?}");
  assert.equal(POSTER_URL, `${AFFICHES_URL}/{type}/{shape}/{id}.jpg?imdb={imdb_id?}`);
  assert.equal(lienAffiches(DEFAUT_REGLAGES), POSTER_URL);
});

// L'ancienne clé TMDB (affiches Posters+) n'est plus utile : elle est effacée des navigateurs.
test("ancienne_cle_tmdb_effacee", async () => {
  const { NUVIO_JS } = await import("../worker/nuvio.js");
  assert.match(NUVIO_JS, /localStorage\.removeItem\("tmdb-key"\)/);
});

test("guide_sans_posters_plus_ni_cle_tmdb", () => {
  const html = guidePage({ origin: "https://x", season: "" });
  assert.ok(html.includes(POSTER_URL.replace(/&/g, "&amp;")) || html.includes(POSTER_URL));
  assert.doesNotMatch(html, /TA_CLE_TMDB|tmdb-key-8|PostersPlus|postersplus/);
});

test("regie_ouvre_depuis_le_guide", () => {
  assert.match(guidePage({ origin: "https://x", season: "" }), /https:\/\/x\/configure#regie/);
});

// Le script commun des pages embarque le module du lien (creerLienAffiches) : même lien qu'au serveur.
test("scripts_salle_2_et_commun_valides", async () => {
  for (const s of [...salle2().matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])) assert.doesNotThrow(() => new Function(s));
  const { NUVIO_JS } = await import("../worker/nuvio.js");
  assert.doesNotThrow(() => new Function(NUVIO_JS));
  const LA = new Function(NUVIO_JS.split("window.NV = ")[0] + "; return LA;")();
  for (const r of Object.values(MEMOIRES)) assert.equal(LA.lienAffiches(r), lienAffiches(r));
  const perso = lireReglages(new URLSearchParams("s=1.T0lnxczbfaB0"));
  assert.equal(LA.lienAffiches(perso), lienAffiches(perso));
});

// En préparant le worker, l'outil de Cloudflare ajoute des appels __name(…) dans le code des fonctions : recopiée
// dans le navigateur, creerLienAffiches doit tourner quand même (le script commun déclare __name).
test("script_commun_supporte_name", async () => {
  const { NUVIO_JS } = await import("../worker/nuvio.js");
  const tete = NUVIO_JS.split("window.NV = ")[0].replace("function lienAffiches(r) {", "function lienAffiches(r) { __name(lienAffiches, \"lienAffiches\");");
  assert.ok(tete.includes("__name(lienAffiches"));
  const LA = new Function(tete + "; return LA;")();
  assert.equal(LA.lienAffiches(LA.MEMOIRES.essentiel), lienAffiches(MEMOIRES.essentiel));
  assert.throws(() => new Function(tete.replace(/^var __name = [^\n]*\n/, "") + "; return LA.lienAffiches(LA.MEMOIRES.essentiel);")());
});

// La régie : une fenêtre avec la scène (grande affiche + 6 en coulisses) et la console (4 mémoires, 10 voies).
test("regie_presente", () => {
  const html = salle2();
  for (const id of ["regie", "regie-ouvrir", "regie-grande", "regie-coulisses", "regie-memoires", "regie-voies", "regie-tiroir", "regie-copier", "regie-annuler", "regie-fermer", "regie-format"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  for (const m of ["maison", "essentiel", "noteSeule", "nue"]) assert.match(html, new RegExp(`data-memoire="${m}"`), m);
  for (const v of ["statut", "tendance", "qualite", "titre", "note", "genre", "annee", "texte", "fondu", "sortie"]) assert.match(html, new RegExp(`data-voie="${v}"`), v);
  assert.match(html, /role="dialog"/);
  assert.match(html, /id="u-affiches"/);
  assert.match(html, /Custom Poster Source/);
  assert.doesNotMatch(html, /TA_CLE_TMDB|PostersPlus|postersplus/);
});

// Clavier : un choix dans un tiroir reconstruit ses boutons ; le focus revient sur le même choix, et Échap ferme
// la régie où que soit le focus.
test("regie_clavier", () => {
  const html = salle2();
  const debut = html.indexOf("function regieDessine");
  const corps = html.slice(debut, html.indexOf("\n}\n", debut));
  assert.match(corps, /dataset\.cle/);
  assert.match(corps, /\.focus\(\)/);
  assert.match(html, /document\.addEventListener\("keydown", \(e\) => \{ if \(e\.key === "Escape" && !\$\("regie"\)\.hidden\)/);
});

// Chaque réglage changé redessine les affiches de la régie (un dessin par affiche chez Vercel) : une rafale
// de clics ne doit en déclencher qu'un, 400 ms après le dernier.
test("redessin_une_fois_par_rafale", () => {
  const html = salle2();
  const debut = html.indexOf("function regieChange");
  assert.ok(debut > 0, "regieChange absente");
  const corps = html.slice(debut, html.indexOf("\n}\n", debut));
  assert.match(corps, /clearTimeout\(regieAttente\)/);
  assert.match(corps, /regieAttente = setTimeout\(regieApercus, 400\)/);
  assert.doesNotMatch(corps, /regieApercus\(\)/);
});
