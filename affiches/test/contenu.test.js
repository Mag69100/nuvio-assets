import { test } from "node:test";
import assert from "node:assert/strict";
import { posterContent, contentKey, SHORT_GENRES } from "../lib/contenu.js";

const facts = {
  tmdbId: 693134, type: "movie", imdbId: "tt15239678", genreIds: [878, 12], year: "2024",
  vote: { average: 8.1, count: 6000 }, poster: "/fr.jpg", textlessPoster: "/nu.jpg",
  backdrop: "/bd.jpg", textlessBackdrop: "/bdnu.jpg", logo: "/fr.png", lastSeason: null,
};
const extra = { imdbRating: "8.4", rank: null, quality: null };

test("complet", () => {
  const c = posterContent(facts, extra, "poster");
  assert.equal(c.full, true);
  assert.equal(c.image, "/nu.jpg");
  assert.equal(c.logo, "/fr.png");
  assert.deepEqual(c.line, ["SF", "8,4", "2024"]);
  assert.equal(c.shape, "poster");
});

test("sans image sans texte : affiche normale, bas intact", () => {
  const c = posterContent({ ...facts, textlessPoster: null }, { ...extra, rank: 3, quality: { uhd: true, extra: "DV" } }, "poster");
  assert.equal(c.full, false);
  assert.equal(c.image, "/fr.jpg");
  assert.equal(c.line, null);
  assert.equal(c.logo, null);
  assert.equal(c.rank, 3);
  assert.deepEqual(c.quality, { extra: "DV" });
});

test("sans logo : affiche normale (le titre imprimé reste)", () => {
  const c = posterContent({ ...facts, logo: null }, extra, "poster");
  assert.equal(c.full, false);
  assert.equal(c.image, "/fr.jpg");
});

test("paysage : images de fond", () => {
  assert.equal(posterContent(facts, extra, "landscape").image, "/bdnu.jpg");
  const sans = posterContent({ ...facts, textlessBackdrop: null }, extra, "landscape");
  assert.equal(sans.image, "/bd.jpg");
  assert.equal(sans.full, false);
});

test("sans image du tout : null", () => {
  assert.equal(posterContent({ ...facts, poster: null, textlessPoster: null }, extra, "poster"), null);
  assert.equal(posterContent({ ...facts, backdrop: null, textlessBackdrop: null }, extra, "landscape"), null);
});

test("note TMDB de repli à partir de 50 votes", () => {
  const sansImdb = { ...extra, imdbRating: undefined };
  assert.deepEqual(posterContent({ ...facts, vote: { average: 7.25, count: 120 } }, sansImdb, "poster").line, ["SF", "7,3", "2024"]);
  assert.deepEqual(posterContent({ ...facts, genreIds: [18], year: "2023", vote: { average: 7.25, count: 49 } }, sansImdb, "poster").line, ["Drame", "2023"]);
});

test("sans genre", () => {
  assert.deepEqual(posterContent({ ...facts, genreIds: [] }, extra, "poster").line, ["8,4", "2024"]);
});

test("sans année", () => {
  assert.deepEqual(posterContent({ ...facts, year: null }, extra, "poster").line, ["SF", "8,4"]);
});

test("genres courts, premier genre seulement", () => {
  const g = (id) => posterContent({ ...facts, genreIds: [id, 18] }, extra, "poster").line[0];
  assert.equal(g(878), "SF");
  assert.equal(g(10765), "SF");
  assert.equal(g(10759), "Action");
  assert.equal(g(10768), "Guerre");
  assert.equal(g(10751), "Famille");
  assert.equal(g(18), "Drame");
  assert.equal(g(99), "Documentaire");
  assert.equal(SHORT_GENRES[27], "Horreur");
});

test("qualité : seulement la 4K", () => {
  assert.equal(posterContent(facts, { ...extra, quality: { uhd: false, extra: null } }, "poster").quality, null);
  assert.deepEqual(posterContent(facts, { ...extra, quality: { uhd: true, extra: "DV" } }, "poster").quality, { extra: "DV" });
  assert.deepEqual(posterContent(facts, { ...extra, quality: { uhd: true, extra: null } }, "poster").quality, { extra: null });
  assert.equal(posterContent(facts, { ...extra, quality: null }, "poster").quality, null);
});

test("rang : top 20 seulement", () => {
  assert.equal(posterContent(facts, { ...extra, rank: 21 }, "poster").rank, null);
  assert.equal(posterContent(facts, { ...extra, rank: 20 }, "poster").rank, 20);
});

test("etag : stable, et change avec le rang", () => {
  const a = posterContent(facts, extra, "poster"), b = posterContent(facts, extra, "poster");
  assert.equal(contentKey(a), contentKey(b));
  assert.match(contentKey(a), /^[0-9a-f]{40}$/);
  assert.notEqual(contentKey(a), contentKey(posterContent(facts, { ...extra, rank: 4 }, "poster")));
});
