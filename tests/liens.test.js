import { test } from "node:test";
import assert from "node:assert/strict";
import { APPAREILS, cleAllDebrid, torrentioUrl, installUrl, sansInstall, basePerso, paquetCles, lirePaquet, LIENS_JS } from "../worker/liens.js";
import { guidePage } from "../worker/guide.js";

const O = "https://nuvio-assets.xnzxflix.workers.dev";
const CLE = "AbCdEf0123456789XyZ";
const seg = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const lire = (base) => JSON.parse(Buffer.from(base.slice(O.length + 1), "base64url").toString());

test("torrentio_lien_complet", () => {
  assert.equal(torrentioUrl(CLE, "fire-hd"),
    "https://torrentio.strem.fun/language=french|qualityfilter=4k,hdrall,brremux,threed,cam,scr|sizefilter=15GB|debridoptions=nocatalog|alldebrid=" + CLE + "/manifest.json");
  assert.equal(torrentioUrl(CLE, "ecran"),
    "https://torrentio.strem.fun/language=french|qualityfilter=threed,cam,scr|debridoptions=nocatalog|alldebrid=" + CLE + "/manifest.json");
});

test("torrentio_rien_sans_cle_ou_appareil", () => {
  assert.equal(torrentioUrl("", "tv"), "");
  assert.equal(torrentioUrl(CLE, ""), "");
  assert.equal(torrentioUrl(CLE, "grille-pain"), "");
  assert.equal(torrentioUrl("trop-court", "tv"), "");   // moins de 15 caractères : Torrentio la refuse
});

test("cle_alldebrid_nettoyee", () => {
  // Espaces, retours à la ligne et caractères qui casseraient l'adresse (| et =) sont retirés.
  assert.equal(cleAllDebrid("  " + CLE + "\n"), CLE);
  assert.equal(cleAllDebrid("Abc|Def=0123456789xy"), "AbcDef0123456789xy");
});

test("chaque_appareil_a_ses_consignes", () => {
  for (const [id, a] of Object.entries(APPAREILS)) {
    for (const champ of ["nom", "qualite", "exclure", "lumio", "streamfusion", "wastream"]) assert.ok(a[champ], id + " : " + champ);
    assert.match(torrentioUrl(CLE, id), /qualityfilter=[a-z0-9,]+[|]/, id);
  }
});

test("box_android_rangees_par_ce_qu_elles_lisent", () => {
  const filtre = (id) => torrentioUrl(CLE, id).match(/qualityfilter=([^|]+)/)[1];
  assert.equal(filtre("box-hd"), filtre("fire-hd"));                 // HD : comme un Fire TV Stick HD
  assert.equal(filtre("box-4k-dv"), filtre("fire-4k"));              // 4K avec Dolby Vision : sans les REMUX
  assert.match(filtre("box-4k"), /^dolbyvision,brremux,/);           // 4K sans Dolby Vision (ou on ne sait pas)
  assert.doesNotMatch(filtre("shield"), /brremux|dolbyvision|4k/);   // Shield : tout passe
  // Le choix de l’appareil du guide propose chaque appareil (une carte), avec ses exemples.
  const html = guidePage({ origin: O, season: "" });
  for (const id of Object.keys(APPAREILS)) assert.ok(html.includes('<input type="radio" name="appareil" value="' + id + '">'), id);
  assert.ok(html.includes("Chromecast avec Google TV 4K"));
});

test("installer_dans_nuvio", () => {
  assert.equal(installUrl(O + "/manifest.json"), "nuvio://nuvio-assets.xnzxflix.workers.dev/manifest.json");
  assert.equal(installUrl(O + "/collections.json"), "");
  assert.equal(installUrl("http://exemple.fr/manifest.json"), "");
  assert.equal(installUrl(""), "");
});

test("lien_perso_de_la_salle_2", () => {
  const c = seg({ r: ["accueil-tendances"], k: "AIzaSyCleGemini0123456789abcdef" });
  assert.equal(basePerso(O + "/" + c + "/configure", O), O + "/" + c);
  assert.equal(basePerso(O + "/configure", O), "");                  // réglages par défaut : rien à reprendre
  assert.equal(basePerso("https://ailleurs.fr/" + c + "/configure", O), "");
  assert.equal(basePerso("pas une adresse", O), "");
});

test("qr_du_guide_garde_le_lien_perso", () => {
  // Les QR du guide passent TON lien de l'ordinateur au téléphone, pour l'installer chez toi : clé Gemini
  // et alertes comprises (seul le billet partagé de la salle 2 les retire).
  const html = guidePage({ origin: O, season: "" });
  assert.doesNotMatch(html, /sansCles/);
  assert.doesNotMatch(html, /dataset\.qr/);
});

test("paquet_de_cles_pour_le_telephone", () => {
  const p = paquetCles({ ad: CLE, tmdb: " 0123456789abcdef0123456789abcdef ", appareil: "fire-4k" });
  assert.deepEqual(p, { ad: CLE, tmdb: "0123456789abcdef0123456789abcdef", app: "fire-4k" });
  assert.deepEqual(lirePaquet(JSON.stringify(p)), p);
  assert.deepEqual(lirePaquet(JSON.stringify({ ad: "court", app: "inconnu", autre: 1 })), {});
  assert.deepEqual(lirePaquet("pas du json"), {});
});

test("code_injecte_valide", () => {
  // Les fonctions recopiées dans la page doivent marcher seules, comme dans le navigateur.
  const f = new Function(LIENS_JS + "; return { torrentioUrl, basePerso, lirePaquet };")();
  assert.equal(f.torrentioUrl(CLE, "tv"), torrentioUrl(CLE, "tv"));
  const c = seg({ r: ["a"], k: "AIzaSyCleGemini0123456789abcdef" });
  assert.equal(f.basePerso(O + "/" + c + "/configure", O), O + "/" + c);
});

test("guide_scripts_valides", () => {
  const html = guidePage({ origin: O, season: "" });
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length >= 4);
  for (const s of scripts) assert.doesNotThrow(() => new Function(s));
  for (const id of ["ad-key", "u-poster", "choix-appareil", "ma-conf", "ca-changer", "u-torrentio", "torrentio-pret", "cles-tel"]) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  assert.ok(html.includes('href="nuvio://nuvio-assets.xnzxflix.workers.dev/manifest.json"'));
});

test("panneau_de_la_cabine", () => {
  // Étape 12 : chaque panne est rangée sous au moins un voyant, et chaque voyant allume au moins une panne.
  const html = guidePage({ origin: O, season: "" });
  const voyants = [...html.matchAll(/class="voyant" data-moment="([a-z]+)"/g)].map((m) => m[1]);
  const pannes = [...html.matchAll(/<details data-moment="([a-z ]+)">/g)].map((m) => m[1].split(" "));
  assert.equal(voyants.length, 5);
  assert.ok(pannes.length >= 10);
  for (const p of pannes) assert.ok(p.every((m) => voyants.includes(m)), p.join(" "));
  for (const v of voyants) assert.ok(pannes.some((p) => p.includes(v)), v);
  for (const id of ["pupitre", "pu-etat", "rembobinage", "rb-fin"]) assert.ok(html.includes('id="' + id + '"'), id);
});

test("installer_sans_stremio_ni_windows", () => {
  // nuvio:// : Stremio ne le prend pas ; sous Windows, Nuvio Desktop n'enregistre aucun lien, donc pas de bouton.
  assert.match(installUrl("https://torrentio.strem.fun/language=french/manifest.json"), /^nuvio:[/][/]torrentio/);
  assert.equal(sansInstall("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141"), true);
  assert.equal(sansInstall("Mozilla/5.0 (Linux; Android 14) Chrome/141 Mobile"), false);
  assert.equal(sansInstall("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), false);
  const html = guidePage({ origin: O, season: "" });
  assert.ok(!html.includes("stremio:"), "plus aucun lien stremio:// dans le guide");
});
