import { test } from "node:test";
import assert from "node:assert/strict";
import { statutDe, etatSortie, suiteSerie, libelleSuite } from "../lib/statut.js";

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

// « Bad Apples » : avant-première en festival il y a plus d'un an (type 1), vraie sortie le mois dernier, pas en
// France : pas un vieux film, donc pas sorti. Une avant-première seule, très ancienne (jamais sorti) : vieux film.
test("film : avant-première ancienne, sortie récente hors de France → pas sorti", () => {
  const f = film([pays("CA", [1, jours(-410)]), pays("DE", [3, jours(-40)]), pays("US", [1, jours(-360)], [2, jours(-33)])], jours(-40));
  assert.equal(etatSortie(f, AUJ).sorti, false);
  assert.equal(etatSortie(film([pays("CA", [1, jours(-900)])], jours(-900)), AUJ).sorti, true);
});

// « On va s'arrêter là » (Netflix) : sorti partout en streaming, sur Netflix France, mais aucune date
// francophone chez TMDB. Sur une plateforme en France = VF disponible.
test("VF : sur une plateforme en France sans date francophone → sorti", () => {
  const f = { ...film([pays("AR", [1, jours(-12)], [4, jours(-4)]), pays("US", [4, jours(-4)])], jours(-12), "es"), plateformeFrance: true };
  assert.deepEqual(etatSortie(f, AUJ), { sorti: true, statut: "nouveau" });
  assert.equal(etatSortie({ ...f, plateformeFrance: false }, AUJ).sorti, false);
  // Sans aucune date de sortie chez soi connue : disponible quand même (elle y est).
  assert.equal(etatSortie({ ...film([pays("AR", [1, jours(-12)])], jours(-12), "es"), plateformeFrance: true }, AUJ).sorti, true);
  // Plus tard en France qu'ailleurs : « Nouveau » compté depuis la date française.
  const tard = { ...film([pays("US", [4, jours(-40)]), pays("FR", [4, jours(-10)])]), plateformeFrance: true };
  assert.deepEqual(etatSortie(tard, AUJ), { sorti: true, statut: "nouveau" });
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

// Bad Apples : déjà au cinéma en Allemagne, prochaine sortie en Australie dans un mois. Pas « SORTIE LE » (la date
// d'un autre pays), mais l'arrivée chez soi estimée (salle + 45 jours), comme la rangée « Bientôt dispo ».
test("date : déjà sorti en salle ailleurs → dispo vers, pas la sortie d'un autre pays", () => {
  assert.deepEqual(etatSortie(film([pays("DE", [3, jours(-41)]), pays("AU", [3, jours(29)])]), AUJ).quand, { quoi: "dispo", date: jours(4), vers: true });
  // Arrivée chez soi annoncée : sa date.
  assert.deepEqual(etatSortie(film([pays("DE", [3, jours(-41)], [4, jours(9)]), pays("AU", [3, jours(29)])]), AUJ).quand, { quoi: "dispo", date: jours(9), vers: false });
});

test("date : série pas encore lancée → sortie le", () => {
  assert.deepEqual(etatSortie(serie(jours(15)), AUJ).quand, { quoi: "sortie", date: jours(15), vers: false });
  assert.equal(etatSortie(serie(""), AUJ).quand, undefined);
});

// Les sources décident (titre de moins d'un an) : ce qu'on obtient en faisant « Lire ». Les dates ne servent plus
// que si Torrentio n'a pas répondu (sources null).
test("sources : la VF trouvée décide pour un film récent", () => {
  // Oasis : au cinéma en France, sortie chez soi aux États-Unis ; les dates disent « dispo », les sources non.
  const oasis = film([pays("FR", [3, jours(-42)]), pays("US", [3, jours(-40)], [4, jours(-12)])]);
  assert.equal(etatSortie(oasis, AUJ).sorti, true);
  assert.deepEqual(etatSortie(oasis, AUJ, { vf: false, sources: 20 }), { sorti: false, statut: "salle" });
  // Bad Apples : aucune date francophone, mais des sources VF.
  assert.deepEqual(etatSortie(film([pays("DE", [3, jours(-41)])]), AUJ, { vf: true, sources: 36 }), { sorti: true, statut: "nouveau" });
  // Sorti en VO seulement, pas au cinéma en France : pas sorti (seule la VF compte), « Bientôt » sans date.
  const vo = film([pays("US", [3, jours(-60)], [4, jours(-20)]), pays("CA", [3, jours(-59)])]);
  assert.deepEqual(etatSortie(vo, AUJ, { vf: false, sources: 30 }), { sorti: false, statut: "bientot" });
  // Aucune source du tout : pas dispo.
  assert.equal(etatSortie(vo, AUJ, { vf: false, sources: 0 }).statut, "bientot");
  // Sources inconnues (Torrentio en panne, ancienne réponse) : les dates.
  assert.deepEqual(etatSortie(vo, AUJ, null), etatSortie(vo, AUJ));
  assert.deepEqual(etatSortie(vo, AUJ, { vf: null, sources: null }), etatSortie(vo, AUJ));
  // Vieux film : les sources ne changent rien.
  assert.deepEqual(etatSortie(film([pays("US", [3, jours(-800)])]), AUJ, { vf: false, sources: 5 }), { sorti: true, statut: null });
});

test("sources : série récente sans VF → pas sortie", () => {
  const s = { ...serie(jours(-10), [{ season_number: 1, air_date: jours(-10) }]), lastEpisode: jours(-3), lastSeason: 1 };
  assert.deepEqual(etatSortie(s, AUJ, { vf: false, sources: 14 }), { sorti: false, statut: "bientot" });
  // Sur une plateforme en France qui la double : rien ne change.
  assert.deepEqual(etatSortie({ ...s, plateformeFrance: true }, AUJ, { vf: false, sources: 14 }), { sorti: true, statut: "nouveau" });
  // One Piece : la saison 23 pas encore en VF, mais les saisons d'avant oui : sortie, « Saison 23 bientôt ».
  const onePiece = { ...serie("1999-10-20", [{ season_number: 22, air_date: "2025-01-05" }, { season_number: 23, air_date: jours(-12) }]), lastEpisode: jours(-2), lastSeason: 23 };
  assert.equal(etatSortie(onePiece, AUJ).statut, "saison");
  assert.deepEqual(etatSortie(onePiece, AUJ, { vf: false, sources: 35 }), { sorti: true, statut: "saisonvf", saison: 23 });
  assert.deepEqual(etatSortie({ ...onePiece, plateformeFrance: true }, AUJ, { vf: false, sources: 35 }), { sorti: true, statut: "saisonvf", saison: 23 });
  assert.deepEqual(etatSortie(s, AUJ, { vf: true, sources: 14 }), { sorti: true, statut: "nouveau" });
  // Aucune source : rien ne change (pas de quoi juger).
  assert.deepEqual(etatSortie(s, AUJ, { vf: false, sources: 0 }), { sorti: true, statut: "nouveau" });
  // Vieille série (dernier épisode il y a plus d'un an) : rien ne change.
  const vieille = { ...serie("2018-01-01"), lastEpisode: "2019-05-01" };
  assert.deepEqual(etatSortie(vieille, AUJ, { vf: false, sources: 14 }), etatSortie(vieille, AUJ));
});

// 3670 : projeté en festival et sorti en Corée il y a plus d'un an, sortie au cinéma en France dans un mois : pas un
// vieux film (« SORTIE LE … »). Une vraie reprise d'un vieux film (Quand la mer monte, 2004) reste un vieux film.
test("vieux film : pas avec une sortie en France à venir, sauf vraie reprise", () => {
  const f3670 = film([pays("KR", [1, jours(-540)], [3, jours(-413)]), pays("FR", [1, jours(-357)], [3, jours(28)])], "", "ko");
  assert.deepEqual(etatSortie(f3670, AUJ), { sorti: false, statut: "bientot", quand: { quoi: "cinema", date: jours(28), vers: false } });
  assert.equal(etatSortie(film([pays("FR", [3, "2004-10-27"], [3, jours(28)])], "", "fr"), AUJ).sorti, true);
});

test("sources_utiles : seulement pour un titre récent", async () => {
  const { sourcesUtiles } = await import("../lib/statut.js");
  assert.equal(sourcesUtiles(film([pays("US", [4, jours(-20)])]), AUJ), true);
  assert.equal(sourcesUtiles(film([pays("US", [3, jours(-800)])]), AUJ), false);
  assert.equal(sourcesUtiles(film([pays("FR", [3, jours(30)])], jours(30)), AUJ), false);
  assert.equal(sourcesUtiles(film([], "2024-01-01"), AUJ), false);
  assert.equal(sourcesUtiles({ ...serie(jours(-10)), lastEpisode: jours(-3) }, AUJ), true);
  assert.equal(sourcesUtiles({ ...serie("2018-01-01"), lastEpisode: "2019-05-01" }, AUJ), false);
});

// La suite d'une série : nouvel épisode, fin (Ended, Canceled), avancement de la saison en cours.
test("suite_serie", () => {
  const s = { ...serie("2020-01-01", [{ season_number: 1, episode_count: 10 }, { season_number: 2, episode_count: 8 }]), lastSeason: 2, lastEpisodeNumber: 5, lastEpisode: jours(-2), status: "Returning Series" };
  assert.deepEqual(suiteSerie(s, AUJ), { episode: true, fin: null, avance: { s: 2, n: 5, t: 8 } });
  // Saison complète, nombre d'épisodes inconnu, pas d'épisode diffusé : pas de barre.
  assert.equal(suiteSerie({ ...s, lastEpisodeNumber: 8 }, AUJ).avance, null);
  assert.equal(suiteSerie({ ...s, seasons: [{ season_number: 2, episode_count: null }] }, AUJ).avance, null);
  assert.equal(suiteSerie({ ...s, lastEpisodeNumber: null }, AUJ).avance, null);
  assert.equal(suiteSerie({ ...s, lastSeason: 3 }, AUJ).avance, null);
  // Finie : « TERMINÉE », « ANNULÉE », et jamais de barre (saison coupée en route).
  assert.deepEqual(suiteSerie({ ...s, status: "Ended", lastEpisode: jours(-30) }, AUJ), { episode: false, fin: "TERMINÉE", avance: null });
  assert.equal(suiteSerie({ ...s, status: "Canceled" }, AUJ).fin, "ANNULÉE");
  assert.deepEqual(suiteSerie({ type: "movie", status: "Released" }, AUJ), { episode: false, fin: null, avance: null });
});

// Priorités du libellé : un nouvel épisode passe avant la fin ; chaque réglage seulement s'il est allumé.
test("libelle_suite_priorites", () => {
  const finie = { episode: true, fin: "TERMINÉE", avance: null };
  assert.equal(libelleSuite(finie, { episode: true, fin: true }), "NOUVEL ÉPISODE");
  assert.equal(libelleSuite(finie, { episode: false, fin: true }), "TERMINÉE");
  assert.equal(libelleSuite({ ...finie, episode: false }, { episode: true, fin: true }), "TERMINÉE");
  assert.equal(libelleSuite(finie, { episode: false, fin: false }), null);
});
