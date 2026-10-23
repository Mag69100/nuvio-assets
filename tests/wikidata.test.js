import { test } from "node:test";
import assert from "node:assert/strict";
import { referencesDe } from "../worker/wikidata.js";

// Lignes SPARQL réduites (relevées le 2026-10-23) : ?item ?isl (pages Wikipédia) ?tv ?film ?pers ?w ?wtv ?wfilm ?sl.
const v = (x) => (x === undefined ? undefined : { value: String(x) });
const ligne = (item, o = {}) => Object.fromEntries(Object.entries({ item: `http://www.wikidata.org/entity/${item}`, isl: o.isl, tv: o.tv, film: o.film,
  pers: o.pers, w: o.w && `http://www.wikidata.org/entity/${o.w}`, wtv: o.wtv, wfilm: o.wfilm, sl: o.sl }).filter(([, x]) => x !== undefined).map(([k, x]) => [k, v(x)]));

test("personnage_vers_ses_oeuvres", () => {
  // Walter White : Breaking Bad, Better Call Saul, El Camino, les plus connus d'abord ; un roman sans identifiant TMDB ignoré.
  const lignes = [ligne("Q23554", { isl: 40, w: "Q1079", wtv: 1396, sl: 120 }), ligne("Q23554", { isl: 40, w: "Q14925221", wtv: 60059, sl: 60 }),
    ligne("Q23554", { isl: 40, w: "Q61741521", wfilm: 559969, sl: 40 }), ligne("Q23554", { isl: 40, w: "Q5508087" })];
  assert.deepEqual(referencesDe([{ id: "Q23554", nom: "Walter White" }], lignes).map((r) => [r.type, r.id]),
    [["tv", 1396], ["tv", 60059], ["movie", 559969]]);
});

test("le_plus_connu_l_emporte", () => {
  // « belmondo » : le nom de famille (sans identifiant TMDB), un documentaire, puis Jean-Paul Belmondo (110 pages).
  const lignes = [ligne("Q21508643", { isl: 12 }), ligne("Q2895003", { isl: 2, film: 444269 }), ligne("Q106255", { isl: 110, pers: 3829 })];
  const elements = [{ id: "Q21508643", nom: "Belmondo" }, { id: "Q2895003", nom: "Belmondo, itinéraire d'un acteur" }, { id: "Q106255", nom: "Jean-Paul Belmondo" }];
  assert.deepEqual(referencesDe(elements, lignes), [{ type: "person", id: 3829, nom: "Jean-Paul Belmondo" }]);
  // « got » : Le Trône de fer d'abord (alias GOT), puis les autres œuvres ; pas une personne après une œuvre.
  const got = [ligne("Q23572", { isl: 100, tv: 1399 }), ligne("Q556444", { isl: 40, tv: 11370 }), ligne("Q1", { isl: 30, pers: 5 })];
  assert.deepEqual(referencesDe([{ id: "Q556444", nom: "Britain's Got Talent" }, { id: "Q23572", nom: "Le Trône de fer" }, { id: "Q1", nom: "Got" }], got).map((r) => r.id),
    [1399, 11370]);
});

test("rien_qui_mene_a_tmdb", () => {
  assert.deepEqual(referencesDe([{ id: "Q5", nom: "Inseption" }], [ligne("Q5", { isl: 3 })]), []);
  assert.deepEqual(referencesDe([], []), []);
});
