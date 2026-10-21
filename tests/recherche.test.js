import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { smartSearch, prepareWords, personSplits } from "../worker/search.js";

// Recherche : plusieurs personnes ensemble (« pacino de niro »), avec un TMDB simulé. Les recherches d'avant (titre, personne seule, studio, année) ne doivent pas changer.

const film = (id, title, year, votes, extra = {}) => ({ id, title, original_title: title, release_date: `${year}-06-01`,
  vote_count: votes, popularity: votes / 100, poster_path: `/${id}.jpg`, genre_ids: [18], ...extra });
const serie = (id, name, year, votes, extra = {}) => ({ id, name, original_name: name, first_air_date: `${year}-01-01`,
  vote_count: votes, popularity: votes / 100, poster_path: `/${id}.jpg`, genre_ids: [18], ...extra });
const personne = (id, name, dept, votes) => ({ id, name, known_for_department: dept, popularity: 5,
  known_for: [{ media_type: "movie", id: id * 10, vote_count: votes }] });

const PACINO = personne(1158, "Al Pacino", "Acting", 20000);
const DE_NIRO = personne(380, "Robert De Niro", "Acting", 25000);
const SCORSESE = personne(1032, "Martin Scorsese", "Directing", 25000);
const HANKS = personne(31, "Tom Hanks", "Acting", 30000);
const RYAN = personne(5344, "Meg Ryan", "Acting", 5000);
const FROST = personne(11108, "Nick Frost", "Acting", 8000);
const NIXON = personne(38025, "Cynthia Nixon", "Acting", 6000);
const NOLAN = personne(525, "Christopher Nolan", "Directing", 35000);

const HEAT = film(949, "Heat", 1995, 8800);
const PARRAIN2 = film(240, "Le Parrain, 2e partie", 1974, 14500);
const IRISHMAN = film(398978, "The Irishman", 2019, 7800);
const SCARFACE = film(111, "Scarface", 1983, 13500);
const CASINO = film(524, "Casino", 1995, 6000);
const SEATTLE = film(858, "Nuits blanches à Seattle", 1993, 2800);
const MESSAGE = film(9489, "Vous avez un mess@ge", 1998, 3400);
const FROST_NIXON = film(11499, "Frost / Nixon, l'heure de vérité", 2009, 2000, { original_title: "Frost/Nixon" });

const CREDITS = {
  // Scarface : De Niro y a une voix non créditée (données TMDB) ; un montage d'archives avec les deux.
  "1158/movie": { cast: [{ ...HEAT, character: "Vincent Hanna", order: 0 }, { ...PARRAIN2, character: "Michael", order: 0 },
    { ...IRISHMAN, character: "Jimmy Hoffa", order: 1 }, { ...SCARFACE, character: "Tony Montana", order: 0 },
    { ...film(126314, "Final Cut", 2012, 92), character: "(archive footage)" }] },
  "380/movie": { cast: [{ ...HEAT, character: "Neil McCauley", order: 1 }, { ...PARRAIN2, character: "Vito", order: 1 },
    { ...IRISHMAN, character: "Frank Sheeran", order: 0 }, { ...SCARFACE, character: "Voice (uncredited)" },
    { ...CASINO, character: "Ace", order: 0 }, { ...film(126314, "Final Cut", 2012, 92), character: "(archive footage)" },
    { ...film(77, "Pacino et De Niro : la conversation", 2005, 50, { genre_ids: [99] }), character: "Self" }] },
  "1032/movie": { crew: [{ ...CASINO, job: "Director" }, { ...IRISHMAN, job: "Director" }, { ...film(500, "Shutter Island", 2010, 25000), job: "Director" },
    { ...HEAT, job: "Producer" }] },
  "31/movie": { cast: [{ ...SEATTLE, order: 0 }, { ...MESSAGE, order: 0 }, { ...film(13, "Forrest Gump", 1994, 28000), order: 0 }] },
  "5344/movie": { cast: [{ ...SEATTLE, order: 1 }, { ...MESSAGE, order: 1 }, { ...film(639, "Quand Harry rencontre Sally", 1989, 4000), order: 1 }] },
  "11108/movie": { cast: [{ ...film(4638, "Hot Fuzz", 2007, 7000), order: 1 }, { ...film(9999, "Un film ensemble", 2015, 400), order: 2 }] },
  "38025/movie": { cast: [{ ...film(9999, "Un film ensemble", 2015, 400), order: 0 }] },
  "525/movie": { crew: [{ ...film(27205, "Inception", 2010, 38000), job: "Director" }, { ...film(157336, "Interstellar", 2014, 37000), job: "Director" }] },
  // Séries : le talk-show (« Self ») ne compte pas.
  "1158/tv": { cast: [{ ...serie(70, "Angels in America", 2003, 400), episode_count: 6 }, { ...serie(71, "Talk-show", 1990, 300, { genre_ids: [10767] }), character: "Self" }] },
  "380/tv": { cast: [{ ...serie(70, "Angels in America", 2003, 400), episode_count: 1 }, { ...serie(71, "Talk-show", 1990, 300, { genre_ids: [10767] }), character: "Self" },
    { ...serie(72, "Zero Day", 2025, 300), episode_count: 6 }] },
};

const PEOPLE = {
  pacino: [PACINO], "de niro": [DE_NIRO], scorsese: [SCORSESE], "tom hanks": [HANKS], "meg ryan": [RYAN],
  frost: [FROST], nixon: [NIXON], nolan: [NOLAN],
};

// Résultats des recherches de titres (requête sans accents → résultats).
const TITLES = {
  heat: [HEAT], "frost nixon": [FROST_NIXON], "bonnie and clyde": [film(475, "Bonnie et Clyde", 1968, 2000, { original_title: "Bonnie and Clyde" })],
  "dune 2021": [film(438631, "Dune", 2021, 14000)], dune: [film(438631, "Dune", 2021, 14000), film(841, "Dune", 1985, 3000)],
  thriller: [film(9000, "Thriller", 1983, 900)], "annees 80": [film(8000, "Les Années 80", 1983, 120)],
  1917: [film(530915, "1917", 2020, 13000)], "les annees folles": [film(8001, "Les Années folles", 1960, 40)],
  "harry potter": [film(671, "Harry Potter à l'école des sorciers", 2001, 28000, { original_title: "Harry Potter and the Philosopher's Stone" })],
  "tom et jerry": [film(15602, "Tom et Jerry, le film", 1992, 600)],
};


const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
let calls;
beforeEach(() => { calls = []; });

/** search et api comme runSearch (index.js), budget compris, avec le TMDB simulé ci-dessus. */
function fakeTmdb(budget = 22) {
  let left = budget;
  const search = async (q, page, extra = {}) => {
    calls.push({ path: "search", q, page, extra });
    if (left-- <= 0) return {};
    if (extra.language || page > 1) return { results: [] };
    return { results: (TITLES[norm(q)] || []).map((it) => ({ ...it })), total_pages: 1 };
  };
  const api = async (path, params = {}) => {
    calls.push({ path, params });
    if (left-- <= 0) return {};
    if (path === "/search/person") return { results: PEOPLE[norm(params.query)] || [] };
    const c = /^\/person\/(\d+)\/(movie|tv)_credits$/.exec(path);
    if (c) return CREDITS[`${c[1]}/${c[2]}`] || { cast: [], crew: [] };
    return { results: [] };
  };
  return { search, api, left: () => left };
}

const VOCAB = prepareWords({ star: 200, wars: 100, fight: 80, club: 90, pacino: 1, niro: 1, scorsese: 1, dicaprio: 1, winslet: 1,
  frost: 2, nixon: 2, harry: 67, potter: 42, guerre: 91, haine: 10, kramer: 3, contre: 50 });
async function cherche(q, kind = "movie", page = 1, budget = 22) {
  const t = fakeTmdb(budget), trace = {}, stats = {};
  const out = await smartSearch(q, page, t.search, kind, t.api, { words: async () => VOCAB, trace, stats });
  return { out, names: out.map((it) => it.title || it.name), trace, stats, used: budget - t.left() };
}
const personSearches = () => calls.filter((c) => c.path === "/search/person").map((c) => norm(c.params.query));

// ---------- découpage en personnes ----------
test("decoupage_en_plusieurs_personnes", () => {
  assert.deepEqual(personSplits("pacino de niro", VOCAB), [["pacino", "de niro"]]);
  assert.deepEqual(personSplits("De Niro et Pacino", VOCAB), [["de niro", "pacino"]]);
  assert.deepEqual(personSplits("tom hanks meg ryan", VOCAB), [["tom hanks", "meg ryan"]]);
  assert.deepEqual(personSplits("Leonardo DiCaprio Kate Winslet", VOCAB), [["leonardo dicaprio", "kate winslet"]]);
  assert.deepEqual(personSplits("scorsese de niro", VOCAB), [["scorsese", "de niro"]]);
  assert.deepEqual(personSplits("samuel l jackson, john travolta", VOCAB), [["samuel l jackson", "john travolta"]]);
  assert.deepEqual(personSplits("pacino, de niro & pesci", VOCAB), [["pacino", "de niro", "pesci"]]);
  assert.deepEqual(personSplits("jean-paul belmondo alain delon", VOCAB)[0], ["jean paul belmondo", "alain delon"]);
  assert.deepEqual(personSplits("dicaprio winslet", VOCAB), [["dicaprio", "winslet"]]);
  // Jamais plus de 4 noms à chercher.
  for (const q of ["jennifer aniston courteney cox", "tommy lee jones will smith", "keanu reeves laurence fishburne carrie anne moss"]) {
    assert.ok(new Set(personSplits(q, VOCAB).flat()).size <= 4, q);
  }
});

test("titres_qui_ne_sont_pas_des_personnes", () => {
  for (const q of ["harry potter", "tom et jerry", "thelma et louise", "harry et sally", "bonnie and clyde", "jules et jim",
    "romeo et juliette", "la haine", "kramer contre kramer", "star wars", "fight club", "omar sy", "robert de niro", "al pacino",
    "1917", "dune 2", "the boys saison 4", "max et les ferrailleurs", "le diner de cons", "nolan", "la guerre des mondes"]) {
    assert.deepEqual(personSplits(q, VOCAB), [], q);
  }
  // Sans vocabulaire : pas de noms de famille seuls (on ne sait pas si ce sont des mots de titres).
  assert.deepEqual(personSplits("dicaprio winslet", null), []);
});

// ---------- recherche complète ----------
test("deux_acteurs_ensemble", async () => {
  for (const q of ["pacino de niro", "de niro et pacino", "films avec pacino et de niro"]) {
    calls = [];
    const r = await cherche(q);
    assert.match(r.trace.head, /^ensemble /, q);
    // Les plus connus d'abord ; ni rôle non crédité (Scarface), ni archives, ni documentaire.
    assert.deepEqual(r.names.slice(0, 3), ["Le Parrain, 2e partie", "Heat", "The Irishman"], q);
    assert.ok(!r.names.includes("Scarface") && !r.names.includes("Final Cut") && !r.names.some((n) => /conversation/.test(n)), q);
    assert.ok(r.stats.sure, q);                                   // pas besoin de Gemini
    assert.ok(r.used <= 12, `${q} : ${r.used} appels`);
    assert.ok(calls.every((c) => !String(c.path).startsWith("/discover")), q);
  }
  const r = await cherche("tom hanks meg ryan");
  assert.deepEqual(r.names.slice(0, 2), ["Vous avez un mess@ge", "Nuits blanches à Seattle"]);
});

test("acteur_et_realisateur", async () => {
  const r = await cherche("scorsese de niro");
  assert.equal(r.trace.head, "ensemble Martin Scorsese + Robert De Niro");
  // Réalisés par Scorsese, joués par De Niro : pas Heat (Scorsese n'y est que producteur… dans ce TMDB simulé).
  assert.deepEqual(r.names.slice(0, 2), ["The Irishman", "Casino"]);
  assert.ok(!r.names.includes("Heat") && !r.names.includes("Shutter Island"));
});

test("deux_acteurs_ensemble_series", async () => {
  const r = await cherche("pacino de niro", "series");
  assert.equal(r.names[0], "Angels in America");
  assert.ok(!r.names.includes("Talk-show"));
  assert.ok(calls.some((c) => c.path === "/person/1158/tv_credits"));
});

test("titre_avant_les_personnes", async () => {
  // « frost nixon » : deux personnes connues avec un film en commun, mais le titre Frost/Nixon reste devant.
  const r = await cherche("frost nixon");
  assert.equal(r.names[0], "Frost / Nixon, l'heure de vérité");
  assert.equal(r.names[1], "Un film ensemble");
  // Prénoms seuls : pas même une recherche de personnes.
  for (const q of ["bonnie and clyde", "tom et jerry", "harry potter"]) {
    calls = [];
    const t = await cherche(q);
    assert.equal(t.trace.head, null, q);
    assert.deepEqual(personSearches().filter((n) => n !== norm(q)), [], q);
    assert.equal(t.names[0], TITLES[norm(q)][0].title, q);
  }
});

test("une_seule_personne_inchangee", async () => {
  const r = await cherche("nolan");
  assert.equal(r.trace.head, "personne Christopher Nolan");
  assert.deepEqual(r.names, ["Inception", "Interstellar"]);
  assert.deepEqual(personSearches(), ["nolan"]);
  assert.ok(!calls.some((c) => String(c.path).startsWith("/discover")));
});

test("pas_de_noms_pour_un_titre", async () => {
  for (const q of ["dune 2021", "dune", "heat", "1917", "les annees folles", "annees 80", "thriller"]) {
    calls = [];
    const r = await cherche(q);
    assert.equal(r.trace.head, null, q);
    assert.equal(r.names[0], TITLES[norm(q)][0].title, q);
    assert.ok(!calls.some((c) => String(c.path).startsWith("/discover")), q);
    assert.ok(personSearches().every((n) => n === norm(q)), q);
  }
});

test("budget_des_nouvelles_recherches", async () => {
  // Au pire : 4 noms cherchés, 3 filmographies, la recherche de secours… toujours dans les 22 appels de runSearch.
  for (const [q, kind] of [["pacino, de niro et pesci", "movie"], ["jennifer aniston courteney cox", "series"],
    ["tommy lee jones will smith", "movie"]]) {
    calls = [];
    const r = await cherche(q, kind);
    assert.ok(r.used <= 20, `${q} : ${r.used} appels`);
  }
});
