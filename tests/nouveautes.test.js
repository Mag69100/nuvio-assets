import { test } from "node:test";
import assert from "node:assert/strict";
import { NOUVEAUTES, jourEnClair, nouveautesPage } from "../worker/nouveautes.js";
import { hallPage } from "../worker/hall.js";

const O = "https://nuvio-assets.xnzxflix.workers.dev";

test("nouveautes_de_la_plus_recente_a_la_plus_ancienne", () => {
  assert.ok(NOUVEAUTES.length > 0);
  for (const n of NOUVEAUTES) {
    assert.match(n.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(n.titre && n.points.length > 0);
  }
  const dates = NOUVEAUTES.map((n) => n.date);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

test("jour_en_clair", () => {
  assert.equal(jourEnClair("2026-10-22"), "22 octobre");
  assert.equal(jourEnClair("2026-11-01"), "1er novembre");
});

test("page_nouveautes", () => {
  const html = nouveautesPage({ origin: O, version: "5.99.0" });
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.ok(html.includes(NOUVEAUTES[0].titre));
  assert.ok(html.includes(`<time datetime="${NOUVEAUTES[0].date}">`));
  assert.ok(html.includes("Version actuelle : 5.99.0"));
  assert.ok(html.includes(`href="${O}/"`));
});

// Le hall montre la dernière nouveauté, sur le site principal comme sur les copies.
test("hall_mene_aux_nouveautes", () => {
  for (const copy of [false, true]) {
    const html = hallPage({ origin: O, season: null, copy });
    assert.ok(html.includes(`href="${O}/nouveautes"`));
    assert.ok(html.includes(NOUVEAUTES[0].titre));
  }
});
