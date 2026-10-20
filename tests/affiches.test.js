import { test } from "node:test";
import assert from "node:assert/strict";
import { AFFICHES_URL, POSTER_URL, lienAffiches, ELEMENTS_AFFICHES } from "../worker/reglages.js";
import { guidePage } from "../worker/guide.js";
import { configurePage } from "../worker/page.js";
import { defaults, decodeConfig, PROVIDERS, REGIONS, GENRES, LANGUAGES, SORTS, SEASON_KEYS, MAX_CUSTOM, COLLECTIONS } from "../worker/config.js";

// Le lien à coller dans Nuvio (Custom Poster Source) : sans réglage, le même pour tout le monde.
test("lien_affiches_par_defaut", () => {
  assert.equal(POSTER_URL, `${AFFICHES_URL}/{type}/{shape}/{id}.jpg?imdb={imdb_id?}`);
  assert.equal(lienAffiches(), POSTER_URL);
  assert.equal(lienAffiches({ o: "", r: "imdb" }), POSTER_URL);
  assert.match(AFFICHES_URL, /^https:\/\/[a-z0-9-]+\.vercel\.app$/);
});

// Lettres coupées toujours dans le même ordre (tqngal) : deux personnes aux mêmes réglages partagent le cache.
test("lien_affiches_options_canoniques", () => {
  assert.equal(lienAffiches({ o: "qt" }), POSTER_URL + "&o=tq");
  assert.equal(lienAffiches({ o: "lagnqt" }), POSTER_URL + "&o=tqngal");
  assert.equal(lienAffiches({ o: "zz" }), POSTER_URL);
  assert.equal(lienAffiches({ r: "tmdb" }), POSTER_URL + "&r=tmdb");
  assert.equal(lienAffiches({ o: "a", r: "tmdb" }), POSTER_URL + "&o=a&r=tmdb");
  assert.deepEqual(ELEMENTS_AFFICHES.map(([k]) => k).join(""), "tqngal");
});

// Note coupée : la source de la note ne change rien, elle ne reste pas dans le lien.
test("lien_affiches_sans_source_de_note_inutile", () => {
  assert.equal(lienAffiches({ o: "n", r: "tmdb" }), POSTER_URL + "&o=n");
});

// Sans titre maison, la ligne du bas (note, genre, année) n'existe pas : ses interrupteurs sont grisés.
test("salle_2_interrupteurs_sans_effet_grises", () => {
  const html = salle2();
  assert.match(html, /c\.disabled = a\.o\.includes\("l"\) && "nga"\.includes\(c\.dataset\.aff\)/);
});

// L'ancienne clé TMDB (affiches Posters+) n'est plus utile : elle est effacée des navigateurs.
test("ancienne_cle_tmdb_effacee", async () => {
  const { NUVIO_JS } = await import("../worker/nuvio.js");
  assert.match(NUVIO_JS, /localStorage\.removeItem\("tmdb-key"\)/);
});

const salle2 = () => {
  const rows = [{ id: "a", home: true, name: "A", type: "movie" }];
  return configurePage({ copy: false,
    origin: "https://x", cfg: decodeConfig("", rows, []), rows, discover: [],
    providers: PROVIDERS, collections: COLLECTIONS.map((c) => ({ ...c, pos: 0, folders: [] })), defaults: defaults(rows, []),
    regions: REGIONS, genres: GENRES, languages: LANGUAGES, sorts: SORTS, seasons: SEASON_KEYS, maxCustom: MAX_CUSTOM, season: null,
  });
};

test("guide_sans_posters_plus_ni_cle_tmdb", () => {
  const html = guidePage({ origin: "https://x", season: "" });
  assert.ok(html.includes(POSTER_URL.replace(/&/g, "&amp;")) || html.includes(POSTER_URL));
  assert.doesNotMatch(html, /TA_CLE_TMDB|tmdb-key-8|PostersPlus|postersplus/);
  assert.match(html, /Tes affiches/);
});

// Scripts de la salle 2 et script commun des aperçus (qui embarque lienAffiches) : ils se lisent sans erreur,
// et lienAffiches y donne le même lien que côté serveur.
test("scripts_salle_2_et_commun_valides", async () => {
  for (const s of [...salle2().matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])) assert.doesNotThrow(() => new Function(s));
  const { NUVIO_JS } = await import("../worker/nuvio.js");
  assert.doesNotThrow(() => new Function(NUVIO_JS));
  const lien = new Function(NUVIO_JS.split("window.NV = ")[0] + "; return lienAffiches;")();
  assert.equal(lien({ o: "aq", r: "tmdb" }), lienAffiches({ o: "aq", r: "tmdb" }));
});

// Chaque réglage changé redessine les affiches de l'écran (un dessin par affiche chez Vercel) : une rafale
// de clics ne doit en déclencher qu'un, 400 ms après le dernier.
test("salle_2_affiches_redessinees_une_fois_par_rafale", () => {
  const html = salle2();
  const debut = html.indexOf("function majAffiches");
  const corps = html.slice(debut, html.indexOf("\n}\n", debut));
  assert.match(corps, /clearTimeout\(attenteAffiches\)/);
  assert.match(corps, /attenteAffiches = setTimeout\(\(\) => E\.pp\(\), 400\)/);
  assert.doesNotMatch(corps.replace(/setTimeout\(\(\) => E\.pp\(\), 400\)/, ""), /E\.pp\(\)/);
});

test("salle_2_editeur_d_affiches", () => {
  const html = salle2();
  assert.match(html, /id="s-affiches"/);
  assert.match(html, /href="#s-affiches"/);
  assert.match(html, /id="u-affiches"/);
  assert.match(html, /Custom Poster Source/);
  assert.doesNotMatch(html, /TA_CLE_TMDB|PostersPlus|postersplus/);
});
