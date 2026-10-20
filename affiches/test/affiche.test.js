import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { makeHandler } from "../api/affiche.js";
import { posterContent, contentKey } from "../lib/contenu.js";
import { resetMemo as r1 } from "../lib/tmdb.js";
import { resetMemo as r2 } from "../lib/notes.js";
import { resetMemo as r3 } from "../lib/tendances.js";
import { resetMemo as r4 } from "../lib/qualite.js";

beforeEach(() => { r1(); r2(); r3(); r4(); });

const json = (o, status = 200) => new Response(JSON.stringify(o), { status });
const film = {
  id: 693134, release_date: "2024-02-27", genres: [{ id: 878 }], vote_average: 8.1, vote_count: 6000,
  poster_path: "/fr.jpg", backdrop_path: "/bd.jpg", external_ids: { imdb_id: "tt15239678" },
  images: { posters: [{ iso_639_1: null, file_path: "/nu.jpg" }], backdrops: [], logos: [{ iso_639_1: "fr", file_path: "/logo.png" }] },
};
const JPG = await sharp({ create: { width: 500, height: 750, channels: 3, background: "#808080" } }).jpeg().toBuffer();
const PNG = await sharp({ create: { width: 300, height: 100, channels: 4, background: "#ffffff" } }).png().toBuffer();

/** Faux internet : TMDB, images, notes, Torrentio. `torrentio` remplace la réponse de Torrentio. */
function internet({ detail = json(film), torrentio } = {}) {
  const calls = [];
  const f = async (url, opts = {}) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/find/")) return json({ movie_results: [{ id: 693134 }], tv_results: [] });
    if (u.includes("/trending/")) return json({ results: [] });
    if (u.includes("api.themoviedb.org") && (u.includes("/movie/") || u.includes("/tv/"))) return detail.clone();
    if (u.includes("image.tmdb.org")) return new Response(u.endsWith(".png") ? PNG : JPG);
    if (u.includes("imdb-ratings.bin")) return new Response("", { status: 404 });
    if (u.includes("torrentio")) return torrentio ? torrentio(u, opts) : json({ streams: [{ name: "4k DV" }] });
    return new Response("?", { status: 404 });
  };
  f.calls = calls;
  return f;
}
const env = { TMDB_API_KEY: "k" };
const req = (q, headers = {}) => new Request(`https://affiches.test/api/affiche?${q}`, { headers });

test("affiche OK", async () => {
  const GET = makeHandler({ fetchImpl: internet(), env });
  const res = await GET(req("type=movie&shape=poster&id=tt15239678"));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "image/jpeg");
  assert.match(res.headers.get("ETag"), /^"[0-9a-f]{40}"$/);
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=604800");
  assert.equal(res.headers.get("Vercel-CDN-Cache-Control"), "max-age=86400, stale-while-revalidate=604800");
  assert.equal((await sharp(Buffer.from(await res.arrayBuffer())).metadata()).width, 400);
});

test("If-None-Match : 304 sans dessiner", async () => {
  const etag = (await makeHandler({ fetchImpl: internet(), env })(req("type=movie&shape=poster&id=tt15239678"))).headers.get("ETag");
  const f = internet();
  const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678", { "If-None-Match": etag }));
  assert.equal(res.status, 304);
  assert.equal(res.headers.get("ETag"), etag);
  assert.equal(await res.text(), "");
  assert.ok(!f.calls.some((u) => u.includes("image.tmdb.org")), "le JPEG a été dessiné");
});

test("refusés sans appel TMDB", async () => {
  for (const q of ["type=movie&shape=square&id=tt1", "type=movie&shape=poster&id=kitsu:7442", "type=movie&shape=poster&id=tt12abc", "type=anime&shape=poster&id=tt1"]) {
    const f = internet();
    const res = await makeHandler({ fetchImpl: f, env })(req(q));
    assert.equal(res.status, 404, q);
    assert.equal(res.headers.get("Cache-Control"), "public, max-age=3600");
    assert.equal(res.headers.get("Vercel-CDN-Cache-Control"), "max-age=3600");
    assert.equal(f.calls.length, 0, q);
  }
});

test("inconnu de TMDB : 404", async () => {
  const res = await makeHandler({ fetchImpl: internet({ detail: json({}, 404) }), env })(req("type=movie&shape=poster&id=tmdb:5"));
  assert.equal(res.status, 404);
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=3600");
});

test("TMDB en panne : 502 sans cache", async () => {
  const res = await makeHandler({ fetchImpl: internet({ detail: json({}, 500) }), env })(req("type=movie&shape=poster&id=tmdb:5"));
  assert.equal(res.status, 502);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("Torrentio en panne : affiche sans badge qualité, à temps", async () => {
  const jamais = (u, opts) => new Promise((_, reject) => opts.signal.addEventListener("abort", () => reject(opts.signal.reason)));
  const t0 = Date.now();
  const res = await makeHandler({ fetchImpl: internet({ torrentio: jamais }), env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.equal(res.status, 200);
  assert.ok(Date.now() - t0 < 3000, `trop long : ${Date.now() - t0} ms`);
  const facts = { tmdbId: 693134, type: "movie", imdbId: "tt15239678", genreIds: [878], year: "2024", vote: { average: 8.1, count: 6000 },
    poster: "/fr.jpg", textlessPoster: "/nu.jpg", backdrop: "/bd.jpg", textlessBackdrop: null, logo: "/logo.png", lastSeason: null };
  const attendu = contentKey(posterContent(facts, { imdbRating: undefined, rank: null, quality: null }, "poster"));
  assert.equal(res.headers.get("ETag"), `"${attendu}"`);
});

test("qualité désactivée : Torrentio jamais appelé", async () => {
  const f = internet();
  const res = await makeHandler({ fetchImpl: f, env: { ...env, QUALITE: "off" } })(req("type=movie&shape=poster&id=tt15239678"));
  assert.equal(res.status, 200);
  assert.ok(!f.calls.some((u) => u.includes("torrentio")));
});

test("imdb en paramètre pour un id tmdb", async () => {
  const sansImdb = { ...film, external_ids: {} };
  const f = internet({ detail: json(sansImdb) });
  await makeHandler({ fetchImpl: f, env })(req("type=series&shape=poster&id=tmdb:94605&imdb=tt11126994"));
  assert.ok(f.calls.some((u) => u.includes("torrentio") && u.includes("tt11126994")));
});
