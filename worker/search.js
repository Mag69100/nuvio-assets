/**
 * Recherche plus tolérante que celle de TMDB :
 *   - sigles et surnoms : « got » → Game of Thrones, « twd » → The Walking Dead…
 *   - fautes de frappe : TMDB ne trouve rien pour « brekin bad » ou « intersteller », mais il
 *     reconnaît les débuts de mots (« bre », « inters ») et les mots seuls (« things »). Quand la
 *     recherche normale ne donne rien de proche, on relance avec ces morceaux puis on trie les
 *     résultats par ressemblance avec ce qui a été tapé.
 *   - année en fin de requête : « dune 2021 » cherche « dune » sorti en 2021.
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

const GOOD = 0.75;   // à partir de là, la recherche normale a trouvé ce qu'on cherchait
const KEEP = 0.5;    // ressemblance minimale d'un résultat de secours

/**
 * Résultats TMDB bruts d'une page de recherche.
 * search(q, page, extra) → réponse TMDB de /search/movie ou /search/tv.
 */
export async function smartSearch(query, page, search, kind) {
  const q = query.trim();
  const key = norm(q);
  const alias = ALIASES[key];
  const yearKey = kind === "series" ? "first_air_date_year" : "year";
  const ym = q.match(/^(.+?)\s+((?:19|20)\d{2})$/);

  const usable = (list) => (list || []).filter((it) => it.poster_path && it.vote_count > 0);
  const byPop = (a, b) => (b.popularity || 0) - (a.popularity || 0);

  // Pages suivantes : on continue simplement la recherche principale.
  if (page > 1) {
    const main = alias || (ym ? ym[1] : q);
    const d = await search(main, page, ym && !alias ? { [yearKey]: ym[2] } : {});
    if (!d.results || page > (d.total_pages || 0)) return [];
    return usable(d.results).sort(byPop);
  }

  const reqs = [search(q, 1)];
  if (alias) reqs.push(search(alias, 1));
  if (ym) reqs.push(search(ym[1], 1, { [yearKey]: ym[2] }));
  const [plain, ...extra] = await Promise.all(reqs);
  const seen = new Set();
  const uniq = (list) => list.filter((it) => !seen.has(it.id) && seen.add(it.id));

  // Le sigle ou l'année d'abord, puis le reste.
  const first = uniq(usable(extra.flatMap((d) => d.results || [])).sort(byPop));
  const main = usable(plain.results);
  const best = Math.max(0, ...[...first, ...main].map((it) => scoreOf(q, it)), ...(alias ? [1] : []));
  if (best >= GOOD || first.length) {
    // Le plus ressemblant d'abord, puis par popularité.
    // Avec une année, la recherche brute « dune 1984 » ramène aussi des « d'une… » : on les écarte.
    const rest = uniq(main).filter((it) => !ym || scoreOf(ym[1], it) >= KEEP).sort((a, b) => (scoreOf(q, b) >= GOOD) - (scoreOf(q, a) >= GOOD) || byPop(a, b));
    return [...first, ...rest];
  }

  // Rien de proche : requêtes de secours, puis tri par ressemblance.
  const more = await Promise.all(fallbackQueries(q).map((s) => search(s, 1)));
  const pool = uniq(usable([...main, ...more.flatMap((d) => d.results || [])]));
  return pool
    .map((it) => ({ it, s: scoreOf(q, it) }))
    .filter((x) => x.s >= KEEP)
    // Ressemblance d'abord ; à ressemblance proche, le plus connu.
    .sort((a, b) => (b.s + 0.04 * Math.log10(1 + (b.it.popularity || 0))) - (a.s + 0.04 * Math.log10(1 + (a.it.popularity || 0))))
    .slice(0, 20)
    .map((x) => x.it);
}
