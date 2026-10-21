import { test } from "node:test";
import assert from "node:assert/strict";
import { AFFICHES_URL, POSTER_URL } from "../worker/reglages.js";
import { DEFAUT_REGLAGES, MEMOIRES, lienAffiches, lireReglages } from "../worker/lien-affiches.js";
import { guidePage } from "../worker/guide.js";
import { configurePage } from "../worker/page.js";
import { enLigne } from "./support/en-ligne.mjs";
import { defaults, decodeConfig, PROVIDERS, REGIONS, GENRES, LANGUAGES, SORTS, SEASON_KEYS, MAX_CUSTOM, COLLECTIONS } from "../worker/config.js";

const salle2 = () => {
  const rows = [{ id: "a", home: true, name: "A", type: "movie" }];
  return enLigne(configurePage({ copy: false,
    origin: "https://x", cfg: decodeConfig("", rows, []), rows, discover: [],
    providers: PROVIDERS, collections: COLLECTIONS.map((c) => ({ ...c, pos: 0, folders: [] })), defaults: defaults(rows, []),
    regions: REGIONS, genres: GENRES, languages: LANGUAGES, sorts: SORTS, seasons: SEASON_KEYS, maxCustom: MAX_CUSTOM, season: null,
  }));
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
  const html = enLigne(guidePage({ origin: "https://x", season: "" }));
  assert.ok(html.includes(POSTER_URL.replace(/&/g, "&amp;")) || html.includes(POSTER_URL));
  assert.doesNotMatch(html, /TA_CLE_TMDB|tmdb-key-8|PostersPlus|postersplus/);
});

test("regie_ouvre_depuis_le_guide", () => {
  assert.match(enLigne(guidePage({ origin: "https://x", season: "" })), /https:\/\/x\/configure#regie/);
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
  const tete = NUVIO_JS.split("window.NV = ")[0].replace("function lienAffiches(r, rp) {", "function lienAffiches(r, rp) { __name(lienAffiches, \"lienAffiches\");");
  assert.ok(tete.includes("__name(lienAffiches"));
  const LA = new Function(tete + "; return LA;")();
  assert.equal(LA.lienAffiches(LA.MEMOIRES.essentiel), lienAffiches(MEMOIRES.essentiel));
  assert.throws(() => new Function(tete.replace(/^var __name = [^\n]*\n/, "") + "; return LA.lienAffiches(LA.MEMOIRES.essentiel);")());
});

// La régie : une fenêtre avec la scène (grande affiche + 6 en coulisses) et la console rangée en onglets
// (7 styles tout prêts ; En haut, Titre & infos, Image, Paysage ; une ligne par élément, réglages dépliés dessous).
test("regie_presente", () => {
  const html = salle2();
  for (const id of ["regie", "regie-ouvrir", "regie-grande", "regie-coulisses", "regie-memoires", "regie-onglets", "regie-voies", "regie-copier", "regie-annuler", "regie-fermer", "regie-format"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  for (const m of ["maison", "essentiel", "noteSeule", "cine", "postersPlus", "plateforme", "nue"]) assert.match(html, new RegExp(`data-memoire="${m}"`), m);
  assert.match(html, /id="regie-onglets"[^>]*role="tablist"/);
  for (const o of ["haut", "titre", "infos", "image", "couleurs", "paysage"]) assert.match(html, new RegExp(`role="tab"[^>]*data-onglet="${o}"`), o);
  assert.match(html, /id="regie-voies"[^>]*role="tabpanel"/);
  // Chaque onglet range ses éléments ; tous les réglages ont leur place.
  const debut = html.indexOf("const ONGLETS = ");
  assert.ok(debut > 0, "ONGLETS absent");
  const onglets = html.slice(debut, html.indexOf("};", debut));
  for (const v of ["statut", "tendance", "qualite", "culte", "bandeau", "badges", "titre", "texte", "ligne", "ligne2", "note", "genre", "annee", "duree", "age", "plateforme", "image", "retouche", "fondu", "ambiance", "cadre", "sortie", "c-accent", "c-texte", "c-badges", "c-fondu", "c-cadre"]) {
    assert.match(onglets, new RegExp(`"${v}"`), v);
  }
  // Interrupteurs accessibles ; plus de lampes ni de tiroir du bas.
  assert.match(html, /role: "switch"|role="switch"/);
  assert.doesNotMatch(html, /class="lampe"|id="regie-tiroir"/);
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
  // Échap, depuis tout le document : ferme le panneau « Plus de réglages » s'il est ouvert, sinon la régie.
  assert.ok(html.includes('document.addEventListener("keydown", (e) => {\n  if (e.key !== "Escape" || $("regie").hidden) return;') || html.includes('document.addEventListener("keydown", (e) => {\r\n  if (e.key !== "Escape" || $("regie").hidden) return;'));
  assert.ok(html.includes("regieFerme();"));
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

// Régie v2 : réglages à part pour le paysage, gardés dans ce navigateur et écrits dans le lien (sp).
test("reglages_paysage_a_part", async () => {
  const { NUVIO_JS } = await import("../worker/nuvio.js");
  assert.match(NUVIO_JS, /"affiches-v2-paysage"/);
  assert.match(NUVIO_JS, /LA\.lienAffiches\(reglages\.affiches, reglages\.affichesPaysage\)/);
  // Aperçu en paysage sans réglages donnés : ceux du paysage s'il y en a.
  assert.match(NUVIO_JS, /forme === "landscape" && reglages\.affichesPaysage/);
});

// Les aperçus (/affiche/…) sont gardés un jour par le navigateur : leur adresse porte la version du dessin,
// pour qu'une nouvelle version ne montre jamais une image dessinée par l'ancienne.
test("apercus_versionnes", async () => {
  const { NUVIO_JS } = await import("../worker/nuvio.js");
  const { APERCU_V } = await import("../worker/reglages.js");
  assert.ok(APERCU_V);
  assert.ok(NUVIO_JS.includes(`q.set("v", "${APERCU_V}")`));
});

// Revue : onglets au clavier (flèches, Début, Fin) ; chaque ligne dit quels réglages elle ouvre (aria-controls).
test("regie_accessible_au_clavier", () => {
  const html = salle2();
  assert.match(html, /e\.key === "Home"/);
  assert.match(html, /e\.key === "End"/);
  assert.match(html, /"aria-controls": "corps-" \+ v/);
  assert.match(html, /id: "corps-" \+ v/);
});

// Curseurs de la régie dessinés à la main (piste fine, partie remplie dorée, bouton rond), pas ceux du navigateur.
test("regie_curseurs_dessines", () => {
  const html = salle2();
  assert.match(html, /\.regie-console \.curseur input\[type=range\] \{[^}]*appearance: none/);
  assert.match(html, /\.regie-console \.curseur input\[type=range\]::-webkit-slider-thumb/);
  assert.match(html, /\.regie-console \.curseur input\[type=range\]::-moz-range-thumb/);
  assert.match(html, /setProperty\("--rempli"/);
});

// Régie v3 : styles tout prêts en vignettes (vraies petites affiches), nuancier en pastilles nommées.
test("regie_v3_vignettes_et_nuancier", () => {
  const html = salle2();
  assert.ok(html.includes('data-memoire="cine" aria-label="Style Ciné"><img alt=""><span>Ciné</span>'));
  assert.ok(html.includes("function regieVignettes"));
  assert.ok(html.includes("function nuancier"));
  assert.ok(html.includes("const NOMS_COULEURS = ["));
});

// « Plus de réglages » : un panneau posé par-dessus le bas de la console ; les cartes ne bougent pas (pas de repli,
// pas de vignettes réduites). Échap ferme d'abord le panneau, puis la régie ; le focus va dans le panneau.
test("regie_plus_de_reglages_sans_decalage", () => {
  const html = salle2();
  assert.match(html, /id="regie-plus"/);
  assert.ok(!html.includes("repliee") && !html.includes("reglage-ouvert"));
  assert.ok(html.includes("if (regieVoie) { fermePlus(); return; }"));
  assert.ok(html.includes("regieFocusPlus"));
});

// « Importer un lien » : un petit panneau sous la barre de la régie, un champ, et les réglages du lien collé.
test("regie_importer_un_lien", () => {
  const html = salle2();
  for (const id of ["regie-importer", "regie-import", "regie-import-lien", "regie-import-ok", "regie-import-msg"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.ok(html.includes("LA.reglagesDuLien("));
  assert.match(html, /id="regie-import-msg"[^>]*aria-live="polite"/);
});

// En Paysage, les coulisses (les autres titres, sous la grande image) passent en paysage aussi, avec les réglages du paysage.
test("regie_coulisses_suivent_le_format", () => {
  const html = salle2();
  assert.ok(html.includes("NV.ppSrc(regieTitres[i], regieForme, regieForme === \"landscape\" && regieRP ? regieRP : regieR)"), "coulisses toujours en portrait");
  assert.ok(html.includes("$(\"regie-coulisses\").classList.toggle(\"paysage\", regieForme === \"landscape\")"));
  assert.match(html, /\.regie-coulisses\.paysage img \{[^}]*aspect-ratio: 16 \/ 9/);
});

// QR code du lien d'affiches : le téléphone ouvre /lien avec le lien prêt à copier (il voyage après le #).
test("regie_qr_code", async () => {
  const html = salle2();
  for (const id of ["regie-qr-btn", "regie-qr", "regie-qr-code"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /id="regie-qr-btn"[^>]*aria-controls="regie-qr"/);
  assert.ok(/"\/lien#"\s*\+\s*new URLSearchParams\(\{\s*u:\s*NV\.lienPerso\(\)/.test(html), "QR code vers /lien avec le lien perso");
  // La page /lien reconnaît le service d'affiches (pas d'avertissement « site pas dans le guide ») et dit où le coller.
  const { lienPage } = await import("../worker/lien.js");
  const lien = lienPage({ origin: "https://exemple.workers.dev" });
  assert.ok(lien.includes("affiches-catalogue-fr.vercel.app"));
  assert.ok(lien.includes("Custom Poster Source"));
});
