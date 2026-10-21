import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
import { hallPage } from "../worker/hall.js";
import { STAGE_JS } from "../worker/stage.js";
import { JEU_DEBUT, numero, jourValable, note, candidats, indice, bonFilm, oublierJeu, jeuPage } from "../worker/jeu.js";

const ajoute = (iso, j) => new Date(Date.parse(iso + "T12:00:00Z") + j * 86400000).toISOString().slice(0, 10);
const AUJ = ajoute(JEU_DEBUT, 9);   // n° 10

// TMDB simulé : 30 films « très votés » ; le film 7 n'a que des fonds avec du texte (pas jouable).
const FILMS = Array.from({ length: 30 }, (_, i) => i + 1);
const fiche = (id) => ({
  id, title: `Titre ${id}`, original_title: id % 2 ? `Original ${id}` : `Titre ${id}`, release_date: `${1960 + id}-05-01`, runtime: 125,
  imdb_id: `tt${9000000 + id}`, genres: [{ name: "Drame" }, { name: "Crime" }], poster_path: `/p${id}.jpg`,
  credits: { crew: [{ job: "Director", name: `Réal ${id}` }, { job: "Writer", name: "X" }], cast: [{ order: 1, name: "Second" }, { order: 0, name: `Star ${id}` }] },
  images: { backdrops: id === 7 ? [{ iso_639_1: "en", width: 1920, aspect_ratio: 1.78, vote_average: 9, vote_count: 3, file_path: "/texte.jpg" }]
    : [{ iso_639_1: null, width: 1920, aspect_ratio: 1.78, vote_average: 5, vote_count: 3, file_path: `/b${id}.jpg` }, { iso_639_1: null, width: 800, aspect_ratio: 1.78, vote_average: 9, vote_count: 3, file_path: "/petit.jpg" }] },
});
let store, calls, base;
function fakeD1(depart = {}) {
  const rows = new Map(Object.entries(depart));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async run() {
      if (sql.startsWith("CREATE")) return {};
      if (sql.startsWith("INSERT OR IGNORE")) { if (!rows.has(args[0])) rows.set(args[0], args[1]); return {}; }
      throw new Error("requête inattendue : " + sql);
    },
    async first() { return rows.has(args[0]) ? { film: rows.get(args[0]) } : null; },
    async all() { return { results: [...rows].filter(([j]) => j >= args[0] && j < args[1]).map(([, film]) => ({ film })) }; },
  });
  return { rows, prepare: (sql) => stmt(sql) };
}
beforeEach(() => {
  store = new Map(); calls = []; base = fakeD1();
  oublierJeu();
  globalThis.caches = { default: {
    match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
    put: async (req, res) => { store.set(req.url, await res.text()); },
  } };
  globalThis.fetch = async (url) => {
    const u = new URL(String(url));
    calls.push(u.pathname);
    if (u.hostname === "image.tmdb.org") return new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { "Content-Type": "image/jpeg" } });
    if (u.pathname.endsWith("/discover/movie")) return new Response(JSON.stringify({ results: u.searchParams.get("page") === "1" ? FILMS.map((id) => ({ id, backdrop_path: "/b.jpg", poster_path: "/p.jpg" })) : [] }));
    const m = /\/movie\/(\d+)$/.exec(u.pathname);
    if (m) return new Response(JSON.stringify(fiche(Number(m[1]))));
    return new Response(JSON.stringify({ results: [] }));
  };
});
const ctx = { waitUntil: () => {} };
const at = (p, init, e) => worker.fetch(new Request("https://x.exemple" + p, init), e || { TMDB_API_KEY: "x", LIENS: base }, ctx);
// Le jeu suit la date de Paris : les routes sont appelées avec une date de partie déjà passée (jourValable).
const essai = (date, corps) => at(`/jeu/${date}/essai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });

test("jeu_numeros_et_dates", () => {
  assert.equal(numero(JEU_DEBUT), 1);
  assert.equal(numero(ajoute(JEU_DEBUT, 11)), 12);
  assert.ok(jourValable(JEU_DEBUT, AUJ));
  assert.ok(jourValable(AUJ, AUJ));
  assert.ok(!jourValable(ajoute(AUJ, 1), AUJ), "le film de demain reste secret");
  assert.ok(!jourValable(ajoute(JEU_DEBUT, -1), AUJ));
  assert.ok(!jourValable("2026-13-45", "2099-01-01"));
});

test("jeu_tirage_stable", () => {
  assert.equal(note(AUJ, 42), note(AUJ, 42));
  assert.notEqual(note(AUJ, 42), note(ajoute(AUJ, 1), 42));
  const premier = candidats(AUJ, FILMS)[0];
  // Un film de plus dans la liste ne change le film du jour que s'il gagne lui-même.
  for (const nouveau of [31, 32, 33, 34, 35]) {
    const c = candidats(AUJ, [...FILMS, nouveau])[0];
    assert.ok(c === premier || c === nouveau);
  }
  // Ni le film d'hier, ni ceux des jours d'avant.
  const hier = candidats(ajoute(AUJ, -1), FILMS)[0];
  assert.notEqual(candidats(AUJ, FILMS)[0], hier);
  assert.ok(!candidats(AUJ, FILMS, [premier]).includes(premier));
});

test("jeu_reponse_jamais_dans_la_page", async () => {
  const r = await at("/jeu");
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.doesNotMatch(html, /Titre \d|Original \d|tt900|Réal \d|Star \d/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-controls="propositions"/);
  for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new Function(m[1]));
  assert.equal(calls.length, 0, "la page ne tire pas le film");
});

test("jeu_image_indices_et_essais", async () => {
  const date = JEU_DEBUT;
  const img = await at(`/jeu/${date}/image.jpg`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("Content-Type"), "image/jpeg");
  const film = Number(base.rows.get(date));
  assert.notEqual(film, 7, "un film sans fond sans texte n'est pas jouable");
  const textes = [];
  for (let n = 1; n <= 4; n++) textes.push((await (await at(`/jeu/${date}/indice/${n}`)).json()).texte);
  assert.deepEqual(textes, [`Sorti en ${1960 + film} · 2 h 05`, "Drame, Crime", `Réalisé par Réal ${film}`, `Avec Star ${film}`]);
  assert.equal((await at(`/jeu/${date}/indice/5`)).status, 404);
  // Raté : rien de plus que « non ».
  assert.deepEqual(await (await essai(date, { id: "tt0000001" })).json(), { ok: false });
  // Dernier essai raté : la réponse.
  const fin = await (await essai(date, { id: "tt0000001", fin: true })).json();
  assert.equal(fin.ok, false);
  assert.equal(fin.film.titre, `Titre ${film}`);
  // Trouvé, par l'identifiant IMDb comme par celui de TMDB.
  for (const id of [`tt${9000000 + film}`, `tmdb:${film}`]) assert.equal((await (await essai(date, { id })).json()).ok, true, id);
  assert.equal((await at(`/jeu/${date}/essai`)).status, 405);
  // L'image servie vient d'un fond sans texte, assez grand.
  assert.ok(calls.includes(`/t/p/w1280/b${film}.jpg`));
});

test("jeu_pas_de_film_de_demain", async () => {
  const demain = ajoute(new Date().toISOString().slice(0, 10), 2);
  for (const p of [`/jeu/${demain}/image.jpg`, `/jeu/${demain}/indice/1`]) assert.equal((await at(p)).status, 404, p);
  assert.equal((await essai(demain, { id: "tt1" })).status, 404);
  assert.ok(!calls.some((c) => c.includes("/discover/")));
});

test("jeu_le_premier_tirage_en_base_gagne", async () => {
  base = fakeD1({ [JEU_DEBUT]: 13 });
  const r = await (await essai(JEU_DEBUT, { id: "tmdb:13" })).json();
  assert.equal(r.ok, true);
  assert.ok(!calls.some((c) => c.includes("/discover/")), "film déjà en base : pas de nouveau tirage");
});

test("jeu_sans_base_ni_cle", async () => {
  // Sans base (Docker) : le tirage seul, le même à chaque fois.
  const sans = { TMDB_API_KEY: "x" };
  const a = await (await at(`/jeu/${JEU_DEBUT}/essai`, { method: "POST", body: JSON.stringify({ id: "x", fin: true }) }, sans)).json();
  oublierJeu(); store.clear();
  const b = await (await at(`/jeu/${JEU_DEBUT}/essai`, { method: "POST", body: JSON.stringify({ id: "x", fin: true }) }, sans)).json();
  assert.equal(a.film.tmdb, b.film.tmdb);
  // Sans clé TMDB : la page s'affiche, le jeu explique qu'il ne peut pas tourner.
  assert.equal((await at("/jeu", undefined, {})).status, 200);
  assert.equal((await at(`/jeu/${JEU_DEBUT}/indice/1`, undefined, {})).status, 503);
});

test("jeu_indices_et_reponse", () => {
  const p = { annee: "1994", duree: 142, genres: ["Drame"], realisateur: "Frank Darabont", acteur: "Tim Robbins", imdb: "tt0111161", tmdb: 278 };
  assert.equal(indice(p, 1).texte, "Sorti en 1994 · 2 h 22");
  assert.equal(indice({ ...p, annee: "" }, 1).texte, "Année inconnue");
  assert.ok(bonFilm(p, "tt0111161") && bonFilm(p, "tmdb:278"));
  assert.ok(!bonFilm(p, "tmdb:2780") && !bonFilm({ ...p, imdb: "" }, "") && !bonFilm(p, undefined));
});

test("jeu_page_partage_et_secret", () => {
  const html = jeuPage({ origin: "https://x.exemple", date: "2026-11-02", n: 12 });
  assert.match(html, /"Catalogue FR · Film du jour n°" \+ JEU\.n/);
  assert.match(html, /🟩|\\u\{?1F7E9/u);
  assert.match(html, /secret\("cinephile"\)/);
  assert.match(html, /N° 12/);
  assert.match(STAGE_JS, /\["cinephile", "Deviner le film du jour"/);
  assert.match(hallPage({ origin: "https://x.exemple", season: null }), /<a class="film-du-jour" href="https:\/\/x\.exemple\/jeu">/);
});
