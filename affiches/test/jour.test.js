import { test } from "node:test";
import assert from "node:assert/strict";
import { jourParis, prochainMinuitParis, secondesAvantMinuitParis } from "../lib/jour.js";
import { posterContent } from "../lib/contenu.js";
import { DEFAUT_REGLAGES } from "../lib/lien-affiches.js";

const t = (iso) => Date.parse(iso);

// Le jour change à minuit à Paris : 23 h UTC l'hiver, 22 h UTC l'été.
test("jour_paris_hiver_et_ete", () => {
  assert.equal(jourParis(t("2026-01-15T22:59:00Z")), "2026-01-15");
  assert.equal(jourParis(t("2026-01-15T23:00:00Z")), "2026-01-16");
  assert.equal(jourParis(t("2026-07-15T21:59:00Z")), "2026-07-15");
  assert.equal(jourParis(t("2026-07-15T22:00:00Z")), "2026-07-16");
  // Entre 0 h et 2 h à Paris, le jour UTC est encore la veille.
  assert.equal(jourParis(t("2026-10-20T22:30:00Z")), "2026-10-21");
});

// Changements d'heure (dernier dimanche de mars et d'octobre, à 1 h UTC) : minuit suivant au bon instant.
test("minuit_paris_changements_d_heure", () => {
  const cas = [
    ["2026-03-28T22:30:00Z", "2026-03-28T23:00:00.000Z"],   // samedi soir, encore l'heure d'hiver
    ["2026-03-29T00:30:00Z", "2026-03-29T22:00:00.000Z"],   // la nuit du passage à l'heure d'été
    ["2026-03-29T22:30:00Z", "2026-03-30T22:00:00.000Z"],
    ["2026-10-24T21:30:00Z", "2026-10-24T22:00:00.000Z"],   // samedi soir, encore l'heure d'été
    ["2026-10-24T22:30:00Z", "2026-10-25T23:00:00.000Z"],   // la nuit du passage à l'heure d'hiver
    ["2026-10-25T23:30:00Z", "2026-10-26T23:00:00.000Z"],
  ];
  for (const [maintenant, minuit] of cas) assert.equal(new Date(prochainMinuitParis(t(maintenant))).toISOString(), minuit, maintenant);
  assert.equal(secondesAvantMinuitParis(t("2026-10-21T21:30:00Z")), 1800);
  assert.equal(secondesAvantMinuitParis(t("2026-10-21T21:59:30Z")), 60);   // une minute au moins
});

// « SORTIE DEMAIN » à 23 h à Paris ; à 0 h 30 à Paris (22 h 30 UTC la veille, en été), le film est sorti : « AU CINÉMA ».
test("statut_compte_a_rebours_au_jour_de_paris", () => {
  const facts = { type: "movie", tmdbId: 1, genreIds: [], poster: "/p.jpg", textlessPoster: null, backdrop: "/b.jpg",
    releases: [{ iso_3166_1: "FR", release_dates: [{ type: 3, release_date: "2026-07-16T00:00:00.000Z" }] }], releaseDate: "2026-07-16" };
  const r = { ...DEFAUT_REGLAGES, statut: { ...DEFAUT_REGLAGES.statut, on: true, forme: "compte" } };
  const veille = posterContent(facts, {}, "poster", r, jourParis(t("2026-07-15T21:00:00Z")));
  assert.equal(veille.statut, "SORTIE DEMAIN");
  const jourJ = posterContent(facts, {}, "poster", r, jourParis(t("2026-07-15T22:30:00Z")));
  assert.equal(jourJ.statut, "AU CINÉMA");
});
