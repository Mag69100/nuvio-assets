import { test } from "node:test";
import assert from "node:assert/strict";
import { fusionCollections, fusionAddons, avecAffiches, compteNuvioPage } from "../worker/compte-nuvio.js";

test("fusion_garde_les_collections_perso", () => {
  // Nuvio remplace toute sa liste par celle du compte : celles de la personne restent, les nôtres sont remplacées.
  const distantes = [{ id: "genres", title: "Genres (ancienne)" }, { id: "a-moi", title: "Mes films" }, { id: "studios" }];
  const nos = [{ id: "plateformes-streaming" }, { id: "genres", title: "Genres" }];
  const ids = ["plateformes-streaming", "genres", "studios"];   // studios : masquée depuis, retirée quand même
  assert.deepEqual(fusionCollections(distantes, nos, ids).map((c) => c.title || c.id),
    ["plateformes-streaming", "Genres", "Mes films"]);
});

test("fusion_compte_vide", () => {
  assert.deepEqual(fusionCollections(null, [{ id: "x" }], ["x"]), [{ id: "x" }]);
  assert.deepEqual(fusionCollections([], [{ id: "x" }], []), [{ id: "x" }]);
});

const O = "https://exemple.workers.dev";

test("fusion_addons_remplace_le_notre_a_sa_place", () => {
  // Nuvio remplace toute sa liste : les addons de la personne restent dans leur ordre, le nôtre prend le nouveau lien.
  const distants = [
    { url: "https://torrentio.strem.fun/manifest.json", sort_order: 1, enabled: true },
    { url: O + "/ancien/manifest.json", sort_order: 0, enabled: false, name: "Catalogue FR" },
    { url: "https://opensubtitles-v3.strem.io/manifest.json", sort_order: 2, enabled: false },
    { url: O + "/doublon/manifest.json", sort_order: 3, enabled: true },
  ];
  assert.deepEqual(fusionAddons(distants, O + "/fNouveau/manifest.json", O), [
    { url: O + "/fNouveau/manifest.json", sort_order: 0, enabled: true, name: "Catalogue FR" },
    { url: "https://torrentio.strem.fun/manifest.json", sort_order: 1, enabled: true },
    { url: "https://opensubtitles-v3.strem.io/manifest.json", sort_order: 2, enabled: false },
  ]);
});

test("fusion_addons_sans_le_notre_en_tete", () => {
  assert.deepEqual(fusionAddons([{ url: "https://torrentio.strem.fun/manifest.json", sort_order: 0, enabled: true }], O + "/manifest.json", O),
    [{ url: O + "/manifest.json", sort_order: 0, enabled: true }, { url: "https://torrentio.strem.fun/manifest.json", sort_order: 1, enabled: true }]);
  assert.deepEqual(fusionAddons(null, O + "/manifest.json", O), [{ url: O + "/manifest.json", sort_order: 0, enabled: true }]);
});

test("affiches_dans_les_reglages_tv", () => {
  const lien = "https://affiches.exemple/maison/{type}/{shape}/{id}.jpg";
  const avant = { version: 1, features: { theme_settings: { t: { type: "string", value: "x" } },
    layout_settings: { poster_shape: { type: "string", value: "l" }, custom_poster_url_pattern: { type: "string", value: "ancien" } } } };
  const apres = avecAffiches(avant, lien);
  // Tout le reste est renvoyé tel quel : Nuvio efface chaque rubrique reçue avant de l'appliquer.
  assert.deepEqual(apres.features.theme_settings, avant.features.theme_settings);
  assert.deepEqual(apres.features.layout_settings.poster_shape, { type: "string", value: "l" });
  assert.deepEqual(apres.features.layout_settings.custom_poster_url_pattern, { type: "string", value: lien });
  assert.equal(avant.features.layout_settings.custom_poster_url_pattern.value, "ancien");   // pas modifié en place
  // Pas de réglages TV dans le compte : rien (en créer effacerait ceux de la TV).
  assert.equal(avecAffiches(null, lien), null);
  assert.equal(avecAffiches({}, lien), null);
});

test("page_compte_nuvio_script_valide", () => {
  const html = compteNuvioPage({ origin: "https://exemple.workers.dev" });
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(js.length, 1);
  assert.doesNotThrow(() => new Function(js[0]));
  // La session reste dans le navigateur : aucun appel vers ce site avec les jetons, seulement vers Nuvio.
  assert.ok(html.includes("https://api.nuvio.tv/.well-known/nuvio"));
  assert.ok(html.includes("https://nuvio.tv/link"));
  // Lien d'addon repris de la salle 2 (dernière programmation), jamais sans la clé Gemini gardée.
  assert.ok(html.includes('lu("derniere-programmation")'));
  assert.ok(html.includes('lu("cle-gemini")'));
  assert.match(html, /<meta name="robots" content="noindex">/);
});

test("bouton_tout_envoyer_billet_et_guide", async () => {
  // Le billet et l'étape 7 ouvrent la page avec leurs liens dans l'ancre (jamais envoyée au serveur).
  const { SALLE2_JS } = await import("../worker/page.js");
  const { GUIDE_JS, guidePage } = await import("../worker/guide.js");
  assert.match(SALLE2_JS, /"[/]compte-nuvio#" \+ new URLSearchParams\(\{ lien: \$\("u-manifest"\)/);
  assert.match(GUIDE_JS, /"[/]compte-nuvio#" \+ new URLSearchParams\(\{ lien: \$id\("u-cat"\)/);
  assert.match(guidePage({ origin: O }), /data-compte-nuvio/);
});
