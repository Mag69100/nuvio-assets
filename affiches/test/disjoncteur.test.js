import { test } from "node:test";
import assert from "node:assert/strict";
import { creerDisjoncteur, disjoncteurDe } from "../lib/disjoncteur.js";

test("disjoncteur_fenetres_glissantes", () => {
  let now = 0;
  const d = creerDisjoncteur([[60000, 3], [3600000, 5]], () => now);
  for (let i = 0; i < 3; i++) { assert.equal(d.plein(), false, `dessin ${i}`); d.compte(); now += 1000; }
  assert.equal(d.plein(), true, "3 dessins dans la minute");
  // Une minute après le premier : une place se libère dans la minute.
  now = 60001;
  assert.equal(d.plein(), false);
  d.compte(); d.compte();
  // 5 dans l'heure : plein, même plusieurs minutes plus tard.
  now = 10 * 60000;
  assert.equal(d.plein(), true);
  // Une heure après : tout est oublié.
  now = 2 * 3600000;
  assert.equal(d.plein(), false);
});

test("disjoncteur_limites_reglables", () => {
  const un = disjoncteurDe({ RENDUS_MINUTE: "1" });
  assert.equal(un.plein(), false);
  un.compte();
  assert.equal(un.plein(), true);
  // Valeur illisible : la limite par défaut (60 par minute).
  const defaut = disjoncteurDe({ RENDUS_MINUTE: "abc" });
  for (let i = 0; i < 59; i++) defaut.compte();
  assert.equal(defaut.plein(), false);
  defaut.compte();
  assert.equal(defaut.plein(), true);
});
