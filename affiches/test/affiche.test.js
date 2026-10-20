import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { makeHandler } from "../api/affiche.js";
import { makeQualite } from "../api/qualite.js";
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

/**
 * Faux internet : TMDB, images, notes, et le relais /qualite/ du service (https://affiches.test), qui lit
 * Torrentio. `torrentio` remplace la réponse de Torrentio.
 */
function internet({ detail = json(film), torrentio } = {}) {
  const calls = [];
  const lireTorrentio = async (u, opts) => { calls.push(String(u)); return torrentio ? torrentio(u, opts) : json({ streams: [{ name: "4k DV" }] }); };
  const f = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes("torrentio")) return lireTorrentio(u, opts);
    calls.push(u);
    const relais = /^https:\/\/affiches\.test\/qualite\/(movie|series)\/(.+)\.json$/.exec(u);
    if (relais) return makeQualite({ fetchImpl: lireTorrentio })(new Request(`https://affiches.test/api/qualite?type=${relais[1]}&video=${relais[2]}`));
    if (u.includes("/find/")) return json({ movie_results: [{ id: 693134 }], tv_results: [] });
    if (u.includes("/trending/")) return json({ results: [] });
    if (u.includes("api.themoviedb.org") && (u.includes("/movie/") || u.includes("/tv/"))) return detail.clone();
    if (u.includes("image.tmdb.org")) return new Response(u.endsWith(".png") ? PNG : JPG);
    if (u.includes("imdb-ratings.bin")) return new Response("", { status: 404 });
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
  // 3 jours au CDN : chaque affiche vue est redessinée au plus tous les 3 jours (limite de calcul gratuite).
  assert.equal(res.headers.get("Vercel-CDN-Cache-Control"), "max-age=259200, stale-while-revalidate=604800");
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

const lent = (ms, corps) => () => new Promise((ok) => setTimeout(() => ok(json(corps)), ms));

test("Torrentio lent : pas plus d'1 s d'attente, cache court", async () => {
  const t0 = Date.now();
  const res = await makeHandler({ fetchImpl: internet({ torrentio: lent(2000, { streams: [{ name: "4k" }] }) }), env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.equal(res.status, 200);
  assert.ok(Date.now() - t0 < 1500, `trop long : ${Date.now() - t0} ms`);
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=3600");
  assert.equal(res.headers.get("Vercel-CDN-Cache-Control"), "max-age=600");
});

test("images téléchargées pendant qu'on attend Torrentio", async () => {
  let torrentioFini = null, premiereImage = null;
  const base = internet();
  const f = async (url, opts) => {
    const u = String(url);
    if (u.includes("/qualite/")) { await new Promise((ok) => setTimeout(ok, 400)); torrentioFini = Date.now(); return json({ uhd: false, extra: null }); }
    if (u.includes("image.tmdb.org") && !premiereImage) premiereImage = Date.now();
    return base(url, opts);
  };
  const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.equal(res.status, 200);
  assert.ok(premiereImage && premiereImage < torrentioFini, "les images attendent Torrentio");
});

test("notes et tendances demandées en même temps que TMDB", async () => {
  const f = internet();
  await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678"));
  const ordre = (motif) => f.calls.findIndex((u) => u.includes(motif));
  assert.ok(ordre("imdb-ratings.bin") < ordre("/movie/693134"), f.calls.join("\n"));
  assert.ok(ordre("/trending/") < ordre("/movie/693134"), f.calls.join("\n"));
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

test("options : appels évités", async () => {
  const f = internet();
  const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&o=tqn"));
  assert.equal(res.status, 200);
  assert.ok(!f.calls.some((u) => u.includes("torrentio")), "Torrentio appelé");
  assert.ok(!f.calls.some((u) => u.includes("/trending/")), "tendances appelées");
  assert.ok(!f.calls.some((u) => u.includes("imdb-ratings.bin")), "notes IMDb lues");
});

test("options : note TMDB sans lire les notes IMDb", async () => {
  const f = internet();
  await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&r=tmdb"));
  assert.ok(!f.calls.some((u) => u.includes("imdb-ratings.bin")));
});

test("qualité demandée au relais du service, pas à Torrentio directement", async () => {
  const f = internet();
  await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.ok(f.calls.includes("https://affiches.test/qualite/movie/tt15239678.json"), f.calls.join("\n"));
});

// Rien à dessiner (pas de titre maison, ni rang ni qualité) : l'image d'origine de TMDB, sans la redessiner.
test("rien à dessiner : redirection vers l'image TMDB", async () => {
  const f = internet();
  const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&o=tqngal"));
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), "https://image.tmdb.org/t/p/w500/fr.jpg");
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=604800");
  assert.ok(!f.calls.some((u) => u.includes("image.tmdb.org")), "image téléchargée pour rien");
  const pays = await makeHandler({ fetchImpl: internet(), env })(req("type=movie&shape=landscape&id=tt15239678&o=tqngal"));
  assert.equal(pays.headers.get("Location"), "https://image.tmdb.org/t/p/w780/bd.jpg");
});

// Une affiche classée garde son « N° » à jour : l'appli la revérifie chaque jour, pas chaque semaine.
test("affiche classée : cache court côté appli", async () => {
  const base = internet();
  const f = async (url, opts) => (String(url).includes("/trending/") ? json({ results: [{ id: 693134 }] }) : base(url, opts));
  const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=86400");
});

// Le titre ne doit jamais manquer : logo introuvable sur une image sans texte → erreur (Nuvio montre
// l'affiche d'origine), jamais une affiche sans nom gardée en cache.
test("logo introuvable : 502 sans cache", async () => {
  const base = internet();
  const f = async (url, opts) => (String(url).endsWith("/logo.png") ? new Response("non", { status: 404 }) : base(url, opts));
  const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.equal(res.status, 502);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

// Lien bricolé (paramètre en trop, lettres dans le désordre ou inconnues, imdb qui contredit l'id) : redirigé
// vers sa forme normale sans rien dessiner, pour qu'il ne crée pas une copie de plus dans le cache.
test("lien non canonique : redirection sans appel", async () => {
  const cas = [
    ["type=movie&shape=poster&id=tt15239678&x=1", "/movie/poster/tt15239678.jpg"],
    ["type=movie&shape=poster&id=tt15239678&imdb=tt15239678&o=qt", "/movie/poster/tt15239678.jpg?imdb=tt15239678&o=tq"],
    ["type=movie&shape=poster&id=tt15239678&o=zq", "/movie/poster/tt15239678.jpg?o=q"],
    ["type=movie&shape=poster&id=tt15239678&r=imdb", "/movie/poster/tt15239678.jpg"],
    ["type=movie&shape=poster&id=tt15239678&imdb=tt999", "/movie/poster/tt15239678.jpg?imdb=tt15239678"],
    ["type=series&shape=landscape&id=tmdb:94605&imdb=abc", "/series/landscape/tmdb:94605.jpg"],
    // Note coupée : la source de la note ne change rien, elle ne doit pas faire une copie de plus.
    ["type=movie&shape=poster&id=tt15239678&o=n&r=tmdb", "/movie/poster/tt15239678.jpg?o=n"],
  ];
  for (const [q, cible] of cas) {
    const f = internet();
    const res = await makeHandler({ fetchImpl: f, env })(req(q));
    assert.equal(res.status, 308, q);
    const loc = new URL(res.headers.get("Location"), "https://affiches.test");
    assert.equal(decodeURIComponent(loc.pathname) + loc.search, cible, q);
    assert.equal(f.calls.length, 0, q);
  }
});

test("liens normaux : pas de redirection", async () => {
  for (const q of ["type=movie&shape=poster&id=tt15239678&imdb=tt15239678", "type=movie&shape=poster&id=tt15239678&imdb=",
    "type=series&shape=poster&id=tmdb:94605&imdb=tt11126994&o=tq&r=tmdb", "type=movie&shape=landscape&id=tt15239678"]) {
    const res = await makeHandler({ fetchImpl: internet(), env })(req(q));
    assert.notEqual(res.status, 308, q);
  }
});
