import { test } from "node:test";
import assert from "node:assert/strict";
import { posterContent, contentKey, SHORT_GENRES } from "../lib/contenu.js";
import { DEFAUT_REGLAGES, MEMOIRES, lireReglages } from "../lib/lien-affiches.js";

const AUJ = "2026-10-20";
// Film sorti en salle en 2024, en numérique depuis longtemps : aucun statut.
const facts = {
  tmdbId: 693134, type: "movie", imdbId: "tt15239678", genreIds: [878, 12], year: "2024",
  vote: { average: 8.1, count: 6000 }, poster: "/fr.jpg", textlessPoster: "/nu.jpg",
  backdrop: "/bd.jpg", textlessBackdrop: "/bdnu.jpg", logo: "/fr.png", lastSeason: null,
  releases: [{ iso_3166_1: "FR", release_dates: [{ type: 3, release_date: "2024-02-28" }, { type: 4, release_date: "2024-04-16" }] }],
  releaseDate: "2024-02-27", firstAir: "", seasons: [],
};
const bientot = { ...facts, releases: [{ iso_3166_1: "FR", release_dates: [{ type: 3, release_date: "2026-12-16" }] }], releaseDate: "2026-12-16" };
const enSalle = { ...facts, releases: [{ iso_3166_1: "FR", release_dates: [{ type: 3, release_date: "2026-10-10" }] }], releaseDate: "2026-10-10" };
const extra = { imdbRating: "8.4", rank: null, quality: null };
const plein = { imdbRating: "8.4", rank: 4, quality: { uhd: true, extra: "DV" } };
const contenu = (f, e = extra, shape = "poster", r = DEFAUT_REGLAGES) => posterContent(f, e, shape, r, AUJ);
const reglages = (s) => lireReglages(new URLSearchParams("s=1." + s));

test("defaut_comme_avant", () => {
  const c = contenu(facts, plein);
  assert.equal(c.full, true);
  assert.equal(c.image, "/nu.jpg");
  assert.equal(c.logo, "/fr.png");
  assert.deepEqual(c.line, { genre: "SF", note: "8,4", annee: "2024" });
  assert.equal(c.rank, 4);
  assert.deepEqual(c.quality, { extra: "DV" });
  assert.equal(c.statut, null);
  assert.equal(c.gris, false);
  assert.deepEqual(c.styles, { statut: "texte", tendance: "fleche", qualite: "texte", titre: "m", note: "etoile", texte: "m", sep: "point", fondu: { couleur: "noir", force: "m" } });
});

test("sans image sans texte ou sans logo : affiche normale, bas intact", () => {
  for (const f of [{ ...facts, textlessPoster: null }, { ...facts, logo: null }]) {
    const c = contenu(f, plein);
    assert.equal(c.full, false);
    assert.equal(c.image, "/fr.jpg");
    assert.equal(c.line, null);
    assert.equal(c.logo, null);
    assert.equal(c.styles.fondu, null);
    assert.equal(c.rank, 4);
  }
});

test("paysage : images de fond", () => {
  assert.equal(contenu(facts, extra, "landscape").image, "/bdnu.jpg");
  const sans = contenu({ ...facts, textlessBackdrop: null }, extra, "landscape");
  assert.equal(sans.image, "/bd.jpg");
  assert.equal(sans.full, false);
});

test("sans image du tout : null", () => {
  assert.equal(contenu({ ...facts, poster: null, textlessPoster: null }), null);
  assert.equal(contenu({ ...facts, backdrop: null, textlessBackdrop: null }, extra, "landscape"), null);
});

test("note TMDB de repli à partir de 50 votes", () => {
  const sansImdb = { ...extra, imdbRating: undefined };
  assert.deepEqual(contenu({ ...facts, vote: { average: 7.25, count: 120 } }, sansImdb).line, { genre: "SF", note: "7,3", annee: "2024" });
  assert.deepEqual(contenu({ ...facts, genreIds: [18], year: "2023", vote: { average: 7.25, count: 49 } }, sansImdb).line, { genre: "Drame", annee: "2023" });
});

test("sans genre, sans année", () => {
  assert.deepEqual(contenu({ ...facts, genreIds: [] }).line, { note: "8,4", annee: "2024" });
  assert.deepEqual(contenu({ ...facts, year: null }).line, { genre: "SF", note: "8,4" });
});

test("genres courts, premier genre seulement", () => {
  const g = (id) => contenu({ ...facts, genreIds: [id, 18] }).line.genre;
  assert.equal(g(878), "SF");
  assert.equal(g(10765), "SF");
  assert.equal(g(10759), "Action");
  assert.equal(g(10768), "Guerre");
  assert.equal(g(10751), "Famille");
  assert.equal(g(18), "Drame");
  assert.equal(SHORT_GENRES[27], "Horreur");
});

test("genre_complet", () => {
  assert.equal(contenu(facts, extra, "poster", reglages("gc")).line.genre, "Science-fiction");
  assert.equal(contenu({ ...facts, genreIds: [10765] }, extra, "poster", reglages("gc")).line.genre, "SF & Fantastique");
});

test("qualité : seulement la 4K, et 4K seul sur demande", () => {
  assert.equal(contenu(facts, { ...extra, quality: { uhd: false, extra: null } }).quality, null);
  assert.deepEqual(contenu(facts, { ...extra, quality: { uhd: true, extra: "DV" } }).quality, { extra: "DV" });
  assert.deepEqual(contenu(facts, { ...extra, quality: { uhd: true, extra: "DV" } }, "poster", reglages("q4")).quality, { extra: null });
  assert.equal(contenu(facts, { ...extra, quality: null }).quality, null);
});

test("rang : top 20 seulement", () => {
  assert.equal(contenu(facts, { ...extra, rank: 21 }).rank, null);
  assert.equal(contenu(facts, { ...extra, rank: 20 }).rank, 20);
});

test("voies éteintes", () => {
  const c = contenu(facts, plein, "poster", reglages("T0Q0G0A0N0"));
  assert.equal(c.rank, null);
  assert.equal(c.quality, null);
  assert.equal(c.line, null);
  assert.equal(c.full, true);
  const sansTitre = contenu(facts, plein, "poster", reglages("L0"));
  assert.equal(sansTitre.full, false);
  assert.equal(sansTitre.image, "/fr.jpg");
  assert.equal(sansTitre.rank, 4);
  assert.equal(contenu(facts, plein, "poster", reglages("F0")).styles.fondu, null);
});

test("source_tmdb", () => {
  assert.deepEqual(contenu(facts, plein, "poster", reglages("nt")).line, { genre: "SF", note: "8,1", annee: "2024" });
  assert.deepEqual(contenu({ ...facts, vote: { average: 8.1, count: 10 } }, plein, "poster", reglages("nt")).line, { genre: "SF", annee: "2024" });
});

test("bientot_gris_sans_note", () => {
  const c = contenu(bientot, plein);
  assert.equal(c.statut, "BIENTÔT");
  assert.equal(c.gris, true);
  assert.deepEqual(c.line, { genre: "SF", annee: "2024" });
  assert.equal(contenu(bientot, plein, "poster", reglages("B0")).gris, false);
  assert.equal(contenu(bientot, plein, "poster", reglages("h0")).line.note, "8,4");
  assert.equal(contenu(bientot, plein, "poster", reglages("S0")).statut, null);
});

test("salle_gris_si_demande", () => {
  const c = contenu(enSalle, plein);
  assert.equal(c.statut, "EN SALLE");
  assert.equal(c.gris, false);
  assert.equal(c.line.note, "8,4");
  const aussi = contenu(enSalle, plein, "poster", reglages("c1"));
  assert.equal(aussi.gris, true);
  assert.equal(aussi.line.note, undefined);
});

test("note_seule_sans_logo", () => {
  const c = contenu({ ...facts, logo: null }, plein, "poster", MEMOIRES.noteSeule);
  assert.equal(c.full, false);
  assert.equal(c.line, null);
  const avec = contenu(facts, plein, "poster", MEMOIRES.noteSeule);
  assert.deepEqual(avec.line, { note: "8,4" });
  assert.equal(avec.styles.note, "grand");
  assert.equal(avec.rank, null);
});

test("etag_change", () => {
  const a = contenu(facts, plein), b = contenu(facts, plein);
  assert.equal(contentKey(a), contentKey(b));
  assert.match(contentKey(a), /^[0-9a-f]{40}$/);
  for (const s of ["T0", "tp", "kp", "ls", "en", "pb", "xl", "fa", "il", "se"]) {
    assert.notEqual(contentKey(contenu(facts, plein, "poster", reglages(s))), contentKey(a), s);
  }
});
