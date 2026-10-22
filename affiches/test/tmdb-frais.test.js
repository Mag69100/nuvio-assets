import { test } from "node:test";
import assert from "node:assert/strict";
import { titleFacts } from "../lib/tmdb.js";

// La fiche TMDB est demandée avec l'heure (paramètre frais) : jamais une copie de leur CDN de plus d'une heure, qui
// pouvait ignorer une plateforme française arrivée depuis (une série doublée restait grise, « BIENTÔT »).
test("fiche_tmdb_de_moins_d_une_heure", async () => {
  const vus = [];
  const fetchImpl = async (u) => { vus.push(new URL(String(u))); return new Response(JSON.stringify({ id: 1, name: "X", first_air_date: "2026-10-20" })); };
  await titleFacts({ TMDB_API_KEY: "k" }, { type: "series", id: "tmdb:1" }, fetchImpl);
  const fiche = vus.find((u) => u.pathname.endsWith("/tv/1"));
  assert.ok(fiche, "fiche demandée");
  assert.equal(fiche.searchParams.get("frais"), new Date().toISOString().slice(0, 13));
});
