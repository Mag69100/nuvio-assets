import { test } from "node:test";
import assert from "node:assert/strict";
import { decoupageCinemeta, ficheRecomptee } from "../worker/episodes.js";

// Cinemeta : une vidéo par épisode, comme dans /meta/series/<imdb>.json.
const cine = (...saisons) => saisons.flatMap((n, i) => Array.from({ length: n }, (_, k) => ({
  id: `tt1:${i + 1}:${k + 1}`, season: i + 1, episode: k + 1, name: `Ep ${k + 1}`, released: "2024-01-01T00:00:00.000Z",
})));
const tmdb = (...saisons) => [{ season_number: 0, episode_count: 3 }, ...saisons.map((n, i) => ({ season_number: i + 1, episode_count: n, air_date: "2024-01-01" }))];

test("meme_decoupage_rien_a_faire", () => {
  assert.equal(decoupageCinemeta(tmdb(10, 10), cine(10, 10)), null);
  // Cinemeta a seulement des épisodes de plus en fin de saison (L'Attaque des Titans) : on garde TMDB.
  assert.equal(decoupageCinemeta(tmdb(25, 28), cine(25, 30)), null);
  assert.equal(decoupageCinemeta(tmdb(10), []), null);
  assert.equal(decoupageCinemeta(tmdb(10), null), null);
});

test("une_saison_tmdb_redecoupee_comme_cinemeta", () => {
  // Jujutsu Kaisen : une « saison 1 » de 59 épisodes chez TMDB, 24 + 23 + 12 et la saison 4 annoncée chez Cinemeta.
  const c = cine(24, 23, 12);
  c.push({ id: "tt1:4:1", season: 4, episode: 1, name: "Episode 1", released: null });
  const d = decoupageCinemeta(tmdb(59), c);
  assert.deepEqual(d.place(1, 1), { season: 1, episode: 1 });
  assert.deepEqual(d.place(1, 25), { season: 2, episode: 1 });
  assert.deepEqual(d.place(1, 59), { season: 3, episode: 12 });
  assert.deepEqual(d.place(0, 2), { season: 0, episode: 2 });
  // Le 60e épisode, quand TMDB l'aura : le 1er de la saison 4.
  assert.deepEqual(d.place(1, 60), { season: 4, episode: 1 });
  assert.deepEqual(d.restants.map((v) => v.id), ["tt1:4:1"]);
  assert.deepEqual(d.saisons.map((s) => [s.season_number, s.episode_count, s.air_date]),
    [[0, 3, undefined], [1, 24, "2024-01-01"], [2, 23, "2024-01-01"], [3, 12, "2024-01-01"], [4, 1, null]]);
});

test("episodes_tmdb_au_dela_de_cinemeta", () => {
  // Bleach : 366 + 50 chez TMDB, les 366 en 16 saisons chez Cinemeta. La 2e saison TMDB devient la 17e,
  // un épisode de plus dans une saison TMDB continue la dernière saison de Cinemeta.
  const d = decoupageCinemeta(tmdb(28, 5), cine(10, 18));
  assert.deepEqual(d.place(1, 28), { season: 2, episode: 18 });
  assert.deepEqual(d.place(2, 1), { season: 3, episode: 1 });
  assert.deepEqual(d.place(2, 5), { season: 3, episode: 5 });
  assert.deepEqual(d.restants, []);
  assert.deepEqual(d.saisons.map((s) => [s.season_number, s.episode_count]), [[0, 3], [1, 10], [2, 18], [3, 5]]);
  const e = decoupageCinemeta(tmdb(30), cine(10, 18));
  assert.deepEqual(e.place(1, 30), { season: 2, episode: 20 });
  assert.deepEqual(e.saisons.map((s) => [s.season_number, s.episode_count]), [[0, 3], [1, 10], [2, 20]]);
});

test("numerotation_continue_de_tmdb", () => {
  // One Piece chez TMDB : 61 épisodes en saison 1, la saison 2 va du 62 au 77.
  const d = decoupageCinemeta(tmdb(61, 16), cine(30, 47));
  assert.deepEqual(d.place(1, 61), { season: 2, episode: 31 });
  assert.deepEqual(d.place(2, 62), { season: 2, episode: 32 });
  assert.deepEqual(d.place(2, 77), { season: 2, episode: 47 });
  // Le dernier, quand TMDB l'a avant Cinemeta.
  const e = decoupageCinemeta(tmdb(61, 16), cine(30, 46));
  assert.deepEqual(e.place(2, 77), { season: 2, episode: 47 });
});

test("fiche_tmdb_recomptee", () => {
  const c = cine(24, 23, 12);
  c.push({ id: "tt1:4:1", season: 4, episode: 1, name: "Episode 1", released: null });
  const brut = { id: 95479, seasons: tmdb(59), number_of_seasons: 1, next_episode_to_air: null,
    last_episode_to_air: { season_number: 1, episode_number: 59, air_date: "2026-03-26", episode_type: "mid_season" } };
  const d = ficheRecomptee(brut, decoupageCinemeta(brut.seasons, c));
  assert.equal(d.number_of_seasons, 4);
  assert.deepEqual(d.last_episode_to_air, { season_number: 3, episode_number: 12, air_date: "2026-03-26", episode_type: undefined });
  assert.equal(d.next_episode_to_air, null);
  assert.equal(brut.seasons.length, 2);   // la fiche d'origine n'est pas touchée
});

test("cinemeta_trop_incomplet_on_garde_tmdb", () => {
  assert.equal(decoupageCinemeta(tmdb(100), cine(10, 10)), null);
});
