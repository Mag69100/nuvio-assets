import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { makeQualite } from "../api/qualite.js";
import { makeNotes } from "../api/notes.js";
import { makeVf } from "../api/vf.js";
import { makeHandler } from "../api/affiche.js";
import { relaisRefuse, ENTETE_RELAIS } from "../lib/relais.js";
import { resetMemo as r1, qualityOf } from "../lib/qualite.js";
import { resetMemo as r2, notesPlus } from "../lib/notes-plus.js";
import { resetMemo as r3 } from "../lib/tmdb.js";
import { resetMemo as r4 } from "../lib/notes.js";
import { resetMemo as r5 } from "../lib/tendances.js";
import { resetMemo as r6 } from "../lib/texte.js";

beforeEach(() => { r1(); r2(); r3(); r4(); r5(); r6(); });

const json = (o, status = 200) => new Response(JSON.stringify(o), { status });
const CLE = { RELAIS_KEY: "secret-de-test" };
const avecCle = { [ENTETE_RELAIS]: "secret-de-test" };
const enEcoute = (reponse) => { const f = async (u, opts = {}) => { f.calls.push([String(u), opts.headers || {}]); return reponse(); }; f.calls = []; return f; };

test("relais_refuse", () => {
  const r = (h) => new Request("https://affiches.test/x", { headers: h });
  assert.equal(relaisRefuse(r({}), {}), false, "sans RELAIS_KEY : ouvert");
  assert.equal(relaisRefuse(r({}), CLE), true);
  assert.equal(relaisRefuse(r({ [ENTETE_RELAIS]: "faux" }), CLE), true);
  assert.equal(relaisRefuse(r(avecCle), CLE), false);
});

// Avec RELAIS_KEY : sans la clé, 403 jamais gardé, et rien demandé à Torrentio ni à MDBList. Un identifiant
// invalide reste un 404 gardé une heure, sans appel.
test("relais_proteges_par_la_cle", async () => {
  const torrentio = enEcoute(() => json({ streams: [] }));
  const qualite = makeQualite({ fetchImpl: torrentio, env: CLE });
  const refus = await qualite(new Request("https://affiches.test/api/qualite?type=movie&video=tt1"));
  assert.equal(refus.status, 403);
  assert.equal(refus.headers.get("Cache-Control"), "no-store");
  assert.equal(refus.headers.get("Vercel-CDN-Cache-Control"), null);
  assert.equal(torrentio.calls.length, 0);
  assert.equal((await qualite(new Request("https://affiches.test/api/qualite?type=movie&video=x"))).status, 404);
  assert.equal((await qualite(new Request("https://affiches.test/api/qualite?type=movie&video=tt1", { headers: avecCle }))).status, 200);
  assert.equal(torrentio.calls.length, 1);

  const mdb = enEcoute(() => json({ ratings: [] }));
  const notes = makeNotes({ fetchImpl: mdb, env: { ...CLE, MDBLIST_API_KEY: "k" } });
  assert.equal((await notes(new Request("https://affiches.test/api/notes?imdb=tt1"))).status, 403);
  assert.equal(mdb.calls.length, 0);
  assert.equal((await notes(new Request("https://affiches.test/api/notes?imdb=tt1", { headers: avecCle }))).status, 200);

  // /vf.json avec la clé : chaque titre est lu au relais /qualite/ avec la clé.
  const relais = enEcoute(() => json({ uhd: false, extra: null, vf: true, sources: 3 }));
  const vf = makeVf({ fetchImpl: relais, env: CLE });
  const ok = await vf(new Request("https://affiches.test/api/vf?v=movie/tt1", { headers: avecCle }));
  assert.deepEqual(await ok.json(), { "movie/tt1": { vf: true, sources: 3 } });
  assert.deepEqual(relais.calls, [["https://affiches.test/qualite/movie/tt1.json?v=3", avecCle]]);
});

// /vf.json sans la clé (copies auto-hébergées) : seulement ce qui est déjà connu, jamais Torrentio. Le relais
// /qualite/ est appelé sans clé (CDN : réponse ; adresse nouvelle : 403) ; une réponse à trous n'est pas gardée,
// et l'« inconnu » ne reste pas en mémoire pour la lecture suivante avec la clé.
test("vf_sans_cle_lit_seulement_le_connu", async () => {
  const relais = enEcoute(() => null);
  const f = async (u, opts = {}) => {
    relais.calls.push([String(u), opts.headers || {}]);
    if (String(u).includes("/qualite/movie/tt1.json")) return json({ uhd: false, extra: null, vf: true, sources: 3 });
    if (!(opts.headers || {})[ENTETE_RELAIS]) return new Response(null, { status: 403 });
    return json({ uhd: false, extra: null, vf: false, sources: 9 });
  };
  const vf = makeVf({ fetchImpl: f, env: CLE });
  const partiel = await vf(new Request("https://affiches.test/api/vf?v=movie/tt1,movie/tt2"));
  assert.equal(partiel.status, 200);
  assert.deepEqual(await partiel.json(), { "movie/tt1": { vf: true, sources: 3 }, "movie/tt2": null });
  assert.equal(partiel.headers.get("Vercel-CDN-Cache-Control"), "no-store");
  assert.ok(relais.calls.every(([u, h]) => u.includes("/qualite/") && !h[ENTETE_RELAIS]), "ni Torrentio ni clé");
  // Tout connu : gardé normalement.
  const complet = await vf(new Request("https://affiches.test/api/vf?v=movie/tt1"));
  assert.equal(complet.headers.get("Vercel-CDN-Cache-Control"), "max-age=3600");
  // L'addon, avec la clé, lit ensuite tt2 pour de vrai (l'inconnu d'avant n'est pas resté en mémoire).
  const avec = await vf(new Request("https://affiches.test/api/vf?v=movie/tt2", { headers: avecCle }));
  assert.deepEqual(await avec.json(), { "movie/tt2": { vf: false, sources: 9 } });
});

test("le_service_envoie_la_cle_a_ses_relais", async () => {
  const relais = enEcoute(() => json({ rt: 90, mc: null, lb: null }));
  await notesPlus("tt2", relais, "https://affiches.test", "secret-de-test");
  assert.deepEqual(relais.calls, [["https://affiches.test/notes/tt2.json", avecCle]]);
  const sansCle = enEcoute(() => json({ uhd: true, extra: null }));
  await qualityOf("movie", "tt3", null, sansCle, "https://affiches.test");
  assert.deepEqual(sansCle.calls, [["https://affiches.test/qualite/movie/tt3.json?v=3", {}]]);
});

// Une affiche demande la qualité à son relais avec la clé de l'environnement.
test("affiche_avec_cle", async () => {
  const vus = [];
  const film = { id: 1, release_date: "2024-01-01", genres: [], vote_average: 7, vote_count: 100, poster_path: "/p.jpg", backdrop_path: "/b.jpg",
    external_ids: { imdb_id: "tt9" }, images: { posters: [], backdrops: [], logos: [] } };
  const f = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes("/qualite/")) { vus.push(opts.headers); return json({ uhd: true, extra: null }); }
    if (u.includes("/find/")) return json({ movie_results: [{ id: 1 }] });
    if (u.includes("api.themoviedb.org")) return json(film);
    return new Response("", { status: 404 });
  };
  await makeHandler({ fetchImpl: f, env: { TMDB_API_KEY: "k", ...CLE } })(new Request("https://affiches.test/api/affiche?type=movie&shape=poster&id=tt9&s=1.T0"));
  assert.deepEqual(vus, [avecCle]);
});
