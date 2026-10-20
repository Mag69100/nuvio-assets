import { test } from "node:test";
import assert from "node:assert/strict";
import { statutDe } from "../lib/statut.js";

const AUJ = "2026-10-20";
const jours = (n) => new Date(Date.parse(AUJ) + n * 86400000).toISOString().slice(0, 10);
// Dates de sortie TMDB : type 2/3 = salle, 4 = numérique.
const sorties = (...dates) => [{ iso_3166_1: "FR", release_dates: dates.map(([type, d]) => ({ type, release_date: d + "T00:00:00.000Z" })) }];
const film = (releases, date = "") => ({ type: "movie", releases, releaseDate: date });

test("film : rien de sorti → bientôt", () => {
  assert.equal(statutDe(film(sorties([3, jours(30)]), jours(30)), AUJ), "bientot");
});

// Le statut se lit côté France : sorti au Japon mais pas encore en salle en France, ni en numérique → bientôt.
test("film : sorti ailleurs, pas encore en France → bientôt", () => {
  const releases = [
    { iso_3166_1: "JP", release_dates: [{ type: 3, release_date: jours(-20) + "T00:00:00.000Z" }] },
    { iso_3166_1: "FR", release_dates: [{ type: 3, release_date: jours(30) + "T00:00:00.000Z" }] },
  ];
  assert.equal(statutDe(film(releases), AUJ), "bientot");
});

test("film : aucune date du tout → bientôt", () => {
  assert.equal(statutDe(film([], ""), AUJ), "bientot");
});

test("film : au cinéma depuis 10 jours, pas encore chez soi → en salle", () => {
  assert.equal(statutDe(film(sorties([3, jours(-10)])), AUJ), "salle");
});

test("film : salle il y a 50 jours → numérique estimé à J−5 → nouveau", () => {
  assert.equal(statutDe(film(sorties([3, jours(-50)])), AUJ), "nouveau");
});

test("film : numérique annoncé dans le futur → encore en salle", () => {
  assert.equal(statutDe(film(sorties([3, jours(-60)], [4, jours(10)])), AUJ), "salle");
});

test("film : numérique il y a 40 jours → rien", () => {
  assert.equal(statutDe(film(sorties([3, jours(-90)], [4, jours(-40)])), AUJ), null);
});

test("film : numérique il y a 12 jours → nouveau", () => {
  assert.equal(statutDe(film(sorties([4, jours(-12)])), AUJ), "nouveau");
});

test("film : pas de dates TMDB mais sorti d'après sa fiche → rien", () => {
  assert.equal(statutDe(film([], "2010-05-01"), AUJ), null);
});

const serie = (firstAir, seasons = []) => ({ type: "series", firstAir, seasons });

test("série : première diffusion dans le futur → bientôt", () => {
  assert.equal(statutDe(serie(jours(15)), AUJ), "bientot");
  assert.equal(statutDe(serie(""), AUJ), "bientot");
});

test("série : lancée il y a 10 jours → nouveau", () => {
  assert.equal(statutDe(serie(jours(-10), [{ season_number: 1, air_date: jours(-10) }]), AUJ), "nouveau");
});

test("série : saison 3 il y a 5 jours → nouvelle saison", () => {
  const s = [{ season_number: 0, air_date: jours(-2) }, { season_number: 1, air_date: "2020-01-01" }, { season_number: 3, air_date: jours(-5) }];
  assert.equal(statutDe(serie("2020-01-01", s), AUJ), "saison");
});

test("série : dernière saison il y a un an → rien", () => {
  assert.equal(statutDe(serie("2020-01-01", [{ season_number: 2, air_date: jours(-365) }]), AUJ), null);
});
