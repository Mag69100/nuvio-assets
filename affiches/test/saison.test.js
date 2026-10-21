import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { saisonDu, prochainChangement, secondesAvantChangementSaison, lireSaison, habillageDe, resetMemo } from "../lib/saison.js";
import { calqueSaison } from "../lib/habillage.js";
import sharp from "sharp";

beforeEach(() => resetMemo());

const json = (o, status = 200) => new Response(JSON.stringify(o), { status });

// Même calendrier que la rangée de l'addon (pickSeason) ; un test du dépôt compare les deux jour par jour.
test("calendrier_des_fetes", () => {
  assert.equal(saisonDu("2026-10-01"), "halloween");
  assert.equal(saisonDu("2026-11-02"), "halloween");
  assert.equal(saisonDu("2026-11-03"), null);
  assert.equal(saisonDu("2026-11-20"), "noel");
  assert.equal(saisonDu("2027-01-06"), "noel");
  assert.equal(saisonDu("2027-02-14"), "saint-valentin");
  assert.equal(saisonDu("2027-03-28"), "paques");   // dimanche de Pâques 2027
  assert.equal(saisonDu("2027-03-12"), null);
  assert.equal(saisonDu("2027-07-14"), "ete");
  assert.equal(saisonDu("2027-09-15"), null);
});

test("prochain_changement", () => {
  assert.equal(prochainChangement("2026-10-21"), "2026-11-03");
  assert.equal(prochainChangement("2026-11-05"), "2026-11-20");
  assert.equal(prochainChangement("2026-12-24"), "2027-01-07");
  // 21 h 30 UTC le 2 novembre (22 h 30 à Paris, heure d'hiver) : Halloween finit à minuit, dans 1 h 30.
  assert.equal(secondesAvantChangementSaison(Date.parse("2026-11-02T21:30:00Z")), 5400);
});

test("rangee_lue_chez_l_addon_gardee_3_h", async () => {
  const calls = [];
  const f = async (u) => { calls.push(String(u)); return json({ saison: "halloween", ids: [493922, 4232, "x"] }); };
  const a = await lireSaison({}, f);
  assert.equal(a.saison, "halloween");
  assert.deepEqual([...a.ids], [493922, 4232]);
  assert.equal(await lireSaison({}, f), a);
  assert.deepEqual(calls, ["https://nuvio-assets.xnzxflix.workers.dev/saison.json"]);
  resetMemo();
  await lireSaison({ ADDON_URL: "http://127.0.0.1:8787" }, f);
  assert.equal(calls[1], "http://127.0.0.1:8787/saison.json");
});

test("rangee_illisible", async () => {
  assert.equal(await lireSaison({}, async () => json({}, 503)), null);
  resetMemo();
  assert.equal(await lireSaison({}, async () => { throw new Error("réseau"); }), null);
  resetMemo();
  assert.equal(await lireSaison({}, async () => json({ saison: "carnaval", ids: [1] })), null);
  resetMemo();
  assert.equal(await lireSaison({}, async () => json({ saison: "halloween", ids: "1" })), null);
  resetMemo();
  // Hors fête : une liste vide, lisible.
  assert.deepEqual([...(await lireSaison({}, async () => json({ saison: null, ids: [] }))).ids], []);
});

test("habille_seulement_les_films_de_la_rangee_de_la_fete_du_jour", () => {
  const rangee = { saison: "halloween", ids: new Set([493922]) };
  assert.equal(habillageDe(rangee, 493922, "2026-10-21"), "halloween");
  assert.equal(habillageDe(rangee, 4232, "2026-10-21"), null);
  // Liste d'hier (Halloween) lue le premier jour d'une autre fête, ou hors fête : rien.
  assert.equal(habillageDe(rangee, 493922, "2026-11-20"), null);
  assert.equal(habillageDe(rangee, 493922, "2026-11-10"), null);
  assert.equal(habillageDe(null, 493922, "2026-10-21"), null);
});

// Chaque fête se dessine, en portrait et en paysage ; une fête inconnue, rien.
test("calque_de_chaque_fete", async () => {
  for (const fete of ["halloween", "noel", "saint-valentin", "paques", "ete"]) {
    for (const taille of [[400, 600], [800, 450]]) {
      for (const libres of [["hd", "hg"], ["hg"], []]) {
        const m = await sharp(calqueSaison(fete, taille, libres)).metadata();
        assert.deepEqual([m.width, m.height], taille, fete);
      }
    }
  }
  assert.equal(calqueSaison("carnaval", [400, 600]), null);
});
