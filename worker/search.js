/**
 * Recherche plus tolérante que celle de TMDB :
 *   - sigles et surnoms : « got » → Game of Thrones, « twd » → The Walking Dead…
 *   - fautes de frappe : TMDB ne trouve rien pour « brekin bad » ou « intersteller », mais il
 *     reconnaît les débuts de mots (« bre », « inters ») et les mots seuls (« things »). Quand la
 *     recherche normale ne donne rien de proche, on relance avec ces morceaux puis on trie les
 *     résultats par ressemblance avec ce qui a été tapé.
 *     On le fait aussi quand TMDB ne renvoie que quelques titres approchants (« interstelar » ne
 *     donne que « Interstellar Wars »).
 *   - année en fin de requête : « dune 2021 » cherche « dune » sorti en 2021.
 *   - numéro de suite : « dune 2 », « harry potter 3 », « star wars 4 » vont chercher la saga
 *     TMDB et mettent le bon film en premier (numéro du titre, sinon ordre de sortie).
 *   - acteurs et réalisateurs : « nolan », « omar sy » donnent leurs films, les plus connus d'abord.
 *   - tri : le titre exact d'abord (« dark » → Dark avant Dark Matter), puis le plus connu.
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

/** Meilleure ressemblance d'un résultat TMDB (titre français ou titre d'origine). */
export function scoreOf(query, it) {
  return Math.max(
    similarity(query, it.title || it.name),
    similarity(query, it.original_title || it.original_name),
  );
}

/** Requêtes de secours pour une recherche avec faute de frappe. */
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

/** Titre identique à la requête, article de tête mis à part (« office » → The Office). */
export function isExact(query, it) {
  const bare = (s) => norm(s).replace(/^(the|a|an|le|la|les|l|un|une) /, "");
  const q = bare(query);
  return !!q && (bare(it.title || it.name) === q || bare(it.original_title || it.original_name) === q);
}

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"];

/** « dune 2 », « rocky iv », « john wick chapitre 4 » → { base, n }. Seulement de 1 à 9. */
export function sequelOf(query) {
  const m = query.trim().toLowerCase()
    .match(/^(.+?)[\s:,-]+(?:(?:partie|part|[ée]pisode|chapitre|chapter|vol(?:ume)?\.?)\s*)?([1-9]|i{1,3}|iv|vi{0,3}|ix)$/);
  if (!m) return null;
  return { base: m[1].trim(), n: /\d/.test(m[2]) ? Number(m[2]) : ROMAN.indexOf(m[2]) + 1 };
}

/** Nom d'une saga TMDB sans « - Saga », « Collection »… */
const sagaName = (s) => String(s || "").replace(/\s*[-–:]?\s*(la )?(saga|collection|trilogie|trilogy)\s*$/i, "");

/**
 * Le n-ième film d'une saga. Un numéro écrit dans le titre gagne (« épisode IV », « Toy Story 4 »),
 * sauf « 2e partie » / « Part 2 », qui n'est pas le numéro de la suite (Harry Potter 7 et 8) ;
 * sinon l'ordre de sortie.
 */
export function nthPart(parts, n) {
  const dated = parts.filter((p) => p.release_date).sort((a, b) => a.release_date.localeCompare(b.release_date));
  const numbered = (p) => [p.title, p.original_title].some((t) => {
    const w = norm(t).split(" ");
    return w.some((x, i) => (x === String(n) || x === ROMAN[n - 1])
      && !["part", "partie"].includes(w[i - 1]) && w[i + 1] !== "partie");
  });
  return { hit: dated.find(numbered) || dated[n - 1] || null, dated };
}

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

/** Films (ou séries) d'une personne : réalisés pour un réalisateur, joués pour un acteur. */
export function filmography(person, credits) {
  const list = person.known_for_department === "Directing"
    ? (credits.crew || []).filter((c) => c.job === "Director")
    : (credits.cast || []).filter((c) => !SELF.test(c.character || ""));
  return list.filter((c) => !(c.genre_ids || []).some((g) => NOT_FICTION.has(g)));
}

const GOOD = 0.75;   // à partir de là, la recherche normale a trouvé ce qu'on cherchait
const KEEP = 0.5;    // ressemblance minimale d'un résultat de secours
const EXACT = 0.95;  // ressemblance d'un titre quasi identique à la requête
const FEW = 5;       // en dessous, TMDB n'a pas vraiment trouvé : on cherche aussi autrement
const FIRST_PAGE = 20;
const PERSON_POP = 2; // popularité TMDB minimale d'une personne (écarte les homonymes inconnus)
const PERSON_MAX = 15; // films de la personne en tête, puis les titres qui correspondent

const usable = (list) => (list || []).filter((it) => it && it.poster_path && it.vote_count > 0);
const byPop = (a, b) => (b.popularity || 0) - (a.popularity || 0);
const dedupe = (list) => { const seen = new Set(); return list.filter((it) => !seen.has(it.id) && seen.add(it.id)); };
// Titre exact, puis titre proche, puis le reste ; à égalité, le plus connu.
const tier = (text, it) => (isExact(text, it) ? 2 : scoreOf(text, it) >= GOOD ? 1 : 0);
const byTier = (text) => (a, b) => tier(text, b) - tier(text, a) || byPop(a, b);

/** Saga TMDB qui correspond à la requête → [le n-ième film, puis toute la saga dans l'ordre]. */
async function sagaFilms(sagas, base, n, api) {
  const pick = (sagas.results || [])
    .map((c) => ({ c, s: Math.max(similarity(base, sagaName(c.name)), similarity(base, sagaName(c.original_name))) }))
    .filter((x) => x.s >= GOOD)
    .sort((a, b) => b.s - a.s)[0];
  if (!pick) return null;
  const saga = await api(`/collection/${pick.c.id}`);
  const { hit, dated } = nthPart(saga.parts || [], n);
  if (!usable([hit]).length) return null;
  return [hit, ...usable(dated)];
}

/**
 * Résultats TMDB bruts d'une page de recherche.
 * search(q, page, extra) → réponse TMDB de /search/movie ou /search/tv.
 * api(path, params) → autre appel TMDB (sagas, personnes) ; sans lui, ces recherches sont sautées.
 */
export async function smartSearch(query, page, search, kind, api) {
  const q = query.trim();
  const key = norm(q);
  const alias = ALIASES[key];
  const yearKey = kind === "series" ? "first_air_date_year" : "year";
  const ym = q.match(/^(.+?)\s+((?:19|20)\d{2})$/);

  // Pages suivantes : on continue simplement la recherche principale.
  if (page > 1) {
    const main = alias || (ym ? ym[1] : q);
    const d = await search(main, page, ym && !alias ? { [yearKey]: ym[2] } : {});
    if (!d.results || page > (d.total_pages || 0)) return [];
    return usable(d.results).sort(byPop);
  }

  // Numéro de suite (films seulement : pour une série, « 2 » serait une saison).
  const sq = !alias && !ym && kind !== "series" ? sequelOf(q) : null;
  const sagaQuery = sq && (ALIASES[norm(sq.base)] || sq.base);   // « hp 3 » → saga Harry Potter
  const reqs = [search(q, 1)];
  if (alias) reqs.push(search(alias, 1));
  if (ym) reqs.push(search(ym[1], 1, { [yearKey]: ym[2] }));
  const [[plain, ...extra], sagas, people] = await Promise.all([
    Promise.all(reqs),
    sq && api ? api("/search/collection", { query: sagaQuery }) : null,
    !alias && !ym && !sq && api ? api("/search/person", { query: q, include_adult: "false" }) : null,
  ]);
  const main = usable(plain.results);

  // « dune 2 » : le bon film de la saga, puis toute la saga, puis les autres titres proches.
  // Un titre identique reste devant (« ocean's 8 », « district 9 »).
  if (sagas) {
    const films = await sagaFilms(sagas, sagaQuery, sq.n, api);
    if (films) {
      const near = main.filter((it) => scoreOf(sq.base, it) >= GOOD).sort(byTier(sq.base));
      return dedupe([...main.filter((it) => isExact(q, it)), ...films, ...near]).slice(0, FIRST_PAGE);
    }
  }

  // Le sigle ou l'année d'abord, puis le reste. Avec une année, TMDB lit aussi « dune » comme
  // « d'une » : on ne garde que les titres vraiment proches de ce qui a été tapé.
  const ref = ym ? ym[1] : q;
  const close = (it) => !ym || scoreOf(ym[1], it) >= GOOD;
  const first = usable(extra.flatMap((d) => d.results || [])).filter((it) => alias || close(it)).sort(byTier(alias || ref));
  const best = Math.max(0, ...[...first, ...main].map((it) => scoreOf(ref, it)), ...(alias ? [1] : []));
  const exact = [...first, ...main].some((it) => isExact(ref, it));
  // Quelques titres seulement, aucun identique : TMDB s'est peut-être arrêté sur un titre voisin
  // (« interstelar » → Interstellar Wars) ; on cherche aussi autrement.
  const few = !first.length && main.length < FEW && !exact && best < EXACT;

  let titles;
  if ((best >= GOOD || first.length) && !few) {
    titles = dedupe([...first, ...main.filter(close).sort(byTier(ref))]);
  } else {
    // Rien de proche : requêtes de secours, puis tri par ressemblance.
    const more = await Promise.all(fallbackQueries(q).map((s) => search(s, 1)));
    titles = dedupe(usable([...main, ...more.flatMap((d) => d.results || [])]))
      .map((it) => ({ it, s: scoreOf(q, it) }))
      .filter((x) => x.s >= KEEP)
      // Ressemblance d'abord ; à ressemblance proche, le plus connu.
      .sort((a, b) => (b.s + 0.04 * Math.log10(1 + (b.it.popularity || 0))) - (a.s + 0.04 * Math.log10(1 + (a.it.popularity || 0))))
      .map((x) => x.it);
  }

  // Un acteur ou un réalisateur (« nolan », « omar sy ») : ses films d'abord, puis les titres.
  // Pas quand un titre porte exactement ce nom (« lupin », « dune »).
  if (people && !exact) {
    const person = (people.results || []).slice(0, 5).find((p) => (p.popularity || 0) >= PERSON_POP
      && ["Acting", "Directing"].includes(p.known_for_department) && personMatch(q, p.name));
    if (person) {
      const credits = await api(`/person/${person.id}/${kind === "series" ? "tv" : "movie"}_credits`);
      const films = dedupe(usable(filmography(person, credits))).sort(byPop).slice(0, PERSON_MAX);
      if (films.length) titles = dedupe([...films, ...titles]);
    }
  }
  // Une page à la fois : chaque titre coûte un appel TMDB de plus (fiche, logo, dates).
  return titles.slice(0, FIRST_PAGE);
}
