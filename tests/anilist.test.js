import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { oeuvresDe, animesDe, oublierPauseAnilist } from "../worker/anilist.js";

// Réponses d'AniList réduites (relevées le 2026-10-23).
const media = (english, romaji, format, year, popularity, synonyms = []) => ({ title: { english, romaji }, synonyms, format, startDate: { year }, popularity });
const perso = (full, favourites, nodes, alternative = []) => ({ name: { full, alternative }, favourites, media: { nodes } });

const ICHIGO = {
  a: { media: [media("Strawberry 100%", "Ichigo 100%", "TV", 2005, 19721), media("Strawberry Candy", "Ichigo Ame", "MOVIE", 2020, 123),
    media("Strawberry Marshmallow", "Ichigo Mashimaro", "TV", 2005, 37705), media("Strawberry Marshmallow OVA", "Ichigo Mashimaro OVA", "OVA", 2007, 8341)] },
  c: { characters: [
    perso("Ichigo", 15767, [media("DARLING in the FRANXX", "DARLING in the FRANXX", "TV", 2018, 506441)]),
    perso("Ichigo Kurosaki", 14666, [media("Bleach", "BLEACH", "TV", 2004, 530913), media("BLEACH: Thousand-Year Blood War", "BLEACH: Sennen Kessen-hen", "TV", 2022, 212026)]),
    perso("Ichigo Hoshimiya", 478, [media("Aikatsu!", "Aikatsu!", "TV", 2012, 15967)]),
  ] },
};
const SNK = {
  a: { media: [media("Attack on Titan", "Shingeki no Kyojin", "TV", 2013, 1069303), media("Attack on Titan Final Season", "Shingeki no Kyojin: The Final Season", "TV", 2020, 651356),
    media("Attack on Titan OVA", "Shingeki no Kyojin OVA", "OVA", 2013, 132638), media("Attack on Titan Season 2", "Shingeki no Kyojin Season 2", "TV", 2017, 742917)] },
  c: { characters: [] },
};

test("personnage_vers_son_anime", () => {
  // Ichigo Kurosaki (Bleach) et Ichigo (Darling in the Franxx), les plus suivis d'abord ; pas Aikatsu! (478 favoris).
  assert.deepEqual(oeuvresDe("ichigo", ICHIGO).map((p) => [p.title, p.year, p.type]),
    [["Bleach", 2004, "serie"], ["DARLING in the FRANXX", 2018, "serie"], ["BLEACH: Thousand-Year Blood War", 2022, "serie"]]);
  // « gojo » : Satoru Gojou, une lettre de plus.
  const gojo = { a: { media: [] }, c: { characters: [perso("Satoru Gojou", 39434, [media("JUJUTSU KAISEN", "Jujutsu Kaisen", "TV", 2020, 987209),
    media("JUJUTSU KAISEN Season 2", "Jujutsu Kaisen 2nd Season", "TV", 2023, 501370), media("JUJUTSU KAISEN 0", "Gekijouban Jujutsu Kaisen 0", "MOVIE", 2021, 444182)])] } };
  assert.deepEqual(oeuvresDe("gojo", gojo).map((p) => [p.title, p.year, p.type]),
    [["JUJUTSU KAISEN", 2020, "serie"], ["JUJUTSU KAISEN 0", 2021, "film"]]);
});

test("nom_japonais_et_suites", () => {
  // Les saisons suivantes ramènent à la série (sans année : TMDB n'a qu'une fiche), une seule fois ; pas les OVA.
  assert.deepEqual(oeuvresDe("shingeki no kyojin", SNK).map((p) => [p.title, p.year]), [["Attack on Titan", 2013]]);
});

test("rien_de_connu_rien_de_rendu", () => {
  // « dune » : un clip et des figurants nommés Dune.
  const dune = { a: { media: [media("DUNE", "Suna no Wakusei", "MUSIC", 2017, 3699)] }, c: { characters: [perso("Dune", 11, [media("Casshern Sins", "Casshern Sins", "TV", 2008, 43409)])] } };
  assert.deepEqual(oeuvresDe("dune", dune), []);
  assert.deepEqual(oeuvresDe("ichigo", null), []);
});

// Gardé : une seconde recherche identique ne redemande pas AniList ; en panne (429) : null, rien de gardé.
let store, appels;
beforeEach(() => {
  oublierPauseAnilist();
  store = new Map();
  appels = 0;
  globalThis.caches = { default: {
    match: async (req) => (store.has(req.url) ? new Response(store.get(req.url)) : undefined),
    put: async (req, res) => { store.set(req.url, await res.text()); },
  } };
});

test("garde_et_panne", async () => {
  const vues = [];
  globalThis.fetch = async (url, init = {}) => { appels++; vues.push([String(url), (init.headers || {})["X-Relais-Cle"]]); return new Response(JSON.stringify({ data: ICHIGO })); };
  assert.equal((await animesDe("Ichigo", { AFFICHES_URL: "https://affiches.test", RELAIS_KEY: "cle" }))[0].title, "Bleach");
  // Par le relais du service d'affiches (AniList refuse Cloudflare), requête réduite, avec la clé du relais.
  assert.deepEqual(vues, [["https://affiches.test/anilist.json?q=ichigo", "cle"]]);
  assert.equal((await animesDe("ichigo"))[0].title, "Bleach");
  assert.equal(appels, 1);
  globalThis.fetch = async () => { appels++; return new Response(JSON.stringify({ erreur: 429 })); };
  assert.equal(await animesDe("luffy"), null);
  assert.ok(![...store.keys()].some((k) => k.includes("luffy")));
  // Refusé : une minute sans appel, la recherche continue sans AniList.
  assert.equal(await animesDe("zoro"), null);
  assert.equal(appels, 2);
});

test("pas_pour_les_premieres_lettres", async () => {
  globalThis.fetch = async () => { appels++; return new Response(JSON.stringify({ data: ICHIGO })); };
  assert.deepEqual(await animesDe("ich"), []);
  assert.equal(appels, 0);
});
