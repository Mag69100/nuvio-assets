import { test } from "node:test";
import assert from "node:assert/strict";
import { configurePage } from "../worker/page.js";
import { hallPage } from "../worker/hall.js";
import { STAGE_JS } from "../worker/stage.js";
import { defaults, decodeConfig, PROVIDERS, REGIONS, GENRES, LANGUAGES, SORTS, SEASON_KEYS, MAX_CUSTOM, COLLECTIONS } from "../worker/config.js";

const rows = [{ id: "a", home: true, name: "A", type: "movie" }];
const KEY = "AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q";
const page = (copy = false) => configurePage({ copy,
  origin: "https://x", cfg: decodeConfig(Buffer.from(JSON.stringify({ k: KEY })).toString("base64url"), rows, []), rows, discover: [],
  providers: PROVIDERS, collections: COLLECTIONS.map((c) => ({ ...c, pos: 0, folders: [] })), defaults: defaults(rows, []),
  regions: REGIONS, genres: GENRES, languages: LANGUAGES, sorts: SORTS, seasons: SEASON_KEYS, maxCustom: MAX_CUSTOM, season: null,
});

// Le billet se partage (bouton « Offrir », image du billet) : jamais avec la clé Gemini de l'utilisateur.
// Le QR « Continuer sur le téléphone », lui, sert à ses propres appareils : il emporte la clé (avec un avertissement).
test("partage_sans_cle", () => {
  const html = page();
  assert.match(html, /const shared = compact\(\{ \.\.\.state, k: "", al: "" \}\);\s*shareUrl = D\.origin \+ .*enc\(shared\)/);
  // Offrir : partage et copie avec l'adresse sans clé.
  assert.match(html, /url: shareUrl \}/);
  assert.match(html, /writeText\(shareUrl\)/);
  assert.doesNotMatch(html, /url: configureUrl/);
  assert.doesNotMatch(html, /writeText\(configureUrl\)/);
  // Image du billet : son QR code est fait avec l'adresse sans clé, et seulement elle.
  const image = html.slice(html.indexOf('$("img-btn")'), html.indexOf("const tk = "));
  assert.match(image, /addData\(shareUrl\)/);
  assert.equal((image.match(/addData\(/g) || []).length, 1);
  // QR pour ses appareils : la clé voyage, et le texte le dit.
  assert.match(html, /addData\(fixe && fixe\.modif \? lienModif\(\) : configureUrl\)/);
  assert.match(html, /ta clé Gemini comprise[^<]*ne le montre à personne d'autre/);
});

// La clé Gemini n'est plus dans la barre d'adresse : rangée sur l'appareil, reprise au rechargement.
test("cle_hors_de_la_barre_d_adresse", () => {
  const html = page();
  assert.match(html, /const sansCle = compact\(\{ \.\.\.state, k: "" \}\);/);
  assert.match(html, /history\.replaceState\(null, "", affichee\)/);
  assert.doesNotMatch(html, /replaceState\(null, "", configureUrl\)/);
  assert.match(html, /if \(!fixe\) \{ if \(state\.k\) cleGarde\(state\.k\); else state\.k = cleLue\(\); \}/);
});

// Les liens « Salle 2 » du site (scene.js) reprennent la programmation de l'onglet, mais sans la clé Gemini.
test("liens_salle_2_sans_cle", () => {
  const src = /const sansCle = \(href\) => \{[\s\S]*?\n  \};/.exec(STAGE_JS)[0];
  const sansCle = new Function(src + "\nreturn sansCle;")();
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const seg = /^https:\/\/x\/([^/]+)\/configure$/.exec(sansCle("https://x/" + b64({ n: "Ma télé", k: KEY, m: 7 }) + "/configure"))[1];
  assert.deepEqual(JSON.parse(Buffer.from(seg, "base64url").toString()), { n: "Ma télé", m: 7 });
  assert.equal(sansCle("https://x/" + b64({ k: KEY }) + "/configure"), "https://x/configure");
  const sans = "https://x/" + b64({ m: 7 }) + "/configure";
  assert.equal(sansCle(sans), sans);
  assert.equal(sansCle("https://x/fAbc123/configure"), "https://x/fAbc123/configure");
  assert.equal(sansCle("https://x/configure"), "https://x/configure");
});

// L'indication sous le champ accepte les mêmes clés que le serveur (nouveau format « AQ.… » compris).
test("indication_meme_format_que_serveur", () => {
  assert.ok(page().includes("/^[A-Za-z0-9._~+/=:-]{20,200}$/.test(k)"));
});

// Pas de champ « mot de passe » : Chrome proposerait d'enregistrer la clé. Elle est masquée en CSS.
test("cle_masquee_sans_champ_mot_de_passe", () => {
  const html = page();
  assert.doesNotMatch(html, /type="password"/);
  assert.match(html, /<input type="text" id="ai-key" class="plain masque"/);
  assert.match(html, /-webkit-text-security: disc/);
});

// Espace hébergeur et bandeau de mise à jour : seulement sur une copie, jamais sur la source.
test("espace_hebergeur_sur_une_copie", () => {
  const html = page(true);
  assert.match(html, /id="s-hote"/);
  assert.match(html, /href="#s-hote"/);
  assert.match(html, /\/hote\/connexion/);
});

test("pas_d_espace_hebergeur_sur_la_source", () => {
  const html = page(false);
  assert.doesNotMatch(html, /s-hote/);
  assert.doesNotMatch(html, /\/hote\//);
});

test("bandeau_du_hall", () => {
  assert.match(hallPage({ origin: "https://copie.exemple", season: null, copy: true }), /\/hote\/etat/);
  assert.doesNotMatch(hallPage({ origin: "https://x", season: null, copy: false }), /\/hote\//);
});

// Le billet partagé n'emporte pas non plus le jeton d'alerte de l'hébergeur.
test("partage_sans_jeton_alerte", () => {
  assert.match(page(true), /const shared = compact\(\{ \.\.\.state, k: "", al: "" \}\);/);
});

// L'espace hébergeur explique quoi faire sans mot de passe, et quand GitHub ne répond pas.
test("espace_hebergeur_messages", () => {
  const html = page(true);
  assert.match(html, /hote\.motDePasse === false/);
  assert.match(html, /hote\.verification === "impossible"/);
  assert.match(html, /r\.status === 429/);
});

// Bouton « ouvrir dans Nuvio » : seulement pour un lien https (une copie Docker en http, à la maison,
// ouvrirait le fichier manifest.json dans le navigateur).
test("ouvrir_dans_nuvio_seulement_en_https", () => {
  assert.match(page(), /\$\("open-app"\)\.hidden = !\/\^https:\/\.test\(manifest\) \|\| \/Windows\/\.test\(navigator\.userAgent\);/);
});

// Dans le guide, la salle 2 masque des sections (#s-mode) : la navigation ne doit jamais allumer leur lien.
test("navigation_ignore_les_sections_masquees", () => {
  const html = page();
  assert.match(html, /const visible = \(sec\) => sec && sec\.getClientRects\(\)\.length > 0;/);
  assert.match(html, /if \(visible\(sec\) && sec\.getBoundingClientRect\(\)\.top <= line\) cur = i;/);
});

// Salle 2, section IA : sur la source, une ligne mène à la page « Monte ta propre salle ».
test("salle_2_mene_a_la_page_copie_seulement_sur_la_source", () => {
  assert.ok(page(false).includes('href="https://x/copie"'));
  assert.ok(!page(true).includes('/copie"'));
});
