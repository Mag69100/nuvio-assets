import { test, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import worker, { oublierInfos } from "../worker/index.js";
import { resetFails } from "../worker/hote.js";

// Worker appelé comme par Cloudflare, avec un cache en mémoire et TMDB / Gemini simulés.
let store, calls;
beforeEach(() => {
  store = new Map();
  calls = [];
  resetFails();
  oublierInfos();
  globalThis.caches = {
    default: {
      match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
      put: async (req, res) => { store.set(req.url, await res.text()); },
    },
  };
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ results: [], page: 1, total_pages: 1 }), { headers: { "Content-Type": "application/json" } });
  };
});
const ctx = { waitUntil: () => {} };
const INSTANCE = "AIzaSyInstanceKey0123456789abcdefghijk";
const env = { TMDB_API_KEY: "tmdb", GEMINI_API_KEY: INSTANCE };
const seg = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const get = (path) => worker.fetch(new Request(`https://x${path}`), env, ctx);

test("debug_reserve_sans_cle", async () => {
  for (const path of ["/debug/search/movie/dune", "/debug/renewal/1399"]) {
    const res = await get(path);
    assert.equal(res.status, 403, path);
  }
  assert.equal(calls.length, 0);
});

test("debug_reserve_autre_cle", async () => {
  const res = await get(`/${seg({ k: "AIzaSyAutreCle0123456789abcdefghijklm" })}/debug/search/movie/dune`);
  assert.equal(res.status, 403);
});

test("debug_ouvert_avec_la_cle_de_l_instance", async () => {
  const res = await get(`/${seg({ k: INSTANCE })}/debug/search/movie/dune`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray((await res.json()).final));
});

const at = (url, init) => worker.fetch(new Request(url, init), env, ctx);

test("manifeste_source", async () => {
  const m = await (await at("https://nuvio-assets.xnzxflix.workers.dev/manifest.json")).json();
  assert.equal(m.id, "com.xnzx07.catalogue-fr");
});

test("manifeste_copie", async () => {
  const m = await (await at("https://catalogue.exemple.fr/manifest.json")).json();
  assert.equal(m.id, "com.xnzx07.catalogue-fr.perso");
});

test("hote_absent_sur_la_source", async () => {
  const res = await at("https://nuvio-assets.xnzxflix.workers.dev/hote/etat");
  assert.equal(res.status, 404);
});

// ---------- espace hébergeur d'une copie ----------
const COPY = "https://copie.exemple";
const hostEnv = { ...env, ADMIN_PASSWORD: "secret-hote" };
const hostAt = (path, init = {}, e = hostEnv) => worker.fetch(new Request(COPY + path, init), e, ctx);
const login = (motDePasse, e) => hostAt("/hote/connexion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motDePasse }) }, e);
const cookieOf = (res) => (res.headers.getSetCookie()[0] || "").split(";")[0];
// GitHub simulé : la source a publié la 5.99.1 (palier toujours plus récent que la copie).
const githubSays = () => {
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes("raw.githubusercontent.com") && String(url).endsWith("/worker/index.js")) return new Response('const VERSION = "5.99.1";');
    if (String(url).includes("api.github.com")) return new Response(JSON.stringify([{ commit: { message: "v5.99.1 : B" } }, { commit: { message: "v5.99.0 : A" } }]));
    return new Response(JSON.stringify({ results: [] }));
  };
};

test("connexion_mauvais_mot_de_passe", async () => {
  const res = await login("faux");
  assert.equal(res.status, 403);
  assert.equal(res.headers.getSetCookie().length, 0);
});

test("connexion_puis_etat", async () => {
  githubSays();
  const res = await login("secret-hote");
  assert.equal(res.status, 200);
  const cookie = cookieOf(res);
  assert.match(cookie, /^hote=\d{13}\.[a-f0-9]{64}$/);
  assert.ok(!cookie.includes("secret-hote"));
  const etat = await (await hostAt("/hote/etat", { headers: { cookie } })).json();
  assert.equal(etat.hote, true);
  assert.match(etat.alerte, /^https:\/\/copie\.exemple\/[^/]+\/manifest\.json$/);
  assert.equal(etat.maj.version, "5.99.1");
  assert.deepEqual(await (await hostAt("/hote/etat")).json(), { hote: false, motDePasse: true });
});

test("cookie_forge", async () => {
  assert.deepEqual(await (await hostAt("/hote/etat", { headers: { cookie: "hote=abc" } })).json(), { hote: false, motDePasse: true });
});

test("sans_mot_de_passe", async () => {
  for (const mdp of ["", "secret-hote", undefined]) assert.equal((await login(mdp, env)).status, 403);
  assert.deepEqual(await (await hostAt("/hote/etat", { headers: { cookie: "hote=" } }, env)).json(), { hote: false, motDePasse: false });
});

test("plus_tard_masque", async () => {
  githubSays();
  const cookie = cookieOf(await login("secret-hote"));
  assert.equal((await (await hostAt("/hote/etat", { headers: { cookie } })).json()).maj.version, "5.99.1");
  assert.equal((await hostAt("/hote/plus-tard", { method: "POST", headers: { cookie } })).status, 200);
  assert.equal((await (await hostAt("/hote/etat", { headers: { cookie } })).json()).maj, null);
});

test("plus_tard_reserve", async () => {
  assert.equal((await hostAt("/hote/plus-tard", { method: "POST" })).status, 403);
});

test("connexion_en_http_sans_secure", async () => {
  const res = await worker.fetch(new Request("http://192.168.1.10:8787/hote/connexion", { method: "POST", body: JSON.stringify({ motDePasse: "secret-hote" }) }), hostEnv, ctx);
  assert.equal(res.status, 200);
  assert.doesNotMatch(res.headers.getSetCookie()[0], /Secure/);
  const https = await login("secret-hote");
  assert.match(https.headers.getSetCookie()[0], /Secure/);
});

// ---------- rangée « Mise à jour » dans Nuvio (lien de l'hébergeur) ----------
import { alertToken, dismiss } from "../worker/hote.js";
const withAl = async (al) => `/${seg({ al })}`;
const manifestOf = async (prefix, e = hostEnv) => (await hostAt(`${prefix}/manifest.json`, {}, e)).json();

test("rangee_absente_sans_jeton", async () => {
  assert.ok(!(await manifestOf("")).catalogs.some((c) => c.id === "mise-a-jour"));
});

test("rangee_en_tete_avec_jeton", async () => {
  const m = await manifestOf(await withAl(await alertToken(hostEnv)));
  assert.equal(m.catalogs[0].id, "mise-a-jour");
  assert.equal(m.catalogs[0].showInHome, true);
});

test("rangee_jeton_faux", async () => {
  assert.ok(!(await manifestOf(await withAl("0".repeat(24)))).catalogs.some((c) => c.id === "mise-a-jour"));
});

test("rangee_jamais_sur_la_source", async () => {
  const m = await (await worker.fetch(new Request(`https://nuvio-assets.xnzxflix.workers.dev${await withAl(await alertToken(hostEnv))}/manifest.json`), hostEnv, ctx)).json();
  assert.ok(!m.catalogs.some((c) => c.id === "mise-a-jour"));
});

test("carte_si_mise_a_jour", async () => {
  githubSays();
  const res = await hostAt(`${await withAl(await alertToken(hostEnv))}/catalog/movie/mise-a-jour.json`);
  const { metas } = await res.json();
  assert.equal(metas.length, 1);
  assert.equal(metas[0].id, "maj:5.99.1");
  assert.match(metas[0].name, /5\.99\.1/);
  assert.match(res.headers.get("Cache-Control"), /no-store/);
  assert.ok(![...store.keys()].some((k) => k.includes("mise-a-jour")));
});

test("carte_absente_sans_jeton_valide", async () => {
  githubSays();
  const { metas } = await (await hostAt(`${await withAl("0".repeat(24))}/catalog/movie/mise-a-jour.json`)).json();
  assert.deepEqual(metas, []);
});

test("carte_absente_apres_plus_tard", async () => {
  githubSays();
  await dismiss(hostEnv, "5.99");
  const { metas } = await (await hostAt(`${await withAl(await alertToken(hostEnv))}/catalog/movie/mise-a-jour.json`)).json();
  assert.deepEqual(metas, []);
});

test("fiche_mise_a_jour", async () => {
  githubSays();
  const prefix = await withAl(await alertToken(hostEnv));
  const docker = await (await hostAt(`${prefix}/meta/movie/maj:5.99.1.json`, {}, { ...hostEnv, INSTALLATION: "docker" })).json();
  assert.match(docker.meta.description, /• B/);
  assert.match(docker.meta.description, /docker compose pull && docker compose up -d/);
  const cf = await (await hostAt(`${prefix}/meta/movie/maj%3A5.99.1.json`, {}, { ...hostEnv, DEPOT: "moi/nuvio-assets" })).json();
  assert.match(cf.meta.description, /https:\/\/github\.com\/moi\/nuvio-assets/);
  assert.match(cf.meta.description, /Sync fork/);
});

test("fiche_adresse_mal_formee", async () => {
  const res = await at("https://nuvio-assets.xnzxflix.workers.dev/meta/movie/%E0%A4%A.json");
  assert.ok(res.status < 500);
  assert.equal((await res.json()).meta, null);
});

test("plus_tard_sans_github", async () => {
  githubSays();
  const cookie = cookieOf(await login("secret-hote"));
  globalThis.fetch = async () => { throw new Error("GitHub en panne"); };
  const res = await hostAt("/hote/plus-tard", { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ palier: "5.99" }) });
  assert.equal(res.status, 200);
  githubSays();
  assert.equal((await (await hostAt("/hote/etat", { headers: { cookie } })).json()).maj, null);
});

// ---------- sécurité de l'espace hébergeur ----------
import { hostCookie } from "../worker/hote.js";
import { readFileSync } from "node:fs";
const loginFrom = (ip, motDePasse) => hostAt("/hote/connexion", { method: "POST", headers: { "Content-Type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify({ motDePasse }) });

test("jeton_et_cookie_avec_secret_serveur", async () => {
  // Même mot de passe, autre clé TMDB (secret du serveur) : rien ne se recalcule à partir du seul mot de passe.
  const other = { ...hostEnv, TMDB_API_KEY: "autre-cle-tmdb" };
  assert.notEqual(await alertToken(hostEnv), await alertToken(other));
  assert.notEqual(await hostCookie(hostEnv), await hostCookie(other));
});

test("connexion_limitee_par_adresse", async () => {
  for (let i = 0; i < 10; i++) assert.equal((await loginFrom("203.0.113.7", "faux")).status, 403);
  assert.equal((await loginFrom("203.0.113.7", "secret-hote")).status, 429);
  assert.equal((await loginFrom("203.0.113.8", "secret-hote")).status, 200);
});

test("connexion_reussie_remet_a_zero", async () => {
  for (let i = 0; i < 9; i++) await loginFrom("203.0.113.9", "faux");
  assert.equal((await loginFrom("203.0.113.9", "secret-hote")).status, 200);
  for (let i = 0; i < 9; i++) await loginFrom("203.0.113.9", "faux");
  assert.equal((await loginFrom("203.0.113.9", "secret-hote")).status, 200);
});

test("demandes_d_un_autre_site_refusees", async () => {
  const cookie = cookieOf(await login("secret-hote"));
  for (const path of ["/hote/plus-tard", "/hote/deconnexion", "/hote/connexion"]) {
    const res = await hostAt(path, { method: "POST", headers: { cookie, origin: "https://pirate.exemple", "Content-Type": "application/json" }, body: JSON.stringify({ motDePasse: "secret-hote", palier: "5.99" }) });
    assert.equal(res.status, 403, path);
  }
  const same = await hostAt("/hote/plus-tard", { method: "POST", headers: { cookie, origin: COPY, "Content-Type": "application/json" }, body: JSON.stringify({ palier: "5.99" }) });
  assert.equal(same.status, 200);
});

test("etat_github_injoignable", async () => {
  githubSays();
  const cookie = cookieOf(await login("secret-hote"));
  globalThis.fetch = async () => { throw new Error("GitHub en panne"); };
  const etat = await (await hostAt("/hote/etat", { headers: { cookie } })).json();
  assert.equal(etat.maj, null);
  assert.equal(etat.verification, "impossible");
});

test("etat_a_jour", async () => {
  githubSays();
  const cookie = cookieOf(await login("secret-hote"));
  globalThis.fetch = async (url) => new Response(String(url).includes("api.github.com") ? "[]" : 'const VERSION = "1.0.0";');
  const etat = await (await hostAt("/hote/etat", { headers: { cookie } })).json();
  assert.equal(etat.maj, null);
  assert.equal(etat.verification, "ok");
});

test("wikipedia_sans_adresse_perso", () => {
  assert.doesNotMatch(readFileSync("worker/index.js", "utf8"), /User-Agent": "CatalogueFR[^"]*xnzxflix/);
});

test("route_copie", async () => {
  const res = await at("https://nuvio-assets.xnzxflix.workers.dev/copie");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("Content-Type"), /text\/html/);
  assert.match(await res.text(), /docker compose up -d/);
});

// Bande-annonce VF trouvée : gardée 30 jours (elle ne change presque jamais ; moins de recherches sur
// YouTube, qui peut bloquer les serveurs de Cloudflare). Pas de VF : revérifié tous les 2 jours.
test("vf_gardee_30_jours", () => {
  const src = readFileSync("worker/index.js", "utf8");
  assert.match(src, /^const VF_CACHE_S = 30 \* 86400;/m);
  assert.match(src, /^const VF_MISS_S = 2 \* 86400;/m);
});

// ---------- audit de sécurité ----------
test("mot_de_passe_trop_simple_refuse", async () => {
  for (const ADMIN_PASSWORD of ["choisis-un-mot-de-passe", "court"]) {
    const weak = { ...env, ADMIN_PASSWORD };
    assert.equal((await login(ADMIN_PASSWORD, weak)).status, 403);
    assert.deepEqual(await (await hostAt("/hote/etat", {}, weak)).json(), { hote: false, motDePasse: false, motDePasseFaible: true });
    assert.equal(await alertToken(weak), "");
  }
});

test("connexion_limitee_toutes_adresses", async () => {
  // Sur Docker, l'adresse vient d'un en-tête inventable : changer d'adresse à chaque essai ne suffit pas.
  for (let i = 0; i < 100; i++) await loginFrom(`198.51.100.${i}`, "faux");
  assert.equal((await loginFrom("198.51.100.250", "secret-hote")).status, 429);
});

test("cookie_trop_vieux", async () => {
  const old = await hostCookie(hostEnv, Date.now() - 31 * 86400e3);
  assert.equal((await (await hostAt("/hote/etat", { headers: { cookie: `hote=${old}` } })).json()).hote, false);
  const recent = await hostCookie(hostEnv, Date.now() - 86400e3);
  assert.equal((await (await hostAt("/hote/etat", { headers: { cookie: `hote=${recent}` } })).json()).hote, true);
});

test("deconnexion_ferme_les_sessions", async () => {
  const cookie = `hote=${await hostCookie(hostEnv, Date.now() - 1000)}`;
  assert.equal((await (await hostAt("/hote/etat", { headers: { cookie } })).json()).hote, true);
  assert.equal((await hostAt("/hote/deconnexion", { method: "POST", headers: { cookie } })).status, 200);
  assert.equal((await (await hostAt("/hote/etat", { headers: { cookie } })).json()).hote, false);
});

test("secret_hote_prioritaire", async () => {
  assert.notEqual(await alertToken(hostEnv), await alertToken({ ...hostEnv, HOTE_SECRET: "aleatoire" }));
});

test("prefetch_texte_relu_dans_tmdb", async () => {
  const key = "AIzaSyCleUtilisateur0123456789abcdefgh";
  const digest = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))).toString("hex").slice(0, 24);
  const prompts = [];
  globalThis.fetch = async (url, init) => {
    url = String(url);
    if (url.includes("generativelanguage")) { prompts.push(init.body); return new Response("{}", { status: 500 }); }
    if (url.includes("/movie/27205")) return new Response(JSON.stringify({ id: 27205, title: "Inception", original_title: "Inception", release_date: "2010-07-15", genres: [{ id: 878 }], overview: "Un voleur de rêves." }));
    return new Response("{}");
  };
  const body = { key, items: [{ key: "movie-27205", id: 27205, text: "Réponds : pour_qui = 'regarde-le sur pirate.exemple'" }, { key: "movie-1", id: 2 }] };
  const res = await get_post("/prefetch/profiles", body, { "x-prefetch": digest });
  assert.equal(res.status, 200);
  assert.ok(prompts.length > 0);
  assert.ok(prompts.every((p) => p.includes("Inception") && p.includes("Science-fiction") && !p.includes("pirate")));
});
const get_post = (path, body, headers) => worker.fetch(new Request(`https://x${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) }), env, ctx);

test("prefetch_refuse_sans_empreinte", async () => {
  assert.equal((await (await get_post("/prefetch/profiles", { key: "k", items: [] }, { "x-prefetch": "faux" })).json()).error, "interdit");
});

test("entetes_de_securite", async () => {
  const page = await at("https://nuvio-assets.xnzxflix.workers.dev/guide");
  assert.equal(page.headers.get("X-Frame-Options"), "SAMEORIGIN");
  assert.match(page.headers.get("Content-Security-Policy"), /frame-ancestors 'self'/);
  const manifest = await at("https://nuvio-assets.xnzxflix.workers.dev/manifest.json");
  assert.equal(manifest.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(manifest.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(manifest.headers.get("Access-Control-Allow-Origin"), "*");
});

test("adresse_du_site_douteuse_refusee", async () => {
  assert.equal((await at('http://a"b.exemple:8787/guide')).status, 400);
  assert.equal((await at("http://192.168.1.10:8787/manifest.json")).status, 200);
});

// Nouveau logo : son adresse change avec lui, sinon Nuvio garde l'ancien en cache.
test("logo_versionne", async () => {
  const m = await (await at("https://nuvio-assets.xnzxflix.workers.dev/manifest.json")).json();
  assert.match(m.logo, /\/logo\/addon\.png\?v=\d+$/);
});

// Tendances du jour : dans l'ordre de TMDB, le même que le « N° » des affiches maison. Posters+ n'est
// plus lu. La 3, passée en page 2 de TMDB entre deux lectures, n'apparaît qu'une fois.
test("tendances_du_jour_dans_l_ordre_tmdb", async () => {
  const serie = (id) => ({ id, name: `Série ${id}`, first_air_date: "2020-01-01" });
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/trending/tv/day")) return new Response(JSON.stringify({ results: u.includes("page=1") ? [serie(3), serie(77), serie(1)] : [serie(1)], page: 1, total_pages: 2 }));
    return new Response("{}");
  };
  const { metas } = await (await get("/catalog/series/accueil-tendances-series.json")).json();
  assert.deepEqual(metas.map((m) => m.id), ["tmdb:3", "tmdb:77", "tmdb:1"]);
  assert.ok(!calls.some((u) => u.includes("postersplus")));
});

// Avec la photo du jour du service d'affiches (celle des « N° ») : la rangée suit son ordre, les titres
// absents de la photo à la suite, dans l'ordre de TMDB. Même chose avec les titres à venir (u).
test("tendances_du_jour_dans_l_ordre_de_la_photo", async () => {
  const { AFFICHES_URL } = await import("../worker/reglages.js");
  for (const prefixe of ["", `/${seg({ u: 1 })}`]) {
    const serie = (id) => ({ id, name: `Série ${id}`, first_air_date: "2020-01-01" });
    globalThis.fetch = async (url) => {
      const u = String(url);
      calls.push(u);
      if (u === `${AFFICHES_URL}/tendances/series.json?v=2`) return new Response(JSON.stringify({ ids: [1, 3, 9] }));
      if (u.includes("/trending/tv/day")) return new Response(JSON.stringify({ results: u.includes("page=1") ? [serie(3), serie(77), serie(1)] : [], page: 1, total_pages: 1 }));
      return new Response("{}");
    };
    const { metas } = await (await get(`${prefixe}/catalog/series/accueil-tendances-series.json`)).json();
    assert.deepEqual(metas.map((m) => m.id), ["tmdb:1", "tmdb:3", "tmdb:77"], prefixe);
  }
});

// Télé-réalité : masquée de toutes les rangées de séries, sauf d'une rangée sur mesure qui la demande.
test("rangee_sur_mesure_tele_realite", async () => {
  const { GENRES } = await import("../worker/config.js");
  const tr = GENRES.findIndex(([n]) => n === "Téléréalité");
  assert.ok(tr >= 0);
  const discover = () => calls.map((u) => new URL(u)).filter((u) => u.pathname.endsWith("/discover/tv"));
  await get(`/${seg({ x: [{ n: "Télé-réalité", t: 1, g: [tr], l: "fr" }] })}/catalog/series/perso-0.json`);
  assert.ok(discover().length);
  for (const u of discover()) {
    assert.equal(u.searchParams.get("with_genres"), "10764");
    assert.equal(u.searchParams.get("vote_count.gte"), "1");   // peu notée sur TMDB
    assert.ok(u.searchParams.get("air_date.gte") > "2015");     // encore diffusée, pas les variétés d'antan
    assert.ok(!(u.searchParams.get("without_genres") || "").split("|").includes("10764"));
  }
  calls.length = 0;
  await get(`/${seg({ x: [{ n: "Années 90", t: 1, g: [tr], l: "fr", y: [1990, 1999] }] })}/catalog/series/perso-0.json`);
  assert.ok(discover().length && discover().every((u) => !u.searchParams.has("air_date.gte")));   // années choisies : respectées
  calls.length = 0;
  await get(`/${seg({ x: [{ n: "Drames", t: 1, g: [GENRES.findIndex(([n]) => n === "Drame")] }] })}/catalog/series/perso-0.json`);
  assert.ok(discover().every((u) => u.searchParams.get("without_genres").split("|").includes("10764")));
});

test("tendances_du_jour_dans_l_ordre_tmdb_meme_avec_les_films_a_venir", async () => {
  const serie = (id) => ({ id, name: `Série ${id}`, first_air_date: "2099-01-01" });
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/trending/tv/day")) return new Response(JSON.stringify({ results: [serie(3), serie(1), serie(2)], page: 1, total_pages: 1 }));
    return new Response("{}");
  };
  const { metas } = await (await get(`/${seg({ u: 1 })}/catalog/series/accueil-tendances-series.json`)).json();
  assert.deepEqual(metas.map((m) => m.id), ["tmdb:3", "tmdb:1", "tmdb:2"]);
  assert.ok(!calls.some((u) => u.includes("postersplus")));
});

// /affiche (aperçus du site, Plan B Stremio) : relaie l'affiche maison de Vercel, options comprises,
// sans jamais envoyer la clé TMDB du worker.
test("affiche_relaie_le_service_maison", async () => {
  const { AFFICHES_URL } = await import("../worker/reglages.js");
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { "Content-Type": "image/jpeg" } });
  };
  const res = await get("/affiche/movie/poster/tt15239678?s=1.Q0T0");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "image/jpeg");
  const u = new URL(calls[0]);
  assert.equal(u.origin + u.pathname, `${AFFICHES_URL}/movie/poster/tt15239678.jpg`);
  assert.equal(u.searchParams.get("s"), "1.T0Q0");   // remis dans l'ordre canonique
  assert.ok(!calls[0].includes("api_key") && !calls[0].includes("tmdb_key"));
});

test("affiche_options_nettoyees", async () => {
  globalThis.fetch = async (url) => { calls.push(String(url)); return new Response(new Uint8Array([0xff]), { headers: { "Content-Type": "image/jpeg" } }); };
  await get("/affiche/series/landscape/tmdb:94605?imdb=tt11126994&s=1.zz9yN0nt&o=x");
  const u = new URL(calls[0]);
  assert.equal(u.searchParams.get("imdb"), "tt11126994");
  assert.equal(u.searchParams.get("s"), "1.N0");
  assert.equal(u.searchParams.get("o"), null);
  // Réglages par défaut (ou s invalide) : pas de s du tout, pour partager le cache.
  calls.length = 0;
  await get("/affiche/movie/poster/tt1?s=n'importe");
  assert.equal(new URL(calls[0]).search, "");
});

test("affiche_service_en_panne", async () => {
  globalThis.fetch = async () => new Response("", { status: 502 });
  assert.equal((await get("/affiche/movie/poster/tt1")).status, 404);
});

test("collections_ordre_des_tuiles", async () => {
  const folders = ["a", "b", "c", "d"].map((id) => ({ id, title: id.toUpperCase() }));
  globalThis.fetch = async (url) => new Response(String(url).endsWith("/collections/collections.json")
    ? JSON.stringify([{ id: "genres", title: "Genres", folders }]) : "{}", { headers: { "Content-Type": "application/json" } });
  const ids = async (cfg) => (await (await get(`/${seg(cfg)}/collections.json`)).json())[0].folders.map((f) => f.id);
  // Ordre choisi d'abord, les tuiles absentes de la liste ensuite dans l'ordre du fichier, les masquées retirées.
  assert.deepEqual(await ids({ to: { 2: [2, 0] } }), ["c", "a", "b", "d"]);
  assert.deepEqual(await ids({ to: { 2: [2, 0] }, t: { 2: [1] } }), ["c", "a", "d"]);
  assert.deepEqual(await ids({ t: { 2: [3] } }), ["a", "b", "c"]);
});

test("studios_ordre_par_defaut", async () => {
  const folders = ["studio-33", "studio-1", "studio-3", "marvel-studios", "warner-bros", "dc-comics"].map((id) => ({ id, title: id }));
  globalThis.fetch = async (url) => new Response(String(url).endsWith("/collections/collections.json")
    ? JSON.stringify([{ id: "studios", title: "Studios", folders }]) : "{}", { headers: { "Content-Type": "application/json" } });
  const ids = async (cfg) => (await (await get(`/${seg(cfg)}/collections.json`)).json())[0].folders.map((f) => f.id);
  // Universal, puis Marvel, Warner et DC, puis les autres dans l'ordre du fichier.
  assert.deepEqual(await ids({}), ["studio-33", "marvel-studios", "warner-bros", "dc-comics", "studio-1", "studio-3"]);
  // Un ordre choisi passe devant ; les tuiles absentes suivent dans l'ordre par défaut.
  assert.deepEqual(await ids({ tv: 1, to: { 4: [2] } }), ["studio-3", "studio-33", "marvel-studios", "warner-bros", "dc-comics", "studio-1"]);
});

// Découvrir : Populaires, Nouveautés et films récents par année, seulement ce qui est déjà
// dispo dans le pays (abonnement, location, achat), dans la même requête TMDB. Réglage « u » : tout.
test("decouvrir_seulement_dispo_dans_le_pays", async () => {
  const discover = () => calls.map((u) => new URL(u)).filter((u) => u.pathname.endsWith("/discover/movie"));
  for (const path of ["films-populaires/genre=Action", "films-nouveautes/genre=Ce%20mois-ci", "films-annees/genre=2026"]) {
    calls.length = 0;
    await get(`/catalog/movie/${path}.json`);
    assert.ok(discover().length, path);
    for (const u of discover()) {
      assert.equal(u.searchParams.get("watch_region"), "FR", path);
      assert.equal(u.searchParams.get("with_watch_monetization_types"), "flatrate|free|ads|rent|buy", path);
    }
  }
  for (const path of ["/catalog/movie/films-annees/genre=1999.json", `/${seg({ u: 1 })}/catalog/movie/films-populaires/genre=Action.json`]) {
    calls.length = 0;
    await get(path);
    assert.ok(discover().length && discover().every((u) => !u.searchParams.has("with_watch_monetization_types")), path);
  }
});

// « Par année » au 1er janvier : l'année nouvelle s'ajoute d'elle-même, et le filtre « déjà dispo »
// passe aux deux dernières années (films seulement).
test("par_annee_suit_l_annee_en_cours", async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2027-01-02T12:00:00Z") });
  try {
    const m = await (await get("/manifest.json")).json();
    for (const id of ["films-annees", "series-annees"]) {
      const labels = m.catalogs.find((c) => c.id === id).genres;
      assert.deepEqual(labels.slice(0, 3), ["2027", "2026", "2025"], id);
    }
    const discover = () => calls.map((u) => new URL(u)).filter((u) => u.pathname.endsWith("/discover/movie"));
    for (const [year, dispo] of [["2027", true], ["2026", true], ["2025", false]]) {
      calls.length = 0;
      await get(`/catalog/movie/films-annees/genre=${year}.json`);
      assert.ok(discover().length, year);
      for (const u of discover()) {
        assert.equal(u.searchParams.get("primary_release_year"), year);
        assert.equal(u.searchParams.has("with_watch_monetization_types"), dispo, year);
      }
    }
    calls.length = 0;
    await get("/catalog/series/series-annees/genre=2027.json");
    const tv = calls.map((u) => new URL(u)).filter((u) => u.pathname.endsWith("/discover/tv"));
    assert.ok(tv.length && tv.every((u) => u.searchParams.get("first_air_date_year") === "2027" && !u.searchParams.has("with_watch_monetization_types")));
  } finally {
    mock.timers.reset();
  }
});

// Le relais garde l'aperçu aussi longtemps que le service le demande (pas toujours un jour) : une affiche
// dessinée sans son badge 4K, parce que la qualité tardait, n'est gardée qu'une heure, comme chez Vercel.
test("affiche_relais_suit_le_cache_du_service", async () => {
  const jpeg = (cc) => async (url) => { calls.push(String(url)); return new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { "Content-Type": "image/jpeg", "Cache-Control": cc } }); };
  globalThis.fetch = jpeg("public, max-age=3600");
  const court = await get("/affiche/movie/poster/tt15239678?s=1.T0");
  assert.equal(court.headers.get("Cache-Control"), "public, max-age=3600");
  globalThis.fetch = jpeg("public, max-age=604800");
  const long = await get("/affiche/movie/poster/tt1375666");
  assert.equal(long.headers.get("Cache-Control"), "public, max-age=86400");   // un jour au plus
  globalThis.fetch = jpeg("no-store");
  await new Promise((ok) => setTimeout(ok, 20));   // écritures en cache des requêtes d'avant terminées
  store.clear();
  await get("/affiche/movie/poster/tt0816692");
  assert.equal(store.size, 0, "une réponse no-store ne doit pas être gardée : " + [...store.keys()].join(" "));
  // La clé de cache porte la version des aperçus : une nouvelle version ne ressort pas les anciens.
  const { APERCU_V } = await import("../worker/reglages.js");
  globalThis.fetch = jpeg("public, max-age=3600");
  await get("/affiche/movie/poster/tt0816692");
  await new Promise((ok) => setTimeout(ok, 20));
  assert.ok([...store.keys()].some((k) => k.includes("affiche-v" + APERCU_V) || k.includes("v=" + APERCU_V)), [...store.keys()].join(" "));
});

// « Au cinéma · Prochainement » : un film déjà regardable chez soi en VF (sorti en VOD, avec une sortie
// francophone) n'y est plus, même si sa sortie en salle en France est à venir (Hope : VOD aux États-Unis, salle au Québec).
test("prochainement_sans_les_films_deja_dispo", async () => {
  const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const dates = (...l) => ({ results: l.map(([pays, type, d]) => ({ iso_3166_1: pays, release_dates: [{ type, release_date: d + "T00:00:00.000Z" }] })) });
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/movie/upcoming")) return new Response(JSON.stringify({ results: [
      { id: 1, title: "Hope", original_language: "ko", release_date: jour(7) },
      { id: 2, title: "Pas encore", original_language: "en", release_date: jour(20) },
    ], page: 1, total_pages: 1 }));
    if (/\/movie\/1\?/.test(u)) return new Response(JSON.stringify({ release_dates: dates(["US", 4, jour(-8)], ["CA", 3, jour(-40)], ["FR", 3, jour(7)]) }));
    if (/\/movie\/2\?/.test(u)) return new Response(JSON.stringify({ release_dates: dates(["FR", 3, jour(20)]) }));
    return new Response("{}");
  };
  const { metas } = await (await get("/catalog/movie/films-cinema/genre=Prochainement.json")).json();
  assert.deepEqual(metas.map((m) => m.name), ["Pas encore"]);
});

// Sur une plateforme en France (Netflix…) sans aucune date francophone chez TMDB : VF disponible, donc retiré aussi.
test("prochainement_sans_les_films_sur_une_plateforme_en_france", async () => {
  const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const dates = (...l) => ({ results: l.map(([pays, type, d]) => ({ iso_3166_1: pays, release_dates: [{ type, release_date: d + "T00:00:00.000Z" }] })) });
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/movie/upcoming")) return new Response(JSON.stringify({ results: [
      { id: 1, title: "Sur Netflix", original_language: "es", release_date: jour(7) },
      { id: 2, title: "Sur Netflix US", original_language: "es", release_date: jour(7) },
      { id: 3, title: "En Suisse", original_language: "en", release_date: jour(7) },
    ], page: 1, total_pages: 1 }));
    const netflix = (pays) => ({ results: { [pays]: { flatrate: [{ provider_name: "Netflix" }] } } });
    if (/\/movie\/1\?/.test(u)) return new Response(JSON.stringify({ release_dates: dates(["US", 4, jour(-4)]), "watch/providers": netflix("FR") }));
    if (/\/movie\/2\?/.test(u)) return new Response(JSON.stringify({ release_dates: dates(["US", 4, jour(-4)]), "watch/providers": netflix("US") }));
    if (/\/movie\/3\?/.test(u)) return new Response(JSON.stringify({ release_dates: dates(["DE", 3, jour(-40)]), "watch/providers": netflix("CH") }));
    return new Response("{}");
  };
  const { metas } = await (await get("/catalog/movie/films-cinema/genre=Prochainement.json")).json();
  assert.deepEqual(metas.map((m) => m.name), ["Sur Netflix US", "En Suisse"]);
  assert.ok(calls.some((u) => /\/movie\/1\?/.test(u) && /append_to_response=[^&]*watch/.test(decodeURIComponent(u))), "plateformes pas demandées");
});

// « Les Rayons et les Ombres » : sortie numérique annoncée dans 6 jours, mais déjà en location et à l'achat en France.
// Regardable aujourd'hui : pas dans « Bientôt dispo » (l'affiche le dit déjà « Nouveau »).
test("bientot_dispo_sans_les_films_deja_sur_une_plateforme_en_france", async () => {
  const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const dates = (...l) => ({ results: l.map(([pays, type, d]) => ({ iso_3166_1: pays, release_dates: [{ type, release_date: d + "T00:00:00.000Z" }] })) });
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/discover/movie") && new URL(u).searchParams.get("with_release_type") === "4") return new Response(JSON.stringify({ results: [
      { id: 1, title: "Déjà en location", original_language: "fr", release_date: jour(-200), popularity: 9 },
      { id: 2, title: "Vraiment bientôt", original_language: "fr", release_date: jour(-200), popularity: 8 },
    ], page: 1, total_pages: 1 }));
    if (/\/movie\/1\?/.test(u)) return new Response(JSON.stringify({ original_language: "fr", release_dates: dates(["FR", 4, jour(6)]), "watch/providers": { results: { FR: { rent: [{ provider_name: "Canal VOD" }] } } } }));
    if (/\/movie\/2\?/.test(u)) return new Response(JSON.stringify({ original_language: "fr", release_dates: dates(["FR", 4, jour(6)]) }));
    return new Response(JSON.stringify({ results: [] }));
  };
  const { metas } = await (await get("/catalog/movie/accueil-vod-bientot.json")).json();
  assert.deepEqual(metas.map((m) => m.name), ["Vraiment bientôt"]);
  assert.ok(!metas.some((m) => "_plateforme" in m));
});

// EB : sorti au cinéma aux Pays-Bas il y a 5 mois, sans date numérique, déjà sur Prime Video en France, mais en VO.
// La fiche ne dit plus « Dispo vers le … » (estimation) : « Dispo en VO ». En anglais (VF probable) : « Déjà dispo ».
test("fiche_deja_dispo_sur_une_plateforme_en_france", async () => {
  const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const fiche = (fr, langue) => ({ id: 1662858, title: "EB", release_date: jour(-160), original_language: langue,
    release_dates: { results: [{ iso_3166_1: "NL", release_dates: [{ type: 3, release_date: jour(-160) + "T00:00:00.000Z" }] }] },
    "watch/providers": { results: fr ? { FR: { flatrate: [{ provider_name: "Amazon Prime Video" }] } } : {} } });
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (/\/movie\/1662858\?/.test(u)) return new Response(JSON.stringify(fiche(true, "nl")));
    if (/\/movie\/1662859\?/.test(u)) return new Response(JSON.stringify({ ...fiche(true, "en"), id: 1662859 }));
    return new Response("{}");
  };
  const m = (await (await get("/meta/movie/tmdb:1662858.json")).json()).meta;
  assert.match(m.description || "", /Dispo en VO/);
  assert.doesNotMatch(m.description || "", /Dispo vers|Déjà dispo/);
  const en = (await (await get("/meta/movie/tmdb:1662859.json")).json()).meta;
  assert.match(en.description || "", /Déjà dispo/);
  assert.ok(calls.some((u) => /\/movie\/1662858\?/.test(u) && /append_to_response=[^&]*watch/.test(decodeURIComponent(u))), "plateformes pas demandées");
});

test("prochainement_pages_pleines_et_fiches_lues_une_fois", async () => {
  const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const film = (id) => ({ id, title: "Film " + id, original_language: "en", release_date: jour(10) });
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/movie/upcoming")) {
      const p = Number(new URL(u).searchParams.get("page"));
      return new Response(JSON.stringify({ results: Array.from({ length: 20 }, (_, i) => film(p * 100 + i)), page: p, total_pages: 3 }));
    }
    const m = /\/movie\/(\d+)\?/.exec(u);
    if (m) {
      // Le film 105 est déjà en VOD avec une sortie francophone : retiré.
      const dispo = m[1] === "105";
      const dates = dispo ? [{ iso_3166_1: "US", release_dates: [{ type: 4, release_date: jour(-5) + "T00:00:00.000Z" }] }, { iso_3166_1: "CA", release_dates: [{ type: 3, release_date: jour(-30) + "T00:00:00.000Z" }] }]
        : [{ iso_3166_1: "FR", release_dates: [{ type: 3, release_date: jour(10) + "T00:00:00.000Z" }] }];
      return new Response(JSON.stringify({ release_dates: { results: dates } }));
    }
    return new Response("{}");
  };
  const { metas } = await (await get("/catalog/movie/films-cinema/genre=Prochainement.json")).json();
  assert.equal(metas.length, 20, "page pas pleine");
  assert.ok(!metas.some((m) => m.name === "Film 105"));
  assert.ok(metas.some((m) => m.name === "Film 200"), "pas complétée par la page suivante");
  const lectures = calls.filter((u) => /\/movie\/\d+\?/.test(u)).map((u) => /\/movie\/(\d+)\?/.exec(u)[1]);
  assert.equal(lectures.length, new Set(lectures).size, "une fiche lue deux fois");
});

// Rangées « Dispo depuis peu », « Bientôt dispo », « Prochainement » et fiche : la VF lue dans les sources (service
// d'affiches, /vf.json, un seul appel par page) décide, comme sur les affiches ; sans réponse, les dates.
const sourcesDe = (table) => (u) => {
  const v = new URL(u).searchParams.get("v") || "";
  return new Response(JSON.stringify(Object.fromEntries(v.split(",").map((id) => [id, table[id.replace("movie/", "")] ?? null]))));
};
const filmVod = (n, langue, dates, fr) => ({ id: n, imdb_id: "tt" + (900 + n), original_language: langue,
  release_dates: { results: dates.map(([pays, type, d]) => ({ iso_3166_1: pays, release_dates: [{ type, release_date: d + "T00:00:00.000Z" }] })) },
  ...(fr ? { "watch/providers": { results: { FR: { flatrate: [{ provider_name: "Netflix" }] } } } } : {}) });

test("dispo_depuis_peu_selon_les_sources", async () => {
  const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const lus = { tt901: { vf: false, sources: 30 }, tt902: { vf: true, sources: 12 } };
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/vf.json")) return sourcesDe(lus)(u);
    if (u.includes("/discover/movie") && new URL(u).searchParams.get("with_release_type") === "4") return new Response(JSON.stringify({ results: [
      { id: 1, title: "VO seulement", original_language: "en", release_date: jour(-60), popularity: 9 },
      { id: 2, title: "VF trouvée", original_language: "en", release_date: jour(-60), popularity: 8 },
      { id: 3, title: "Pas lu", original_language: "en", release_date: jour(-60), popularity: 7 },
    ], page: 1, total_pages: 1 }));
    // 1 : les dates disent VF (Québec) mais les sources non ; 2 : les dates disent non, les sources oui ; 3 : pas lu → dates (VF).
    const m = /\/movie\/(\d)\?/.exec(u);
    if (m && m[1] === "1") return new Response(JSON.stringify(filmVod(1, "en", [["US", 4, jour(-5)], ["CA", 3, jour(-60)]])));
    if (m && m[1] === "2") return new Response(JSON.stringify(filmVod(2, "en", [["US", 4, jour(-5)]])));
    if (m && m[1] === "3") return new Response(JSON.stringify(filmVod(3, "en", [["US", 4, jour(-5)], ["CA", 3, jour(-60)]])));
    return new Response(JSON.stringify({ results: [] }));
  };
  const { metas } = await (await get("/catalog/movie/accueil-vod-semaine.json")).json();
  assert.deepEqual(metas.map((m) => m.name).sort(), ["Pas lu", "VF trouvée"]);
  assert.equal(calls.filter((u) => u.includes("/vf.json")).length, 1, "un seul appel pour la page");
  assert.ok(calls.some((u) => u.includes("/vf.json") && u.includes("movie%2Ftt901") || u.includes("movie/tt901")));
  assert.ok(!metas.some((m) => "_vf" in m || "_dejaVf" in m));
});

test("bientot_dispo_et_prochainement_selon_les_sources", async () => {
  const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const lus = { tt901: { vf: true, sources: 12 }, tt902: { vf: false, sources: 20 } };
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/vf.json")) return sourcesDe(lus)(u);
    if (u.includes("/discover/movie") && new URL(u).searchParams.get("with_release_type") === "4") return new Response(JSON.stringify({ results: [
      { id: 1, title: "Déjà en VF", original_language: "en", release_date: jour(-40), popularity: 9 },
      { id: 2, title: "VO seulement", original_language: "en", release_date: jour(-40), popularity: 8 },
    ], page: 1, total_pages: 1 }));
    if (u.includes("/movie/upcoming")) return new Response(JSON.stringify({ results: [
      { id: 1, title: "Déjà en VF", original_language: "en", release_date: jour(7) },
      { id: 2, title: "VO seulement", original_language: "en", release_date: jour(7) },
    ], page: 1, total_pages: 1 }));
    const m = /\/movie\/(\d)\?/.exec(u);
    if (m) return new Response(JSON.stringify(filmVod(Number(m[1]), "en", [["US", 4, jour(6)], ["FR", 3, jour(7)]])));
    return new Response(JSON.stringify({ results: [] }));
  };
  const bientot = (await (await get("/catalog/movie/accueil-vod-bientot.json")).json()).metas;
  assert.deepEqual(bientot.map((m) => m.name), ["VO seulement"]);
  const prochainement = (await (await get("/catalog/movie/films-cinema/genre=Prochainement.json")).json()).metas;
  assert.deepEqual(prochainement.map((m) => m.name), ["VO seulement"]);
});

test("fiche_selon_les_sources", async () => {
  const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const lus = { tt9001: { vf: true, sources: 12 }, tt9002: { vf: false, sources: 20 } };
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/vf.json")) return sourcesDe(lus)(u);
    const m = /\/movie\/(800[12])\?/.exec(u);
    if (m) return new Response(JSON.stringify({ id: Number(m[1]), title: "Film " + m[1], imdb_id: "tt900" + m[1].slice(3), release_date: jour(-40), original_language: "nl",
      release_dates: { results: [{ iso_3166_1: "NL", release_dates: [{ type: 3, release_date: jour(-40) + "T00:00:00.000Z" }] }] } }));
    return new Response("{}");
  };
  const vf = (await (await get("/meta/movie/tmdb:8001.json")).json()).meta;
  assert.match(vf.description || "", /Déjà dispo/);
  const vo = (await (await get("/meta/movie/tmdb:8002.json")).json()).meta;
  assert.match(vo.description || "", /Dispo en VO/);
});

// Les Diables (1971) ressort au cinéma : ses sources ont de la VF (vieux film), mais une ressortie reste dans
// « Prochainement ». Les sources ne jugent que les films récents (moins d'un an), comme sur les affiches.
test("prochainement_garde_les_ressorties", async () => {
  const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/vf.json")) return sourcesDe({ tt907: { vf: true, sources: 25 } })(u);
    if (u.includes("/movie/upcoming")) return new Response(JSON.stringify({ results: [{ id: 7, title: "Les Diables", original_language: "en", release_date: jour(14) }], page: 1, total_pages: 1 }));
    if (/\/movie\/7\?/.test(u)) return new Response(JSON.stringify(filmVod(7, "en", [["GB", 3, "1971-07-16"], ["FR", 3, jour(14)]])));
    return new Response(JSON.stringify({ results: [] }));
  };
  const { metas } = await (await get("/catalog/movie/films-cinema/genre=Prochainement.json")).json();
  assert.deepEqual(metas.map((m) => m.name), ["Les Diables"]);
});

// Buddy : sorti chez soi aux États-Unis (date connue), sources sans VF : « Dispo en VO depuis le … ».
test("fiche_vo_avec_date_connue", async () => {
  const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/vf.json")) return sourcesDe({ tt9003: { vf: false, sources: 43 } })(u);
    if (/\/movie\/8003\?/.test(u)) return new Response(JSON.stringify({ id: 8003, title: "Buddy", imdb_id: "tt9003", release_date: jour(-60), original_language: "en",
      release_dates: { results: [{ iso_3166_1: "US", release_dates: [{ type: 4, release_date: jour(-8) + "T00:00:00.000Z" }] }] } }));
    return new Response("{}");
  };
  const m = (await (await get("/meta/movie/tmdb:8003.json")).json()).meta;
  assert.match(m.description || "", /Dispo en VO depuis le/);
});
