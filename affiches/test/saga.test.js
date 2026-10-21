import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { filmsDeLaSaga, rangSaga, resetMemo, tailleMemo } from "../lib/saga.js";

beforeEach(() => resetMemo());

const AUJ = "2026-10-20";
const env = { TMDB_API_KEY: "k" };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status });
// Harry Potter (dans le désordre, comme TMDB peut les donner), plus un film annoncé sans date.
const films = [
  { id: 3, date: "2004-05-31" }, { id: 1, date: "2001-11-16" }, { id: 2, date: "2002-11-13" },
  { id: 4, date: "2005-11-16" }, { id: 5, date: "2007-07-08" }, { id: 9, date: "" },
];

test("rang_parmi_les_films_sortis", () => {
  assert.deepEqual(rangSaga(films, 3, AUJ), { n: 3, t: 5 });
  assert.deepEqual(rangSaga(films, 1, AUJ), { n: 1, t: 5 });
  // Pas dans la saga, sans date, saga d'un seul film, liste illisible : rien.
  assert.equal(rangSaga(films, 42, AUJ), null);
  assert.equal(rangSaga(films, 9, AUJ), null);
  assert.equal(rangSaga([{ id: 1, date: "2001-11-16" }], 1, AUJ), null);
  assert.equal(rangSaga(null, 1, AUJ), null);
});

// Le prochain film, pas encore sorti, compte en plus : « 6/6 » ; un film plus lointain, pas avant lui.
test("film_a_venir", () => {
  const avecSuite = [...films, { id: 6, date: "2026-12-16" }, { id: 7, date: "2028-07-01" }];
  assert.deepEqual(rangSaga(avecSuite, 6, AUJ), { n: 6, t: 6 });
  assert.deepEqual(rangSaga(avecSuite, 7, AUJ), { n: 7, t: 7 });
  assert.deepEqual(rangSaga(avecSuite, 2, AUJ), { n: 2, t: 5 });
  // Le jour de sa sortie, il compte pour tous.
  assert.deepEqual(rangSaga(avecSuite, 2, "2026-12-16"), { n: 2, t: 6 });
});

test("un_appel_par_saga_garde_en_memoire", async () => {
  const calls = [];
  const f = async (u) => { calls.push(String(u)); return json({ id: 1241, parts: [{ id: 671, release_date: "2001-11-16" }, { id: 672, release_date: "2002-11-13" }] }); };
  const a = await filmsDeLaSaga(env, 1241, f);
  const b = await filmsDeLaSaga(env, 1241, f);
  assert.deepEqual(a, [{ id: 671, date: "2001-11-16" }, { id: 672, date: "2002-11-13" }]);
  assert.equal(b, a);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\/collection\/1241\?/);
});

test("echec_et_saga_inconnue", async () => {
  assert.equal(await filmsDeLaSaga(env, 1, async () => json({}, 500)), null);
  assert.equal(await filmsDeLaSaga(env, 2, async () => json({}, 404)), null);
  assert.equal(await filmsDeLaSaga(env, 3, async () => { throw new Error("réseau"); }), null);
  assert.equal(await filmsDeLaSaga(env, 4, async () => json({ parts: "?" })), null);
});

test("memoire_plafonnee", async () => {
  const f = async () => json({ parts: [] });
  for (let i = 0; i < 2010; i++) await filmsDeLaSaga(env, i, f);
  assert.ok(tailleMemo() <= 2000, `taille ${tailleMemo()}`);
});
