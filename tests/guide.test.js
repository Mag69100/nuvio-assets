import { test } from "node:test";
import assert from "node:assert/strict";
import { guidePage, NUVIO_TV_APK } from "../worker/guide.js";
import { enLigne } from "./support/en-ligne.mjs";
import { NUVIO_TV_VERSION, NUVIO_JS } from "../worker/nuvio.js";
import { reglagesHTML, texteReglages, POSTER_URL } from "../worker/reglages.js";
import { hallPage } from "../worker/hall.js";
import { copiePage } from "../worker/copie.js";

const O = "https://nuvio-assets.xnzxflix.workers.dev";
const html = enLigne(guidePage({ origin: O, season: "" }));
// Le texte tel que le navigateur l'affiche (entités décodées), pour comparer avec les bulles.
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

test("une_seule_version_de_nuvio_tv", () => {
  // Le guide installe la version que l'aperçu recopie : mêmes liens, même numéro partout.
  assert.ok(NUVIO_TV_APK.includes("/download/" + NUVIO_TV_VERSION + "/"));
  assert.ok(NUVIO_JS.includes('const VERSION_TV = "' + NUVIO_TV_VERSION + '"'));
  const versions = new Set([...html.matchAll(/1\.\d+\.\d+-beta\.\d+/g)].map((m) => m[0]));
  assert.deepEqual([...versions], [NUVIO_TV_VERSION]);
  assert.ok(html.includes(NUVIO_TV_VERSION + " ou plus récente"));
});

test("android_par_l_apk_de_github", () => {
  assert.doesNotMatch(html, /play\.google\.com/);
  assert.ok(html.includes("androidApp-full-arm64-v8a-release.apk"));
});

test("onglets_d_installation_accessibles", () => {
  // TV ouverte au départ, sans deviner l'appareil qui lit le guide.
  assert.doesNotMatch(html, /navigator\.userAgent;\s*const ipad/);
  const onglets = [...html.matchAll(/role="tab" id="tab-([a-z]+)" aria-controls="panel-\1" aria-selected="(true|false)"/g)];
  assert.equal(onglets.length, 6);
  assert.deepEqual(onglets.filter((m) => m[2] === "true").map((m) => m[1]), ["tv"]);
  for (const [, id] of onglets) assert.match(html, new RegExp(`role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}"`));
  assert.ok(html.includes("Où veux-tu installer Nuvio ?"));
  // TV et Fire TV : chacune ses commandes ADB et son message pour Claude.
  for (const id of ["u-claude-tv", "u-claude-fire", "u-adb-tv", "u-adb-fire", "u-tv", "u-fire"]) assert.equal(html.split(`id="${id}"`).length, 2, id);
  assert.ok(html.includes("adb pair"));
  assert.ok(html.includes("Vega OS"));
});

test("chemin_tmdb_unique", () => {
  assert.doesNotMatch(html, /Paramètres → Enrichissement TMDB|<b>Infos<\/b>|→ Infos/);
  assert.ok(html.includes("Paramètres → Intégrations → TMDB"));
});

test("cle_alldebrid_sans_promesse_excessive", () => {
  assert.doesNotMatch(html, /sans être envoyée sur internet|rien n'est envoyé/);
  assert.ok(html.includes('id="oublier-cle"'));
  assert.doesNotMatch(html, /lien-recu/);
});

test("version_texte_de_l_etape_9", () => {
  // Chaque bulle de l'animation (« À adapter », « Pourquoi ») se retrouve dans la version texte.
  const anim = reglagesHTML(POSTER_URL), texte = decode(texteReglages(POSTER_URL));
  assert.ok(anim.includes('<details class="nv-texte">'));
  const bulles = [...anim.matchAll(/data-[an]="([^"]+)"/g)].map((m) => decode(m[1]));
  assert.ok(bulles.length > 30);
  for (const b of bulles) assert.ok(texte.includes(b), b);
  assert.match(texte, /Activer le P2P : <b>désactivé<\/b>/);
  assert.match(texte, /Paramètres → Intégrations<\/p><ul><li>TMDB<ul>/);
});

test("mur_du_hall_cache_si_vide", () => {
  const hall = hallPage({ origin: O, season: null });
  assert.match(hall, /if \(!metas\.length\) \{ sansMur\(\); return; \}/);
  for (const m of hall.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new Function(m[1]));
});

// Lecteur YouTube normal (youtube-nocookie demande souvent « pas un robot ») ; celles qui partent toutes seules
// attendent le premier geste du visiteur.
test("bandes_annonces_apres_un_geste", () => {
  assert.ok(NUVIO_JS.includes('f.src = "https://www.youtube.com/embed/"'));
  assert.doesNotMatch(NUVIO_JS, /youtube-nocookie\.com\/embed/);
  assert.match(NUVIO_JS, /\["pointerdown", "keydown"\]\.forEach\(\(t\) => addEventListener\(t, \(\) => \{ aInteragi = true; \}/);
  assert.ok((NUVIO_JS.match(/aInteragi/g) || []).length >= 3);
});

// Les liens « Salle 2 » du guide n'emportent pas la clé Gemini ; le lien d'addon à installer, si.
test("guide_liens_salle_2_sans_cle", () => {
  assert.ok(html.includes('a.href = sansCle((base || ORIG) + "/configure")'));
  assert.ok(html.includes('$id("u-cat").textContent = (base || ORIG) + "/manifest.json"'));
});

test("copie_variables_cloudflare", () => {
  const c = copiePage({ origin: O });
  for (const t of ["HOTE_SECRET", "DEPOT", "127.0.0.1:8787:8787"]) assert.ok(c.includes(t), t);
});
