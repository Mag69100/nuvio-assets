import { test } from "node:test";
import assert from "node:assert/strict";
import { statutDe, etatSortie } from "../lib/statut.js";

const AUJ = "2026-10-20";
const jours = (n) => new Date(Date.parse(AUJ) + n * 86400000).toISOString().slice(0, 10);
// Dates de sortie TMDB : type 2/3 = salle, 4 = numérique.
const sorties = (...dates) => [{ iso_3166_1: "FR", release_dates: dates.map(([type, d]) => ({ type, release_date: d + "T00:00:00.000Z" })) }];
const pays = (code, ...dates) => ({ iso_3166_1: code, release_dates: dates.map(([type, d]) => ({ type, release_date: d + "T00:00:00.000Z" })) });
const film = (releases, date = "", langue = "en") => ({ type: "movie", releases, releaseDate: date, originalLanguage: langue });

// « Sorti » = disponible chez soi en VF, comme pour les rangées de l'addon : sortie chez soi (numérique, vidéo,
// télé, sinon salle + 45 jours) ET une VF probable (film français, ou sorti en France, Belgique, Suisse,
// Luxembourg ou au Canada).
test("VF : sorti chez soi aux États-Unis seulement → pas sorti, bientôt", () => {
  const e = etatSortie(film([pays("US", [4, jours(-20)])]), AUJ);
  assert.deepEqual(e, { sorti: false, statut: "bientot" });
});

test("VF : film français sorti en numérique → sorti, nouveau", () => {
  assert.deepEqual(etatSortie(film([pays("US", [4, jours(-5)])], "", "fr"), AUJ), { sorti: true, statut: "nouveau" });
});

test("VF : numérique aux États-Unis il y a 40 jours, en France il y a 10 jours → nouveau depuis la VF", () => {
  assert.deepEqual(etatSortie(film([pays("US", [4, jours(-40)]), pays("FR", [4, jours(-10)])]), AUJ), { sorti: true, statut: "nouveau" });
});

test("VF : au cinéma en France, pas encore chez soi → pas sorti, en salle", () => {
  assert.deepEqual(etatSortie(film(sorties([3, jours(-10)])), AUJ), { sorti: false, statut: "salle", quand: { quoi: "dispo", date: jours(35), vers: true } });
});

test("VF : sorti au Québec → VF probable", () => {
  assert.equal(etatSortie(film([pays("US", [4, jours(-60)]), pays("CA", [3, jours(-100)])]), AUJ).sorti, true);
});

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

// Dates TMDB incomplètes : un téléfilm (type 6), un film sorti en DVD (type 5) ou vu seulement en festival
// (type 1) depuis longtemps ne sont pas « Bientôt ».
test("film : seulement à la télé, en vidéo ou en festival, depuis longtemps → rien", () => {
  assert.equal(statutDe(film(sorties([6, "2005-03-01"])), AUJ), null);
  assert.equal(statutDe(film(sorties([5, "2010-06-01"])), AUJ), null);
  assert.equal(statutDe(film(sorties([1, "2015-09-01"])), AUJ), null);
});

test("film : téléfilm diffusé il y a 10 jours → nouveau", () => {
  assert.equal(statutDe(film(sorties([6, jours(-10)])), AUJ), "nouveau");
});

// Un vieux film ressorti en numérique (ou annoncé) n'est ni « Nouveau » ni « En salle ».
test("film : vieux film ressorti → rien", () => {
  assert.equal(statutDe(film(sorties([3, "1995-05-01"], [4, jours(-5)])), AUJ), null);
  assert.equal(statutDe(film(sorties([3, "1995-05-01"], [4, jours(20)])), AUJ), null);
  const vieuxAilleurs = [{ iso_3166_1: "US", release_dates: [{ type: 3, release_date: "1995-05-01T00:00:00.000Z" }] }, { iso_3166_1: "DE", release_dates: [{ type: 4, release_date: jours(20) + "T00:00:00.000Z" }] }];
  assert.equal(statutDe(film(vieuxAilleurs), AUJ), null);
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

// Dates à la place de « Bientôt » et « En salle », comme dans les rangées de l'addon.
test("date : au cinéma en France, numérique annoncé → dispo le", () => {
  const e = etatSortie(film(sorties([3, jours(-10)], [4, jours(20)])), AUJ);
  assert.deepEqual(e, { sorti: false, statut: "salle", quand: { quoi: "dispo", date: jours(20), vers: false } });
});

test("date : au cinéma en France, pas de date numérique → dispo vers salle + 45 jours", () => {
  const e = etatSortie(film(sorties([3, jours(-10)])), AUJ);
  assert.deepEqual(e.quand, { quoi: "dispo", date: jours(35), vers: true });
});

test("date : sortie en salle en France annoncée → au cinéma le", () => {
  assert.deepEqual(etatSortie(film(sorties([3, jours(30)]), jours(30)), AUJ).quand, { quoi: "cinema", date: jours(30), vers: false });
});

test("date : pas de salle en France, numérique annoncé avec VF → dispo le", () => {
  const e = etatSortie(film([pays("US", [4, jours(12)]), pays("FR", [4, jours(12)])]), AUJ);
  assert.deepEqual(e, { sorti: false, statut: "bientot", quand: { quoi: "dispo", date: jours(12), vers: false } });
});

test("date : sortie ailleurs seulement → sortie le, sinon rien", () => {
  assert.deepEqual(etatSortie(film([pays("US", [3, jours(40)])]), AUJ).quand, { quoi: "sortie", date: jours(40), vers: false });
  assert.equal(etatSortie(film([pays("US", [4, jours(-20)])]), AUJ).quand, undefined);
  assert.equal(etatSortie(film([], ""), AUJ).quand, undefined);
});

test("date : série pas encore lancée → sortie le", () => {
  assert.deepEqual(etatSortie(serie(jours(15)), AUJ).quand, { quoi: "sortie", date: jours(15), vers: false });
  assert.equal(etatSortie(serie(""), AUJ).quand, undefined);
});
