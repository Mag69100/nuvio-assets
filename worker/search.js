/**
 * Recherche du Catalogue FR, plus tolérante et mieux classée que celle de TMDB.
 *
 * Plusieurs recherches TMDB partent en même temps (requête telle quelle, nettoyée, corrigée,
 * au pluriel, sigle, année, personne, saga, studio, titres anglais), puis tous les résultats
 * sont classés ensemble : ressemblance du titre (français, original ou anglais) + notoriété
 * (nombre de votes, popularité). Un titre exact mais inconnu (« L'intouchable ») passe donc
 * après un titre presque exact et très connu (« Intouchables »).
 *   - sigles et surnoms : « got » → Game of Thrones, « jeu du calmar » → Squid Game…
 *   - mots en trop : « film barbie », « les films de nolan », « the boys saison 4 », « lupin partie 3 »
 *   - fautes de frappe : chaque mot inconnu est corrigé avec le vocabulaire des titres connus
 *     (data/search-words.json, refait chaque nuit) : « inseption » → inception, « le parain »
 *     → parrain. En dernier recours, débuts de mots (« inters ») que TMDB reconnaît.
 *   - titres anglais : « spirited away » → Le Voyage de Chihiro, « home alone » → Maman, j'ai raté l'avion
 *   - titres composés, au singulier comme au pluriel : « monstre » → les 4 séries Monstre
 *   - année : « dune 2021 » ; suites : « dune 2 », « star wars 4 », « jurassic world 2 »
 *   - acteurs et réalisateurs : « nolan », « omar sy » ; studios et plateformes : « pixar », « netflix »
 */

// Sigles et surnoms courants → titre à chercher. Clés en minuscules, sans accents ni ponctuation.
export const ALIASES = {
  got: "Game of Thrones", hotd: "House of the Dragon", hdd: "House of the Dragon",
  twd: "The Walking Dead", bb: "Breaking Bad", bcs: "Better Call Saul",
  tlou: "The Last of Us", himym: "How I Met Your Mother", tbbt: "The Big Bang Theory",
  b99: "Brooklyn Nine-Nine", ahs: "American Horror Story", lcdp: "La Casa de Papel",
  pll: "Pretty Little Liars", oitnb: "Orange Is the New Black", tvd: "The Vampire Diaries",
  soa: "Sons of Anarchy", gg: "Gossip Girl", st: "Stranger Things", ts: "The Sopranos",
  aot: "L'Attaque des Titans", snk: "L'Attaque des Titans", op: "One Piece",
  jjk: "Jujutsu Kaisen", mha: "My Hero Academia", hxh: "Hunter x Hunter",
  dbz: "Dragon Ball Z", dbs: "Dragon Ball Super", fma: "Fullmetal Alchemist", fmab: "Fullmetal Alchemist",
  opm: "One Punch Man", kny: "Demon Slayer", csm: "Chainsaw Man", sl: "Solo Leveling",
  lotr: "Le Seigneur des anneaux", sda: "Le Seigneur des anneaux", sdla: "Le Seigneur des anneaux",
  lsda: "Le Seigneur des anneaux", hp: "Harry Potter", sw: "Star Wars",
  potc: "Pirates des Caraïbes", pdc: "Pirates des Caraïbes", mib: "Men in Black",
  bttf: "Retour vers le futur", rvlf: "Retour vers le futur", ij: "Indiana Jones",
  jp: "Jurassic Park", tdk: "The Dark Knight", gotg: "Les Gardiens de la Galaxie",
  ff: "Fast & Furious", "fast and furious": "Fast & Furious",
  // Titres connus en France sous un autre nom que celui de TMDB.
  "jeu du calmar": "Squid Game", "le jeu du calmar": "Squid Game",
  "money heist": "La casa de papel", "la maison de papier": "La casa de papel",
};

// Studios et plateformes → recherche « discover » TMDB. Clés passées par norm() : « disney+ »,
// « canal+ » et « paramount+ » deviennent « disney », « canal », « paramount ».
const C = (id) => ({ with_companies: id });
const N = (id) => ({ with_networks: id });
const P = (id) => ({ with_watch_providers: id, with_watch_monetization_types: "flatrate" });
const STUDIO_LIST = [
  [["pixar", "disney pixar"], { movie: C("3") }],
  [["ghibli", "studio ghibli"], { movie: C("10342") }],
  [["marvel", "marvel studios", "mcu"], { movie: C("420") }],
  [["dc", "dc comics"], { movie: C("429|128064") }],
  [["dreamworks", "dreamworks animation"], { movie: C("521") }],
  [["illumination"], { movie: C("6704") }],
  [["lucasfilm"], { movie: C("1") }],
  [["warner", "warner bros"], { movie: C("174") }],
  [["universal"], { movie: C("33") }],
  [["a24"], { movie: C("41077") }],
  [["blumhouse"], { movie: C("3172") }],
  [["disney", "walt disney"], { movie: C("2|6125"), series: N("2739") }],
  [["disney plus"], { movie: P("337"), series: N("2739") }],
  [["netflix"], { movie: P("8"), series: N("213") }],
  [["prime video", "amazon", "amazon prime", "amazon prime video"], { movie: P("119"), series: N("1024") }],
  [["hbo", "hbo max"], { movie: P("1899"), series: N("49|3186") }],
  [["apple tv", "apple tv plus"], { movie: P("350"), series: N("2552") }],
  [["paramount", "paramount plus"], { movie: P("531"), series: N("4330") }],
  [["canal", "canal plus"], { movie: P("381"), series: N("285") }],
  [["crunchyroll"], { movie: P("283"), series: P("283") }],
];
export const STUDIOS = Object.fromEntries(STUDIO_LIST.flatMap(([keys, v]) => keys.map((k) => [k, v])));

// ---------- texte ----------
/** Minuscules, sans accents ni ponctuation, espaces simples. */
export function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Distance d'édition avec inversion de deux lettres (« teh » → « the »), arrêtée au-delà de max. */
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

/** Ressemblance entre deux mots (0 à 1). Un début de mot tapé en entier compte comme exact. */
function wordSim(q, w) {
  if (w.startsWith(q) && q.length >= 3) return 1;
  return 1 - levenshtein(q, w) / Math.max(q.length, w.length);
}

function bigrams(s) {
  const t = s.replace(/ /g, "");
  const out = new Map();
  for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); out.set(g, (out.get(g) || 0) + 1); }
  return out;
}

function dice(a, b) {
  const A = bigrams(a), B = bigrams(b);
  let inter = 0, total = 0;
  for (const [g, n] of A) { inter += Math.min(n, B.get(g) || 0); total += n; }
  for (const n of B.values()) total += n;
  return total ? (2 * inter) / total : 0;
}

/** Ressemblance entre la requête et un titre (0 à 1) : mot à mot + forme générale. */
export function similarity(query, title) {
  const q = norm(query), t = norm(title);
  if (!q || !t) return 0;
  if (q === t) return 1;
  const tw = t.split(" ");
  const qw = q.split(" ");
  const words = qw.reduce((sum, w) => sum + Math.max(...tw.map((x) => wordSim(w, x))), 0) / qw.length;
  // Le titre commence par la requête (« stranger things » → « Stranger Things : Chroniques… »).
  const prefix = t.startsWith(q) ? 1 : 0;
  return Math.max(0.6 * words + 0.4 * dice(q, t), prefix ? 0.9 + 0.1 * dice(q, t) : 0);
}

/** Titres d'un résultat : français, d'origine et anglais (ajouté par la recherche en anglais). */
const titlesOf = (it) => [it.title || it.name, it.original_title || it.original_name, it.en_title].filter(Boolean);

/** Meilleure ressemblance d'un résultat TMDB, tous titres confondus. */
export function scoreOf(query, it) {
  return Math.max(0, ...titlesOf(it).map((t) => similarity(query, t)));
}

const bare = (s) => norm(s).replace(/^(the|a|an|le|la|les|l|un|une) /, "");

/** Titre identique à la requête, article de tête mis à part (« office » → The Office). */
export function isExact(query, it) {
  const q = bare(query);
  return !!q && titlesOf(it).some((t) => bare(t) === q);
}

/** Sans article de tête ni « s » final aux mots : « Les Monstres » vaut « monstre ». */
const bareSingular = (s) => norm(s).split(" ").map((w) => (w.length > 3 ? w.replace(/s$/, "") : w)).join(" ")
  .replace(/^(the|a|an|le|la|les|l|un|une) /, "");

/**
 * Le titre est la requête, ou une partie d'un titre composé l'est, au singulier comme au pluriel :
 * « monstre » → « Monstre : L'Histoire d'Ed Gein », « DAHMER - Monstre : … », « Monstres : … ».
 * Un titre simple doit être identique (« cars » ne doit pas donner « The Car »).
 */
export function titleMatch(query, it) {
  if (isExact(query, it)) return true;
  const q = bareSingular(query);
  return !!q && titlesOf(it).some((t) => {
    const parts = String(t).split(/\s*[:–—]\s+|\s+-\s+/);
    return parts.length > 1 && parts.some((part) => bareSingular(part) === q);
  });
}

/**
 * La requête avec son premier mot long au pluriel (ou au singulier), que TMDB ne fait pas
 * correspondre : « monstre » → monstres, « pirate des caraibes » → pirates des caraibes.
 */
export function pluralVariant(query) {
  const words = query.trim().toLowerCase().split(/\s+/);
  const i = words.findIndex((w) => /^[a-zà-ÿ]{4,}$/.test(w));
  if (i < 0) return null;
  words[i] = words[i].endsWith("s") ? words[i].slice(0, -1) : `${words[i]}s`;
  return words.join(" ");
}

// Mots en trop autour du titre : « film barbie », « barbie le film », « les films de nolan ».
const NOISE_HEAD = /^(?:(?:le|la|les|un|une|des|the)\s+)?(?:films?|movies?|s[ée]ries?|animes?|anim[ée]s?|dessins? anim[ée]s?|documentaires?)\s+(?:(?:de|du|des)\s+|d['’]\s*)?/i;
const NOISE_TAIL = /\s+(?:(?:le|la|the)\s+)?(?:film|movie|s[ée]rie|series|anime)$/i;
// Séries : la saison ou l'épisode n'aide pas TMDB (« the boys saison 4 », « lupin partie 3 », « the witcher s3 »).
const SEASON_TAIL = /\s+(?:(?:saison|season|partie|part|livre|book|s)\s*\d{1,2}(?:\s*(?:e|ep|[ée]pisode)\s*\d{1,3})?|s\d{1,2}\s*e\d{1,3}|\d{1,2})$/i;

/** La requête sans les mots en trop, ou null si rien n'a changé. */
export function cleanQuery(query, kind) {
  const q = query.trim();
  let s = q.replace(NOISE_HEAD, "").replace(NOISE_TAIL, "");
  if (kind === "series") s = s.replace(SEASON_TAIL, "");
  s = s.trim();
  return s.length >= 2 && s.toLowerCase() !== q.toLowerCase() ? s : null;
}

// ---------- fautes de frappe ----------
/**
 * Vocabulaire des titres connus ({ mot: poids }) préparé pour la correction : rangé par
 * première lettre puis par longueur, pour ne comparer qu'une petite partie des mots.
 */
export function prepareWords(data) {
  const weights = new Map(Object.entries(data || {}));
  const byFirst = new Map();
  for (const w of weights.keys()) {
    if (!byFirst.has(w[0])) byFirst.set(w[0], new Map());
    const byLen = byFirst.get(w[0]);
    if (!byLen.has(w.length)) byLen.set(w.length, []);
    byLen.get(w.length).push(w);
  }
  return { weights, byFirst };
}

/** Le mot connu le plus proche de w parmi ceux qui commencent par une des lettres données. */
function closestWord(w, vocab, firsts) {
  const max = w.length <= 5 ? 1 : 2;
  let best = null, bestScore = Infinity;
  for (const f of firsts) {
    const byLen = vocab.byFirst.get(f);
    if (!byLen) continue;
    for (let len = w.length - max; len <= w.length + max; len++) {
      for (const c of byLen.get(len) || []) {
        const d = editDistance(w, c, max);
        if (d > max) continue;
        // À distance égale : une lettre oubliée plutôt qu'ajoutée (« pice » → piece, pas pie),
        // le pluriel (« blinder » → blinders), puis le mot le plus présent dans les titres connus.
        const score = d - (c.length >= w.length ? 0.2 : 0) - (c === `${w}s` ? 0.3 : 0)
          - 0.1 * Math.log10(1 + vocab.weights.get(c));
        if (score < bestScore) { best = c; bestScore = score; }
      }
    }
  }
  return best;
}

/**
 * Corrige les mots inconnus du vocabulaire : le mot connu le plus proche (1 faute jusqu'à
 * 5 lettres, 2 au-delà). On cherche d'abord parmi les mots qui commencent par la même lettre
 * (la faute est rarement sur la première), puis parmi tous. null si rien n'est corrigé.
 */
export function correctQuery(text, vocab) {
  if (!vocab || !vocab.weights.size) return null;
  let changed = false;
  const out = norm(text).split(" ").filter(Boolean).map((w) => {
    if (w.length < 4 || /\d/.test(w) || vocab.weights.has(w)) return w;
    const best = closestWord(w, vocab, [w[0]])
      || closestWord(w, vocab, [...vocab.byFirst.keys()].filter((f) => f !== w[0]));
    if (!best) return w;
    changed = true;
    return best;
  });
  return changed ? out.join(" ") : null;
}

/** Requêtes de secours pour une faute que le vocabulaire n'a pas su corriger : débuts de mots. */
export function fallbackQueries(query) {
  const words = norm(query).split(" ").filter(Boolean);
  const out = [];
  const add = (s) => { if (s && s.length >= 3 && !out.includes(s) && s !== norm(query)) out.push(s); };
  add(words.join(" "));                                            // sans accents ni ponctuation
  // Chaque mot significatif seul, les plus longs d'abord (« things » → Stranger Things).
  [...words].filter((w) => w.length >= 4).sort((a, b) => b.length - a.length).slice(0, 2).forEach(add);
  // Débuts du premier mot long : la faute est souvent au milieu ou à la fin.
  const long = words.find((w) => w.length >= 5) || words[0] || "";
  add(long.slice(0, Math.ceil(long.length / 2)));
  add(long.slice(0, 3));
  return out.slice(0, 4);
}

// ---------- suites et sagas ----------
const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"];

/** « dune 2 », « rocky iv », « john wick chapitre 4 » → { base, n }. De 1 à 20 (I à IX en chiffres romains). */
export function sequelOf(query) {
  const m = query.trim().toLowerCase()
    .match(/^(.+?)[\s:,-]+(?:(?:partie|part|[ée]pisode|chapitre|chapter|vol(?:ume)?\.?)\s*)?([1-9]|1\d|20|i{1,3}|iv|vi{0,3}|ix)$/);
  if (!m) return null;
  return { base: m[1].trim(), n: /\d/.test(m[2]) ? Number(m[2]) : ROMAN.indexOf(m[2]) + 1 };
}

/** Nom d'une saga TMDB sans « - Saga », « Collection »… */
const sagaName = (s) => String(s || "").replace(/\s*[-–:]?\s*(la )?(saga|collection|trilogie|trilogy)\s*$/i, "");

const SPIN_OFF = /\b(presents|a .+ story)\b/i;

/**
 * Le n-ième film d'une saga. Un film numéroté dans son titre garde son numéro (« Toy Story 4 »,
 * « épisode I ») ; les autres prennent les places libres dans l'ordre de sortie : Star Wars,
 * dont seuls les épisodes I à III sont numérotés sur TMDB, donne bien « La Guerre des étoiles »
 * pour 4. « 2e partie » / « Part 2 » n'est pas un numéro de suite (Harry Potter 7 et 8), ni un
 * chiffre du nom de la saga (« Les 4 Fantastiques »). Les courts-métrages (peu de votes) et les
 * spin-offs (« Presents: Hobbs & Shaw », « A Star Wars Story ») ne prennent pas de numéro.
 * explicit : le film trouvé porte le numéro dans son titre.
 */
export function nthPart(parts, n, sagaTitle = "") {
  const dated = parts.filter((p) => p.release_date).sort((a, b) => a.release_date.localeCompare(b.release_date));
  const top = Math.max(0, ...dated.map((p) => p.vote_count || 0));
  const counted = dated.filter((p) => (p.vote_count || 0) >= 0.1 * top && !SPIN_OFF.test(p.original_title || ""));
  const inSaga = new Set(norm(sagaTitle).split(" "));
  const numberOf = (p) => {
    for (const t of [p.title, p.original_title]) {
      const w = norm(t).split(" ");
      for (let i = 0; i < w.length; i++) {
        const k = /^\d{1,2}$/.test(w[i]) ? Number(w[i]) : ROMAN.indexOf(w[i]) + 1;
        if (k >= 1 && !inSaga.has(w[i]) && !["part", "partie"].includes(w[i - 1]) && w[i + 1] !== "partie") return k;
      }
    }
    return 0;
  };
  const slots = new Map();
  for (const p of counted) { const k = numberOf(p); if (k && !slots.has(k)) slots.set(k, p); }
  const numbered = new Set(slots.values());
  const explicit = slots.has(n);
  let free = 1;
  for (const p of counted) {
    if (numbered.has(p)) continue;
    while (slots.has(free)) free++;
    slots.set(free, p);
  }
  // Toute la saga pour la suite des résultats, spin-offs compris, sans les courts-métrages.
  return { hit: slots.get(n) || null, explicit, dated: dated.filter((p) => (p.vote_count || 0) >= 0.1 * top) };
}

// ---------- personnes ----------
/** Le nom de la personne correspond à la requête (« nolan » → Christopher Nolan, pas Nolan Gould). */
export function personMatch(query, name) {
  const qw = norm(query).split(" ").filter(Boolean);
  const nw = norm(name).split(" ").filter(Boolean);
  if (!qw.length || !nw.length) return false;
  const close = (a, b) => 1 - levenshtein(a, b) / Math.max(a.length, b.length) >= 0.8;
  // Un seul mot : c'est le nom de famille (« tom » ne doit pas donner Tom Hanks).
  if (qw.length === 1) return close(qw[0], nw[nw.length - 1]);
  return qw.every((w) => nw.some((x) => close(w, x)));
}

// Apparitions en tant que soi-même, émissions et documentaires : pas une filmographie.
const SELF = /\b(self|himself|herself|themselves|lui[- ]m[eê]me|elle[- ]m[eê]me)\b/i;
const NOT_FICTION = new Set([99, 10763, 10764, 10767]);   // documentaire, actualités, télé-réalité, talk-show

/**
 * Films (ou séries) d'une personne : réalisés (ou écrits) pour un réalisateur ou un scénariste,
 * joués pour un acteur. D'abord ses titres phares selon TMDB (« known_for » de la recherche de
 * personnes : The Last of Us avant Mentalist pour Pedro Pascal), puis les premiers rôles
 * (4 premiers noms au générique, ou 5 épisodes et plus quand TMDB les compte), puis le reste ;
 * à égalité, le plus connu.
 */
export function filmography(person, credits, kind) {
  const dept = person.known_for_department;
  const behind = dept === "Directing" || dept === "Writing";
  const list = behind
    ? (credits.crew || []).filter((c) => c.job === "Director" || (dept === "Writing" && c.department === "Writing"))
    : (credits.cast || []).filter((c) => !SELF.test(c.character || ""));
  const media = kind === "series" ? "tv" : "movie";
  const famous = new Set((person.known_for || []).filter((k) => k.media_type === media).map((k) => k.id));
  const lead = (c) => behind || (c.episode_count !== undefined ? c.episode_count >= 5 : (c.order ?? 99) <= 3);
  return list
    .filter((c) => !(c.genre_ids || []).some((g) => NOT_FICTION.has(g)))
    .sort((a, b) => famous.has(b.id) - famous.has(a.id) || lead(b) - lead(a) || byPop(a, b));
}

// ---------- classement ----------
const GOOD = 0.75;      // ressemblance d'un titre qui correspond vraiment à la requête
const KEEP = 0.5;       // en dessous, le titre n'a pas grand-chose à voir
const EXACT = 0.95;     // titre quasi identique
const PEN_DERIVED = 0.03; // requête retouchée (nettoyée, sigle, sans l'année) : un peu moins sûre
const PEN_FIXED = 0.06;   // requête corrigée (faute de frappe supposée)
const FIRST_PAGE = 20;
const PERSON_POP = 2;     // popularité TMDB d'une personne connue…
const PERSON_VOTES = 1000; // …ou un de ses titres phares avec au moins autant de votes
const PERSON_MAX = 15;    // films de la personne en tête, puis les titres qui correspondent
const FAMOUS = 300;       // un titre exact avec autant de votes l'emporte sur un studio (ou une personne peu connue)
const HEAD_MAX = 15;

const usable = (list) => (list || []).filter((it) => it && it.poster_path && it.vote_count > 0);
const byPop = (a, b) => (b.popularity || 0) - (a.popularity || 0);
const dedupe = (list) => { const seen = new Set(); return list.filter((it) => it && !seen.has(it.id) && seen.add(it.id)); };
/** Notoriété : surtout le nombre de votes (stable), un peu la popularité du moment. */
const fame = (it) => 0.08 * Math.log10(1 + (it.vote_count || 0)) + 0.03 * Math.log10(1 + (it.popularity || 0));
const yearOf = (it) => (it.release_date || it.first_air_date || "").slice(0, 4);

/** Ressemblance d'un résultat avec la meilleure des formes de la requête (moins sa pénalité). */
function textScore(forms, it) {
  let best = 0;
  for (const f of forms) best = Math.max(best, (titleMatch(f.q, it) ? 1 : scoreOf(f.q, it)) - f.pen);
  return best;
}

/**
 * Saga de la requête → { films: [le n-ième film, puis toute la saga dans l'ordre], name }.
 * Sagas candidates : les 3 plus proches par leur nom, plus celle du film le plus connu qui
 * correspond (« jurassic world » → saga Jurassic Park, dont on ne garde que les Jurassic World).
 * Parmi celles qui ont un n-ième film : celle dont le film porte le numéro dans son titre
 * (« spider man 2 » → Spider-Man 2 de Sam Raimi), sinon la plus vue.
 */
async function sagaFilms({ sagas, base, n, api, pool, trace }) {
  const picks = (sagas.results || [])
    .map((c) => ({ c, s: Math.max(similarity(base, sagaName(c.name)), similarity(base, sagaName(c.original_name))) }))
    .filter((x) => x.s >= GOOD)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.c);
  const anchor = pool.filter((it) => scoreOf(base, it) >= GOOD).sort((a, b) => fame(b) - fame(a))[0];
  const [details, movie] = await Promise.all([
    Promise.all(picks.map((c) => api(`/collection/${c.id}`))),
    anchor ? api(`/movie/${anchor.id}`) : null,
  ]);
  const cands = picks.map((c, i) => ({ c, parts: details[i].parts || [] }));
  const own = movie && movie.belongs_to_collection;
  if (own && !picks.some((c) => c.id === own.id)) cands.push({ c: own, parts: (await api(`/collection/${own.id}`)).parts || [] });

  const found = cands
    .map(({ c, parts }) => {
      // Saga au nom différent : seulement les films dont le titre commence par la requête (les
      // Jurassic World, pas « The Lost World: Jurassic Park », qui contient pourtant les deux mots).
      const named = Math.max(similarity(base, sagaName(c.name)), similarity(base, sagaName(c.original_name))) >= GOOD;
      const sub = named ? parts : parts.filter((p) => titlesOf(p).some((t) => bare(t).startsWith(bare(base))));
      const list = sub.length >= n ? sub : parts;
      return { name: c.name, ...nthPart(list, n, `${sagaName(c.name)} ${sagaName(c.original_name)}`), votes: list.reduce((t, p) => t + (p.vote_count || 0), 0) };
    })
    .filter((x) => usable([x.hit]).length);
  // Le numéro dans le titre ne départage que des sagas de notoriété comparable : pas la saga
  // indienne « Avatara Purusha » (son film « 2 ») devant Avatar.
  const top = Math.max(0, ...found.map((x) => x.votes));
  const strong = (x) => x.explicit && x.votes >= 0.2 * top;
  found.sort((a, b) => strong(b) - strong(a) || b.votes - a.votes);
  if (trace) trace.sagas = found.map((x) => ({ name: x.name, hit: x.hit.title, explicit: x.explicit, votes: x.votes, films: x.dated.map((p) => p.title) }));
  return found[0] ? { films: [found[0].hit, ...usable(found[0].dated)], name: found[0].name } : null;
}

/**
 * Résultats TMDB bruts d'une page de recherche.
 * search(q, page, extra) → réponse TMDB de /search/movie ou /search/tv (extra.language pour une autre langue).
 * api(path, params) → autre appel TMDB (sagas, personnes, studios) ; sans lui, ces recherches sont sautées.
 * opts.words() → vocabulaire préparé (prepareWords) ; opts.region → pays des plateformes ;
 * opts.trace → objet rempli avec le détail de la recherche (adresse /debug/search).
 */
export async function smartSearch(query, page, search, kind, api, opts = {}) {
  const trace = opts.trace;
  const raw = query.trim();
  const clean = cleanQuery(raw, kind);                     // « film barbie » → « barbie »
  const base = clean || raw;
  const alias = ALIASES[norm(base)];
  const yearKey = kind === "series" ? "first_air_date_year" : "year";
  const ym = alias ? null : base.match(/^(.+?)\s+((?:19|20)\d{2})$/);
  const sq = !alias && !ym && kind !== "series" ? sequelOf(base) : null;
  const main = alias || (ym ? ym[1] : base);               // ce que l'on cherche vraiment

  // Pages suivantes : on continue simplement la recherche principale.
  if (page > 1) {
    const d = await search(main, page, ym ? { [yearKey]: ym[2] } : {});
    if (!d.results || page > (d.total_pages || 0)) return [];
    return usable(d.results).sort(byPop);
  }

  const vocab = opts.words ? await opts.words().catch(() => null) : null;
  const fixed = alias ? null : correctQuery(main, vocab);  // « inseption » → « inception »
  const sagaBase = sq ? (ALIASES[norm(sq.base)] || correctQuery(sq.base, vocab) || sq.base) : null;
  const studio = !alias && !ym && !sq ? (STUDIOS[norm(base)] || {})[kind === "series" ? "series" : "movie"] : null;
  const variant = !alias && !ym && !sq ? pluralVariant(main) : null;   // « monstre » → « monstres »

  const forms = [{ q: raw, pen: 0 }];
  if (clean) forms.push({ q: clean, pen: PEN_DERIVED });
  if (alias) forms.push({ q: alias, pen: PEN_DERIVED });
  if (ym) forms.push({ q: ym[1], pen: PEN_DERIVED });
  if (fixed) forms.push({ q: fixed, pen: PEN_FIXED });

  const none = Promise.resolve(null);
  const [rawRes, cleanRes, aliasRes, yearRes, fixedRes, pluralRes, enRes, people, sagas, studioRes] = await Promise.all([
    search(raw, 1),
    clean ? search(clean, 1) : none,
    alias ? search(alias, 1) : none,
    ym ? search(ym[1], 1, { [yearKey]: ym[2] }) : none,
    fixed ? search(fixed, 1) : none,
    variant ? search(variant, 1) : none,
    // Titres anglais des résultats (« spirited away » → Le Voyage de Chihiro) ; pas affichés.
    search(main, 1, { language: "en-US" }),
    api && !alias && !ym && !sq && !studio ? api("/search/person", { query: main, include_adult: "false" }) : none,
    api && sq ? api("/search/collection", { query: sagaBase }) : none,
    api && studio ? api(`/discover/${kind === "series" ? "tv" : "movie"}`, {
      ...studio, sort_by: "popularity.desc", "vote_count.gte": kind === "series" ? 300 : 200,
      include_adult: "false", watch_region: opts.region || "FR",
      ...(kind === "series" ? { without_genres: "10762,10763,10764,10767" } : {}),
    }) : none,
  ]);
  const results = (d) => (d && d.results) || [];
  const en = new Map(results(enRes).map((it) => [it.id, it.title || it.name]));

  let pool = dedupe(usable([
    ...results(rawRes), ...results(cleanRes), ...results(aliasRes), ...results(yearRes), ...results(fixedRes),
    ...results(pluralRes).filter((it) => titleMatch(main, it)),
  ]));
  pool.forEach((it) => { if (en.has(it.id)) it.en_title = en.get(it.id); });
  const text = new Map();
  const scoreAll = (list) => list.forEach((it) => { if (!text.has(it.id)) text.set(it.id, textScore(forms, it)); });
  scoreAll(pool);

  // Toujours rien de proche : débuts de mots que TMDB reconnaît (« inters » → Interstellar).
  const best = Math.max(0, ...pool.map((it) => text.get(it.id)));
  const good = pool.filter((it) => text.get(it.id) >= GOOD).length;
  let fallback = [];
  if (!sq && !studio && (best < GOOD || (good < 3 && best < EXACT))) {
    fallback = fallbackQueries(fixed || main);
    const more = usable((await Promise.all(fallback.map((s) => search(s, 1)))).flatMap(results));
    scoreAll(more);
    pool = dedupe([...pool, ...more.filter((it) => text.get(it.id) >= KEEP)]);
  }

  const rank = (it) => {
    const t = text.get(it.id);
    return t + fame(it) + (ym && t >= GOOD && yearOf(it) === ym[2] ? 0.3 : 0);
  };
  let ranked = [...pool].sort((a, b) => rank(b) - rank(a));
  // Les titres sans rapport avec la requête (trouvés par TMDB via un titre étranger) ne
  // restent que s'il n'y a pas assez de vrais résultats.
  const tmdbTop = new Set(usable(results(rawRes)).slice(0, 5).map((it) => it.id));
  if (ranked.filter((it) => text.get(it.id) >= KEEP).length >= 5) ranked = ranked.filter((it) => text.get(it.id) >= KEEP || tmdbTop.has(it.id));

  const famousExact = pool.some((it) => titleMatch(main, it) && it.vote_count >= FAMOUS);
  let head = [], headKind = null;

  // « dune 2 » : le bon film de la saga, puis toute la saga. Un titre identique et assez connu
  // reste devant (« ocean's 8 ») ; pas un nanar au titre d'origine « Terminator 2 ».
  if (sagas) {
    const saga = await sagaFilms({ sagas, base: sagaBase, n: sq.n, api, pool, trace });
    if (saga) {
      const hit = saga.films[0];
      const exact = pool.filter((it) => it.id !== hit.id && isExact(raw, it) && it.vote_count >= 0.3 * hit.vote_count);
      head = [...exact, ...saga.films];
      headKind = `saga ${saga.name}`;
      ranked = ranked.filter((it) => scoreOf(sq.base, it) >= GOOD || scoreOf(sagaBase, it) >= GOOD);
    }
  }

  // « pixar », « netflix » : les titres du studio ou de la plateforme, les plus populaires.
  if (studio && !famousExact && results(studioRes).length) {
    head = usable(results(studioRes)).slice(0, HEAD_MAX);
    headKind = "studio";
  }

  // Un acteur ou un réalisateur (« nolan », « omar sy ») : ses films d'abord, puis les titres.
  // Pas quand un titre connu porte exactement ce nom (« lupin », « dune »).
  // Un titre qui correspond l'emporte s'il est connu au regard de la personne : le documentaire
  // « Spielberg » (300 votes) ne cache pas les films de Spielberg, mais Super Mario Bros.
  // (11 000 votes) passe devant le chanteur Mario (titres phares à 4 000 votes).
  const exactVotes = Math.max(0, ...pool.filter((it) => titleMatch(main, it)).map((it) => it.vote_count || 0));
  const nearVotes = Math.max(0, ...pool.filter((it) => text.get(it.id) >= 0.7).map((it) => it.vote_count || 0));
  const topVotes = (p) => Math.max(0, ...(p.known_for || []).map((k) => k.vote_count || 0));
  if (people) {
    const person = results(people).slice(0, 5).find((p) => ["Acting", "Directing", "Writing"].includes(p.known_for_department)
      && personMatch(main, p.name)
      && ((p.popularity || 0) >= PERSON_POP || topVotes(p) >= PERSON_VOTES)
      && exactVotes < Math.max(FAMOUS, 0.1 * topVotes(p))
      && nearVotes < Math.max(FAMOUS, 2 * topVotes(p)));
    if (person) {
      const credits = await api(`/person/${person.id}/${kind === "series" ? "tv" : "movie"}_credits`);
      const films = dedupe(usable(filmography(person, credits, kind))).slice(0, PERSON_MAX);
      if (films.length) { head = films; headKind = `personne ${person.name}`; }
    }
  }

  const out = dedupe([...head, ...ranked]).slice(0, FIRST_PAGE);
  if (trace) {
    Object.assign(trace, {
      forms, fixed, variant, alias: alias || null, year: ym ? ym[2] : null, sequel: sq, sagaBase, studio: studio || null,
      fallback, head: headKind,
      results: out.map((it) => ({
        name: it.title || it.name, original: it.original_title || it.original_name, en: it.en_title, year: yearOf(it),
        votes: it.vote_count, text: text.has(it.id) ? +text.get(it.id).toFixed(3) : null,
        fame: +fame(it).toFixed(3), rank: text.has(it.id) ? +rank(it).toFixed(3) : null,
      })),
    });
  }
  // Une page à la fois : chaque titre coûte un appel TMDB de plus (fiche, logo, dates).
  return out;
}
