import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { correspondances, noteMal, resetMal } from "../lib/mal.js";

beforeEach(() => resetMal());

// Une série : l'entrée de sa première saison TV, pas une suite (saison TMDB 1 avec décalage) ni un film dérivé.
test("correspondances_serie_premiere_saison_film_tableau", () => {
  const m = correspondances([
    { type: "MOVIE", mal_id: 48561, themoviedb_id: { tv: 95479 }, season: { tmdb: 0 } },
    { type: "TV", mal_id: 51009, themoviedb_id: { tv: 95479 }, season: { tmdb: 1 }, episode_offset: 24 },
    { type: "TV", mal_id: 40748, themoviedb_id: { tv: 95479 }, season: { tmdb: 1 } },
    { type: "MOVIE", mal_id: 32281, themoviedb_id: { movie: [372058, 999] } },
    { type: "TV", themoviedb_id: { tv: 1 } },
  ]);
  assert.equal(m.get("series:95479"), 40748);
  assert.equal(m.get("movie:372058"), 32281);
  assert.equal(m.get("movie:999"), 32281);
  assert.equal(m.has("series:1"), false);
});

function faux(reponses) {
  const appels = [];
  const f = async (url, init) => {
    appels.push([String(url), init && init.headers ? init.headers["X-MAL-CLIENT-ID"] : undefined]);
    for (const [motif, rep] of reponses) if (String(url).includes(motif)) return typeof rep === "function" ? rep() : rep;
    return new Response("", { status: 404 });
  };
  f.appels = appels;
  return f;
}
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json" } });
const LISTE = [{ type: "TV", mal_id: 40748, themoviedb_id: { tv: 95479 }, season: { tmdb: 1 } }];

test("note_par_l_api_officielle_puis_jikan", async () => {
  const f = faux([["anime-list-mini", () => json(LISTE)], ["api.myanimelist.net", () => json({ mean: 8.54 })], ["jikan", () => json({ data: { score: 8.5 } })]]);
  assert.equal(await noteMal({ MAL_CLIENT_ID: "c" }, "series", 95479, f), 8.54);
  assert.ok(f.appels.some(([u, cle]) => u.includes("api.myanimelist.net/v2/anime/40748") && cle === "c"));
  // Gardée : pas de nouvel appel.
  const n = f.appels.length;
  assert.equal(await noteMal({ MAL_CLIENT_ID: "c" }, "series", 95479, f), 8.54);
  assert.equal(f.appels.length, n);
  // Sans clé : Jikan.
  resetMal();
  assert.equal(await noteMal({}, "series", 95479, f), 8.5);
  // Pas un animé (absent de la liste) : rien demandé à MyAnimeList.
  assert.equal(await noteMal({}, "series", 1396, f), null);
});

test("note_absente_ou_panne", async () => {
  const f = faux([["anime-list-mini", () => json(LISTE)], ["jikan", () => json({ data: { score: null } })]]);
  assert.equal(await noteMal({}, "series", 95479, f), null);
  resetMal();
  const p = faux([["anime-list-mini", () => json({}, 500)]]);
  assert.equal(await noteMal({}, "series", 95479, p), null);
});
