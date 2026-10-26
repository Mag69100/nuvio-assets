import { test } from "node:test";
import assert from "node:assert/strict";
import { fusionCollections, compteNuvioPage } from "../worker/compte-nuvio.js";

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

test("page_compte_nuvio_script_valide", () => {
  const html = compteNuvioPage({ origin: "https://exemple.workers.dev" });
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(js.length, 1);
  assert.doesNotThrow(() => new Function(js[0]));
  // La session reste dans le navigateur : aucun appel vers ce site avec les jetons, seulement vers Nuvio.
  assert.ok(html.includes("https://api.nuvio.tv/.well-known/nuvio"));
  assert.ok(html.includes("https://nuvio.tv/link"));
  assert.match(html, /<meta name="robots" content="noindex">/);
});
