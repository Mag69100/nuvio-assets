import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { makeHandler } from "../api/affiche.js";
import { makeQualite } from "../api/qualite.js";
import { makeTendances } from "../api/tendances.js";
import { secondesAvantBascule } from "../lib/tendances.js";
import { posterContent, contentKey } from "../lib/contenu.js";
import { resetMemo as r1 } from "../lib/tmdb.js";
import { resetMemo as r2 } from "../lib/notes.js";
import { resetMemo as r3 } from "../lib/tendances.js";
import { resetMemo as r4 } from "../lib/qualite.js";
import { resetMemo as r5 } from "../lib/texte.js";
import { resetMemo as r6 } from "../lib/notes-plus.js";
import { readFileSync } from "node:fs";
import satori from "satori";

beforeEach(() => { r1(); r2(); r3(); r4(); r5(); r6(); });

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
    const relais = /^https:\/\/affiches\.test\/qualite\/(movie|series)\/(.+)\.json(\?v=[23])?$/.exec(u);
    if (relais) return makeQualite({ fetchImpl: lireTorrentio })(new Request(`https://affiches.test/api/qualite?type=${relais[1]}&video=${relais[2]}`));
    const photo = /^https:\/\/affiches\.test\/tendances\/(movie|series)\.json$/.exec(u);
    if (photo) return makeTendances({ fetchImpl: f, env: { TMDB_API_KEY: "k" } })(new Request(`https://affiches.test/api/tendances?type=${photo[1]}`));
    if (u.includes("/find/")) return json({ movie_results: [{ id: 693134 }], tv_results: [] });
    if (u.includes("/trending/")) return json({ results: [] });
    if (u.includes("api.themoviedb.org") && (u.includes("/movie/") || u.includes("/tv/"))) return detail.clone();
    if (u.includes("image.tmdb.org")) return new Response(u.endsWith(".png") ? PNG : u.includes("/texte") ? TEXTE : JPG);
    if (u.includes("imdb-ratings.bin")) return new Response("", { status: 404 });
    return new Response("?", { status: 404 });
  };
  f.calls = calls;
  return f;
}
const env = { TMDB_API_KEY: "k" };

// Une affiche avec un titre et un générique écrits dessus (comme une affiche étrangère rangée « sans langue »).
const TEXTE = await sharp(Buffer.from(await satori(
  { type: "div", props: { style: { width: 342, height: 513, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", background: "#334", color: "#fff", fontFamily: "Inter", padding: 20 },
    children: [["LES DOSSIERS WARREN", 30], ["UN FILM DE JAMES WAN AVEC VERA FARMIGA PATRICK WILSON", 9]].map(([t, fs]) => ({ type: "div", props: { style: { display: "flex", fontSize: fs, marginTop: 6 }, children: t } })) } },
  { width: 342, height: 513, fonts: [{ name: "Inter", data: readFileSync(new URL("../fonts/Inter-SemiBold.ttf", import.meta.url)), weight: 600, style: "normal" }] },
))).jpeg().toBuffer();

test("image_sans_langue_mais_avec_texte_ecartee", async () => {
  const avecTexte = { ...film, images: { ...film.images, posters: [{ iso_639_1: null, file_path: "/texte-lt.jpg" }, { iso_639_1: null, file_path: "/nu.jpg" }] } };
  const f = internet({ detail: json(avecTexte) });
  const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.equal(res.status, 200);
  assert.ok(f.calls.includes("https://image.tmdb.org/t/p/w500/nu.jpg"), f.calls.join("\n"));
  assert.ok(!f.calls.includes("https://image.tmdb.org/t/p/w500/texte-lt.jpg"));
  // Seule candidate, avec texte : l'affiche normale, sans logo ni ligne du bas.
  const seule = { ...film, images: { ...film.images, posters: [{ iso_639_1: null, file_path: "/texte-lt.jpg" }] } };
  const g = internet({ detail: json(seule) });
  await makeHandler({ fetchImpl: g, env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.ok(g.calls.includes("https://image.tmdb.org/t/p/w500/fr.jpg"), g.calls.join("\n"));
  assert.ok(!g.calls.some((u) => u.includes("/logo.png")));
});

// Titre éteint : pas de logo à poser, donc rien à vérifier (aucune image analysée).
test("titre_eteint_sans_verification", async () => {
  const f = internet();
  await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&s=1.L0"));
  assert.ok(!f.calls.some((u) => u.includes("/w342/")), f.calls.join("\n"));
});
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
    poster: "/fr.jpg", textlessPoster: "/nu.jpg", backdrop: "/bd.jpg", textlessBackdrop: null, logo: "/logo.png", lastSeason: null,
    releases: [], releaseDate: "2024-02-27", firstAir: "", seasons: [] };
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

test("Torrentio en échec : cache court, pour avoir le badge à la prochaine demande", async () => {
  const refus = async () => new Response("interdit", { status: 403 });
  const res = await makeHandler({ fetchImpl: internet({ torrentio: refus }), env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.equal(res.status, 200);
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
  assert.ok(ordre("/tendances/") < ordre("/movie/693134"), f.calls.join("\n"));
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
  const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&s=1.T0Q0N0"));
  assert.equal(res.status, 200);
  assert.ok(!f.calls.some((u) => u.includes("torrentio")), "Torrentio appelé");
  assert.ok(!f.calls.some((u) => u.includes("/trending/") || u.includes("/tendances/")), "tendances appelées");
  assert.ok(!f.calls.some((u) => u.includes("imdb-ratings.bin")), "notes IMDb lues");
});

test("options : note TMDB sans lire les notes IMDb", async () => {
  const f = internet();
  await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&s=1.nt"));
  assert.ok(!f.calls.some((u) => u.includes("imdb-ratings.bin")));
});

test("qualité demandée au relais du service, pas à Torrentio directement", async () => {
  const f = internet();
  await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.ok(f.calls.includes("https://affiches.test/qualite/movie/tt15239678.json?v=3"), f.calls.join("\n"));
});

// Rien à dessiner (pas de titre maison, ni rang ni qualité) : l'image d'origine de TMDB, sans la redessiner.
test("rien à dessiner : redirection vers l'image TMDB", async () => {
  const f = internet();
  const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&s=1.S0T0Q0L0B0"));
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), "https://image.tmdb.org/t/p/w500/fr.jpg");
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=604800");
  assert.ok(!f.calls.some((u) => u.includes("image.tmdb.org")), "image téléchargée pour rien");
  const pays = await makeHandler({ fetchImpl: internet(), env })(req("type=movie&shape=landscape&id=tt15239678&s=1.S0T0Q0L0B0"));
  assert.equal(pays.headers.get("Location"), "https://image.tmdb.org/t/p/w780/bd.jpg");
});

// Une affiche classée garde son « N° » à jour : elle expire au changement de photo des tendances (appli et CDN),
// comme une affiche presque classée (21e à 60e), qui prendra son N° le jour où elle entre dans le top 20.
const photoAvec = (place) => Array.from({ length: 60 }, (_, i) => (i === place - 1 ? 693134 : 1 + i));
const age = (res, h) => Number(/max-age=(\d+)/.exec(res.headers.get(h))[1]);
test("affiche classée : cache jusqu'au changement de photo", async () => {
  for (const place of [1, 30]) {
    r3();
    const base = internet();
    const f = async (url, opts) => (String(url).includes("/tendances/") ? json({ ids: photoAvec(place) }) : base(url, opts));
    const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&s=1.Q0"));
    assert.equal(res.status, 200);
    const s = secondesAvantBascule();
    assert.ok(Math.abs(age(res, "Cache-Control") - s) <= 2, res.headers.get("Cache-Control"));
    assert.ok(Math.abs(age(res, "Vercel-CDN-Cache-Control") - s) <= 2, res.headers.get("Vercel-CDN-Cache-Control"));
  }
});

// Presque classée et sans rien d'autre à poser : redirigée vers l'image TMDB, mais seulement jusqu'au changement.
test("presque classée sans rien à poser : redirection courte", async () => {
  const base = internet();
  const f = async (url, opts) => (String(url).includes("/tendances/") ? json({ ids: photoAvec(30) }) : base(url, opts));
  const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&s=1.S0Q0L0B0"));
  assert.equal(res.status, 302);
  assert.ok(age(res, "Cache-Control") <= secondesAvantBascule());
  assert.ok(age(res, "Vercel-CDN-Cache-Control") <= secondesAvantBascule());
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
    // Anciens liens (o, r) : convertis dans le format de la régie.
    ["type=movie&shape=poster&id=tt15239678&imdb=tt15239678&o=qt", "/movie/poster/tt15239678.jpg?imdb=tt15239678&s=1.T0Q0"],
    ["type=movie&shape=poster&id=tt15239678&o=zq", "/movie/poster/tt15239678.jpg?s=1.Q0"],
    ["type=movie&shape=poster&id=tt15239678&r=imdb", "/movie/poster/tt15239678.jpg"],
    ["type=movie&shape=poster&id=tt15239678&o=n&r=tmdb", "/movie/poster/tt15239678.jpg?s=1.N0"],
    ["type=movie&shape=poster&id=tt15239678&imdb=tt999", "/movie/poster/tt15239678.jpg?imdb=tt15239678"],
    ["type=series&shape=landscape&id=tmdb:94605&imdb=abc", "/series/landscape/tmdb:94605.jpg"],
    // Format de la régie : codes remis dans l'ordre, sous-réglages d'une voie éteinte retirés.
    ["type=movie&shape=poster&id=tt15239678&s=1.Q0T0", "/movie/poster/tt15239678.jpg?s=1.T0Q0"],
    ["type=movie&shape=poster&id=tt15239678&s=1.N0nt", "/movie/poster/tt15239678.jpg?s=1.N0"],
    ["type=movie&shape=poster&id=tt15239678&s=", "/movie/poster/tt15239678.jpg"],
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
    "type=series&shape=poster&id=tmdb:94605&imdb=tt11126994&s=1.T0Q0nt", "type=movie&shape=landscape&id=tt15239678"]) {
    const res = await makeHandler({ fetchImpl: internet(), env })(req(q));
    assert.notEqual(res.status, 308, q);
  }
});

test("ancien_lien_redirige_puis_servi", async () => {
  const res = await makeHandler({ fetchImpl: internet(), env })(req("type=movie&shape=poster&id=tt15239678&imdb=tt15239678&o=tga&r=tmdb"));
  assert.equal(res.status, 308);
  const loc = new URL(res.headers.get("Location"), "https://affiches.test");
  assert.equal(loc.search, "?imdb=tt15239678&s=1.T0ntG0A0");
  const suite = await makeHandler({ fetchImpl: internet(), env })(req("type=movie&shape=poster&id=tt15239678&imdb=tt15239678&s=1.T0ntG0A0"));
  assert.equal(suite.status, 200);
});

const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const avecSorties = (...dates) => json({ ...film, release_dates: { results: [{ iso_3166_1: "FR", release_dates: dates.map(([type, d]) => ({ type, release_date: d })) }] } });

test("statut_cache_court", async () => {
  // Avec un statut (« Nouveau », une date…) : jusqu'au changement quotidien, dans l'appli comme au CDN.
  const res = await makeHandler({ fetchImpl: internet({ detail: avecSorties([4, jour(-5)]) }), env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.equal(res.status, 200);
  const s = secondesAvantBascule();
  assert.ok(Math.abs(age(res, "Cache-Control") - s) <= 2, res.headers.get("Cache-Control"));
  assert.ok(Math.abs(age(res, "Vercel-CDN-Cache-Control") - s) <= 2);
});

// Pas encore sorti : dessiné en gris, jamais redirigé vers l'image TMDB en couleur.
test("bientot_jamais_redirige", async () => {
  const sansRien = await makeHandler({ fetchImpl: internet({ detail: avecSorties([3, jour(40)]) }), env })(req("type=movie&shape=poster&id=tt15239678&s=1.S0T0Q0L0"));
  assert.equal(sansRien.status, 200);
  assert.equal(sansRien.headers.get("Content-Type"), "image/jpeg");
});

test("voies_eteintes_sans_appel", async () => {
  const f = internet();
  await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&s=1.T0Q0"));
  assert.ok(!f.calls.some((u) => u.includes("/trending/") || u.includes("/tendances/") || u.includes("/qualite/")), f.calls.join("\n"));
});

// ---------- Régie v2 ----------
test("v2_paysage_a_part_canonique", async () => {
  const GET = makeHandler({ fetchImpl: internet(), env });
  // sp identique à s : retiré.
  const meme = await GET(req("type=movie&shape=poster&id=tt15239678&s=1.T0&sp=1.T0"));
  assert.equal(meme.status, 308);
  assert.equal(meme.headers.get("Location"), "/movie/poster/tt15239678.jpg?s=1.T0");
  // sp différent : gardé, dans sa forme canonique.
  const autre = await GET(req("type=movie&shape=poster&id=tt15239678&s=1.T0&sp=1.Q0T0"));
  assert.equal(autre.status, 308);
  assert.equal(autre.headers.get("Location"), "/movie/poster/tt15239678.jpg?s=1.T0&sp=1.T0Q0");
  assert.equal((await GET(req("type=movie&shape=poster&id=tt15239678&s=1.T0&sp=1.T0Q0"))).status, 200);
});

test("v2_paysage_lit_sp", async () => {
  const avecFond = json({ ...film, images: { ...film.images, backdrops: [{ iso_639_1: null, file_path: "/bdnu.jpg" }] } });
  const f = internet({ detail: avecFond });
  // Portrait sans titre, paysage avec : seul le paysage télécharge le logo.
  await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=landscape&id=tt15239678&s=1.L0&sp=1.T0"));
  assert.ok(f.calls.some((u) => u.includes("/logo.png")), f.calls.join("\n"));
  const g = internet({ detail: avecFond });
  await makeHandler({ fetchImpl: g, env })(req("type=movie&shape=poster&id=tt15239678&s=1.L0&sp=1.T0"));
  assert.ok(!g.calls.some((u) => u.includes("/logo.png")));
});

test("v2_notes_seulement_si_demandees", async () => {
  const f = internet();
  await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.ok(!f.calls.some((u) => u.includes("/notes/")));
  const g = internet();
  const base = g;
  const avecNotes = async (url, opts) => (String(url).includes("/notes/") ? (base.calls.push(String(url)), json({ rt: 94, mc: null, lb: null })) : base(url, opts));
  avecNotes.calls = base.calls;
  const res = await makeHandler({ fetchImpl: avecNotes, env })(req("type=movie&shape=poster&id=tt15239678&s=1.R1"));
  assert.equal(res.status, 200);
  assert.ok(base.calls.includes("https://affiches.test/notes/tt15239678.json"), base.calls.join("\n"));
});

test("v2_notes_en_echec_cache_court", async () => {
  const base = internet();
  const f = async (url, opts) => (String(url).includes("/notes/") ? new Response("", { status: 503 }) : base(url, opts));
  const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&s=1.Q0R1"));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=3600");
});

test("v2_image_du_film_recadree_verifiee", async () => {
  const film2 = { ...film, images: { ...film.images, backdrops: [{ iso_639_1: null, file_path: "/texte-bd.jpg" }, { iso_639_1: null, file_path: "/bdnu.jpg" }] } };
  const f = internet({ detail: json(film2) });
  await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&s=1.Uf"));
  assert.ok(f.calls.includes("https://image.tmdb.org/t/p/w1280/bdnu.jpg"), f.calls.join("\n"));
});

test("v2_plateforme_en_coin_seule_pas_redirigee", async () => {
  // Rien d'autre que la plateforme en coin : l'affiche est dessinée, pas renvoyée vers TMDB.
  const film3 = { ...film, "watch/providers": { results: { FR: { flatrate: [{ display_priority: 1, provider_name: "Netflix", logo_path: "/n.png" }] } } } };
  const res = await makeHandler({ fetchImpl: internet({ detail: json(film3) }), env })(req("type=movie&shape=poster&id=tt15239678&s=1.S0T0Q0L0P1vcB0"));
  assert.equal(res.status, 200);
});

// Revue : un bandeau qui porte le statut (une date) expire au changement quotidien, comme le statut lui-même.
test("revue_bandeau_statut_cache_court", async () => {
  const res = await makeHandler({ fetchImpl: internet({ detail: avecSorties([4, jour(-5)]) }), env })(req("type=movie&shape=poster&id=tt15239678&s=1.J1"));
  assert.equal(res.status, 200);
  assert.ok(age(res, "Cache-Control") <= secondesAvantBascule() + 2, res.headers.get("Cache-Control"));   // deux lectures de l'heure, à une seconde près
});

// Revue : les autres notes ne sont pas demandées quand elles ne seraient pas dessinées (note en grand chiffre,
// ou titre pas encore sorti avec la note cachée) ; la plateforme fait demander les plateformes à TMDB (un film les
// demande toujours, pour la VF : test faits « plateforme_en_france »).
test("revue_notes_et_plateformes_seulement_si_utiles", async () => {
  const grand = internet();
  await makeHandler({ fetchImpl: grand, env })(req("type=movie&shape=poster&id=tt15239678&s=1.egR1"));
  assert.ok(!grand.calls.some((u) => u.includes("/notes/")), "notes demandées en grand chiffre");
  const pasSorti = internet({ detail: avecSorties([3, jour(40)]) });
  await makeHandler({ fetchImpl: pasSorti, env })(req("type=movie&shape=poster&id=tt15239678&s=1.R1"));
  assert.ok(!pasSorti.calls.some((u) => u.includes("/notes/")), "notes demandées pour un titre pas sorti");
  const plat = internet();
  await makeHandler({ fetchImpl: plat, env })(req("type=movie&shape=poster&id=tt15239678&s=1.P1"));
  assert.ok(plat.calls.some((u) => u.includes("watch%2Fproviders") || u.includes("watch/providers")), plat.calls.join("\n"));
});

// Revue : bandeau seul (le statut dans le coin, rien d'autre) : dessiné, pas renvoyé vers TMDB.
test("revue_bandeau_seul_pas_redirige", async () => {
  const res = await makeHandler({ fetchImpl: internet({ detail: avecSorties([4, jour(-5)]) }), env })(req("type=movie&shape=poster&id=tt15239678&s=1.T0Q0J1L0B0"));
  assert.equal(res.status, 200);
});

// ---------- Régie v3 ----------
test("v3_service", async () => {
  // Réalisateur : le générique est demandé à TMDB (seulement dans ce cas).
  const real = internet();
  await makeHandler({ fetchImpl: real, env })(req("type=movie&shape=poster&id=tt15239678&s=1.3ar"));
  assert.ok(real.calls.some((u) => /append_to_response=[^&]*credits/.test(u)), real.calls.join("\n"));
  const sans = internet();
  await makeHandler({ fetchImpl: sans, env })(req("type=movie&shape=poster&id=tt15239678"));
  assert.ok(!sans.calls.some((u) => /append_to_response=[^&]*credits/.test(u)));
  // Incontournable : la note IMDb est lue même si la note n'est pas affichée.
  r2();   // notes IMDb pas encore chargées (les requêtes d'avant les ont mises en mémoire)
  const culte = internet();
  await makeHandler({ fetchImpl: culte, env })(req("type=movie&shape=poster&id=tt15239678&s=1.N03b1"));
  assert.ok(culte.calls.some((u) => u.includes("imdb-ratings.bin")), culte.calls.join("\n"));
  // Retouches ou cadre seuls : l'affiche est dessinée, pas renvoyée vers TMDB.
  for (const s of ["S0T0Q0L0B01am", "S0T0Q0L0B01fb"]) {
    const res = await makeHandler({ fetchImpl: internet(), env })(req("type=movie&shape=poster&id=tt15239678&s=1." + s));
    assert.equal(res.status, 200, s);
  }
});

test("revue_v3_nouvel_episode_cache_quotidien", async () => {
  const serie = { ...film, id: 94605, release_date: undefined, first_air_date: "2020-01-01", seasons: [], last_episode_to_air: { air_date: "2020-02-01" } };
  const res = await makeHandler({ fetchImpl: internet({ detail: json(serie) }), env })(req("type=series&shape=poster&id=tmdb:94605&s=1.3c1"));
  assert.equal(res.status, 200);
  assert.ok(age(res, "Cache-Control") <= secondesAvantBascule() + 2, res.headers.get("Cache-Control"));
});

// Titre récent : les sources sont lues même sans le badge de qualité (elles disent s'il est en VF) ; vieux titre ou
// QUALITE=off : jamais.
test("sources_lues_pour_un_titre_recent", async () => {
  const recent = () => internet({ detail: avecSorties([4, jour(-20)]) });
  const f = recent();
  const res = await makeHandler({ fetchImpl: f, env })(req("type=movie&shape=poster&id=tt15239678&s=1.Q0"));
  assert.equal(res.status, 200);
  assert.ok(f.calls.some((u) => u.includes("/qualite/movie/tt15239678.json?v=3")), f.calls.join("\n"));
  const off = recent();
  await makeHandler({ fetchImpl: off, env: { ...env, QUALITE: "off" } })(req("type=movie&shape=poster&id=tt15239678&s=1.Q0"));
  assert.ok(!off.calls.some((u) => u.includes("/qualite/")));
  const vieux = internet();
  await makeHandler({ fetchImpl: vieux, env })(req("type=movie&shape=poster&id=tt15239678&s=1.Q0"));
  assert.ok(!vieux.calls.some((u) => u.includes("/qualite/")));
});
