import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { titleFacts, tmdbIdDe, tailleMemo, resetMemo as resetTmdb } from "../lib/tmdb.js";
import { ratingOf, decodeRatings, resetMemo as resetNotes } from "../lib/notes.js";
import { trendingRank, resetMemo as resetTendances } from "../lib/tendances.js";

const env = { TMDB_API_KEY: "k" };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

/** Faux fetch : répond selon l'URL (premier motif trouvé), garde les URL demandées. */
function fauxFetch(routes) {
  const calls = [];
  const f = async (url) => {
    const u = String(url);
    calls.push(u);
    for (const [motif, rep] of routes) if (u.includes(motif)) return typeof rep === "function" ? rep(u) : rep.clone();
    return json({}, 404);
  };
  f.calls = calls;
  return f;
}

const movie = {
  id: 693134, release_date: "2024-02-27", genres: [{ id: 878 }, { id: 12 }], vote_average: 8.1, vote_count: 6000,
  poster_path: "/fr.jpg", backdrop_path: "/bd.jpg", external_ids: { imdb_id: "tt15239678" },
  images: {
    posters: [{ iso_639_1: "fr", file_path: "/fr.jpg" }, { iso_639_1: null, file_path: "/nu.jpg" }, { iso_639_1: null, file_path: "/nu2.jpg" }],
    backdrops: [{ iso_639_1: "en", file_path: "/bden.jpg" }, { iso_639_1: null, file_path: "/bdnu.jpg" }],
    logos: [{ iso_639_1: "en", file_path: "/en.png" }, { iso_639_1: "fr", file_path: "/fr.svg" }],
  },
};

beforeEach(() => { resetTmdb(); resetNotes(); resetTendances(); });

test("tt id résolu par /find", async () => {
  const f = fauxFetch([["/find/tt15239678", json({ movie_results: [{ id: 693134 }], tv_results: [] })], ["/movie/693134", json(movie)]]);
  const facts = await titleFacts(env, { type: "movie", id: "tt15239678", imdb: "" }, f);
  assert.ok(f.calls[0].includes("/find/tt15239678") && f.calls[0].includes("external_source=imdb_id"));
  const detail = new URL(f.calls[1]);
  assert.equal(detail.pathname, "/3/movie/693134");
  assert.equal(detail.searchParams.get("append_to_response"), "images,external_ids,release_dates");
  assert.equal(detail.searchParams.get("include_image_language"), "fr,en,null");
  assert.equal(detail.searchParams.get("language"), "fr-FR");
  assert.equal(facts.tmdbId, 693134);
  assert.equal(facts.imdbId, "tt15239678");
});

test("tmdb:N direct", async () => {
  const serie = { ...movie, id: 94605, release_date: undefined, first_air_date: "2021-11-06", external_ids: { imdb_id: "tt11126994" }, last_episode_to_air: { season_number: 2 } };
  const f = fauxFetch([["/tv/94605", json(serie)]]);
  const facts = await titleFacts(env, { type: "series", id: "tmdb:94605", imdb: "" }, f);
  assert.ok(!f.calls.some((u) => u.includes("/find/")));
  assert.equal(new URL(f.calls[0]).pathname, "/3/tv/94605");
  assert.equal(facts.imdbId, "tt11126994");
  assert.equal(facts.type, "series");
});

test("images choisies", async () => {
  const f = fauxFetch([["/movie/693134", json(movie)]]);
  const facts = await titleFacts(env, { type: "movie", id: "tmdb:693134", imdb: "" }, f);
  assert.equal(facts.textlessPoster, "/nu.jpg");
  assert.equal(facts.poster, "/fr.jpg");
  assert.equal(facts.logo, "/fr.svg");
  assert.equal(facts.backdrop, "/bd.jpg");
  assert.equal(facts.textlessBackdrop, "/bdnu.jpg");
  assert.deepEqual(facts.genreIds, [878, 12]);
  assert.deepEqual(facts.vote, { average: 8.1, count: 6000 });
});

test("dates pour le statut", async () => {
  const avecDates = { ...movie, release_dates: { results: [{ iso_3166_1: "FR", release_dates: [{ type: 3, release_date: "2024-02-28T00:00:00.000Z" }] }] } };
  const f = fauxFetch([["/movie/693134", json(avecDates)]]);
  const facts = await titleFacts(env, { type: "movie", id: "tmdb:693134", imdb: "" }, f);
  assert.equal(new URL(f.calls[0]).searchParams.get("append_to_response"), "images,external_ids,release_dates");
  assert.deepEqual(facts.releases, avecDates.release_dates.results);
  assert.equal(facts.releaseDate, "2024-02-27");
  const serie = { ...movie, id: 94605, release_date: undefined, first_air_date: "2021-11-06", seasons: [{ season_number: 1, air_date: "2021-11-06", name: "S1" }] };
  const s = await titleFacts(env, { type: "series", id: "tmdb:94605", imdb: "" }, fauxFetch([["/tv/94605", json(serie)]]));
  assert.equal(s.firstAir, "2021-11-06");
  assert.deepEqual(s.seasons, [{ season_number: 1, air_date: "2021-11-06" }]);
});

test("logo anglais si pas de français, sinon rien", async () => {
  const en = { ...movie, images: { ...movie.images, logos: [{ iso_639_1: "de", file_path: "/de.png" }, { iso_639_1: "en", file_path: "/en.png" }] } };
  const sans = { ...movie, images: { ...movie.images, logos: [{ iso_639_1: "de", file_path: "/de.png" }] } };
  assert.equal((await titleFacts(env, { type: "movie", id: "tmdb:1", imdb: "" }, fauxFetch([["/movie/1", json(en)]]))).logo, "/en.png");
  assert.equal((await titleFacts(env, { type: "movie", id: "tmdb:2", imdb: "" }, fauxFetch([["/movie/2", json(sans)]]))).logo, null);
});

test("année et saison", async () => {
  const film = await titleFacts(env, { type: "movie", id: "tmdb:693134", imdb: "" }, fauxFetch([["/movie/693134", json(movie)]]));
  assert.equal(film.year, "2024");
  assert.equal(film.lastSeason, null);
  const serie = { ...movie, id: 94605, release_date: undefined, first_air_date: "2021-11-06", last_episode_to_air: { season_number: 2 } };
  const s = await titleFacts(env, { type: "series", id: "tmdb:94605", imdb: "" }, fauxFetch([["/tv/94605", json(serie)]]));
  assert.equal(s.year, "2021");
  assert.equal(s.lastSeason, 2);
});

test("mémoire des correspondances plafonnée", async () => {
  const f = async (u) => json({ movie_results: [{ id: 1 }], tv_results: [] });
  for (let i = 0; i < 5005; i++) await tmdbIdDe(env, "movie", "tt" + (200000 + i), f);
  assert.ok(tailleMemo() <= 5000, `taille ${tailleMemo()}`);
});

test("inconnu : 404 → null, 500 → erreur", async () => {
  assert.equal(await titleFacts(env, { type: "movie", id: "tmdb:9", imdb: "" }, fauxFetch([["/movie/9", json({}, 404)]])), null);
  assert.equal(await titleFacts(env, { type: "movie", id: "tt9", imdb: "" }, fauxFetch([["/find/tt9", json({ movie_results: [], tv_results: [] })]])), null);
  await assert.rejects(titleFacts(env, { type: "movie", id: "tmdb:8", imdb: "" }, fauxFetch([["/movie/8", json({}, 500)]])));
});

/** Tampon au format de data/imdb-ratings.bin : nombre (uint32 LE), écarts en varint, notes × 10. */
function binNotes(entries) {
  const out = [entries.length & 255, (entries.length >> 8) & 255, (entries.length >> 16) & 255, (entries.length >>> 24) & 255];
  let prev = 0;
  for (const [id] of entries) {
    let gap = id - prev; prev = id;
    do { let c = gap & 0x7f; gap = Math.floor(gap / 128); if (gap) c |= 0x80; out.push(c); } while (gap);
  }
  for (const [, note] of entries) out.push(note);
  return new Uint8Array(out);
}

test("notes", () => {
  const lire = decodeRatings(binNotes([[1, 55], [3, 79], [400000, 84]]));
  assert.equal(lire("tt0000003"), "7.9");
  assert.equal(lire("tt0400000"), "8.4");
  assert.equal(lire("tt0000002"), undefined);
  assert.equal(lire("pas-un-id"), undefined);
});

test("notes en mémoire", async () => {
  const f = fauxFetch([["imdb-ratings.bin", new Response(binNotes([[3, 79]]))]]);
  assert.equal(await ratingOf("tt0000003", f), "7.9");
  assert.equal(await ratingOf("tt0000004", f), undefined);
  assert.equal(f.calls.filter((u) => u.includes("imdb-ratings.bin")).length, 1);
});

test("notes illisibles : pas de note", async () => {
  const f = fauxFetch([["imdb-ratings.bin", new Response("", { status: 503 })]]);
  assert.equal(await ratingOf("tt0000003", f), undefined);
});

test("tendances", async () => {
  const results = Array.from({ length: 20 }, (_, i) => ({ id: 100 + i }));
  const f = fauxFetch([["/trending/movie/day", json({ results })], ["/trending/tv/day", json({ results: [{ id: 5 }] })]]);
  assert.equal(await trendingRank(env, "movie", 103, f), 4);
  assert.equal(await trendingRank(env, "movie", 999, f), null);
  assert.equal(await trendingRank(env, "series", 5, f), 1);
  assert.equal(f.calls.filter((u) => u.includes("/trending/movie/day")).length, 1);
  assert.equal(new URL(f.calls[0]).searchParams.get("page"), "1");
});

test("tendances en panne : null sans erreur", async () => {
  const f = async () => { throw new Error("réseau"); };
  assert.equal(await trendingRank(env, "movie", 1, f), null);
});
