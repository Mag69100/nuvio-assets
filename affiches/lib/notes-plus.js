/**
 * Notes des autres sites (Rotten Tomatoes, Metacritic, Letterboxd), pour les affiches qui en demandent.
 * Elles viennent de MDBList (clé gratuite MDBLIST_API_KEY, quota par jour) et passent par le relais
 * /notes/{imdb}.json du service, gardé 7 jours par le CDN de Vercel : une lecture sert à toutes les instances.
 * Sans clé, quota épuisé ou panne : null, et l'affiche ne montre que les notes IMDb ou TMDB.
 */
const DELAI_MS = 2500, GARDE_MS = 86400 * 1000, GARDE_ECHEC_MS = 3600 * 1000, MAX_MEMO = 5000;
const SOURCES = { tomatoes: "rt", metacritic: "mc", letterboxd: "lb" };

let memo = new Map();   // imdb → { promesse, until }
export function resetMemo() { memo = new Map(); }

/**
 * { rt (%), mc (sur 100), lb (sur 5) } d'une réponse MDBList (null pour une note absente) ; null pour une réponse
 * sans tableau de notes (clé refusée, quota, titre inconnu) : elle ne doit pas être gardée comme « aucune note ».
 */
export function parseMdblist(d) {
  if (!d || d.response === false || !Array.isArray(d.ratings)) return null;
  const out = { rt: null, mc: null, lb: null };
  for (const r of d.ratings) {
    const cle = SOURCES[r && r.source], v = Number(r && r.value);
    if (cle && v > 0) out[cle] = v;
  }
  return out;
}

/** Les notes lues chez MDBList pour un « tt… », ou null (pas de clé, quota, panne). */
export async function lireMdblist(env, imdb, fetchImpl = fetch) {
  if (!env.MDBLIST_API_KEY) return null;
  try {
    const url = new URL("https://mdblist.com/api/");
    url.searchParams.set("apikey", env.MDBLIST_API_KEY);
    url.searchParams.set("i", imdb);
    const res = await fetchImpl(url.toString(), { signal: AbortSignal.timeout(DELAI_MS) });
    if (!res.ok) { console.warn(`MDBList ${res.status} pour ${imdb}`); return null; }
    return parseMdblist(await res.json());
  } catch (e) { console.warn(`MDBList injoignable pour ${imdb} : ${e && e.message}`); return null; }
}

async function lireRelais(relais, imdb, fetchImpl) {
  try {
    const res = await fetchImpl(`${relais}/notes/${imdb}.json`, { signal: AbortSignal.timeout(DELAI_MS + 500) });
    if (!res.ok) return null;
    const d = await res.json();
    const nombre = (v) => (typeof v === "number" && v > 0 ? v : null);
    return d ? { rt: nombre(d.rt), mc: nombre(d.mc), lb: nombre(d.lb) } : null;
  } catch { return null; }
}

/** Les notes d'un titre par le relais du service, gardées un jour en mémoire de l'instance (un échec : une heure). */
export function notesPlus(imdb, fetchImpl = fetch, relais) {
  if (!/^tt\d{1,10}$/.test(imdb || "")) return Promise.resolve(null);
  const now = Date.now(), hit = memo.get(imdb);
  if (hit && now < hit.until) return hit.promesse;
  const entry = { promesse: lireRelais(relais, imdb, fetchImpl), until: now + GARDE_MS };
  memo.delete(imdb);
  memo.set(imdb, entry);
  while (memo.size > MAX_MEMO) memo.delete(memo.keys().next().value);
  entry.promesse.then((n) => { if (!n) entry.until = Date.now() + GARDE_ECHEC_MS; });
  return entry.promesse;
}
