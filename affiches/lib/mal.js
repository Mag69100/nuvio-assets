/**
 * La note MyAnimeList d'un animé, pour les affiches qui la demandent (réglage MAL de la régie).
 * Le numéro MyAnimeList d'un titre TMDB vient de la liste de correspondances de Fribb/anime-lists (GitHub, relue chaque
 * jour) : un titre qui n'y est pas n'est pas un animé, pas de note. La note vient de l'API officielle de MyAnimeList
 * avec MAL_CLIENT_ID (gratuite, myanimelist.net/apiconfig), sinon de Jikan (sans clé, souvent saturé).
 * Gardée 7 jours en mémoire ; un échec, une heure. Pas de note (trop peu de votes) : gardé comme tel.
 */

const LISTE = "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json";
const DELAI_MS = 2500, LISTE_DELAI_MS = 20000, GARDE_LISTE_MS = 86400000, GARDE_MS = 7 * 86400000, GARDE_ECHEC_MS = 3600000, MAX_MEMO = 5000;

let liste = null;          // { promesse, until, valeur }
let memo = new Map();      // numéro MyAnimeList → { promesse, until }
export function resetMal() { liste = null; memo = new Map(); }

/**
 * Les correspondances lues : « movie:123 » ou « series:456 » → numéro MyAnimeList. Une série prend l'entrée de sa
 * première saison (série TV, saison TMDB 1, sans décalage d'épisodes) : celle des suites et des films dérivés
 * (Jujutsu Kaisen : saison 2, film 0) n'est pas la note de la série.
 */
export function correspondances(d) {
  const out = new Map(), prio = new Map();
  for (const x of Array.isArray(d) ? d : []) {
    const t = x && x.themoviedb_id, mal = x && x.mal_id;
    if (!t || !Number.isInteger(mal)) continue;
    for (const id of [].concat(t.movie || [])) {
      if (Number.isInteger(id) && !out.has(`movie:${id}`)) out.set(`movie:${id}`, mal);
    }
    for (const id of [].concat(t.tv || [])) {
      if (!Number.isInteger(id)) continue;
      const k = `series:${id}`, p = (x.type === "TV" ? 0 : 2) + (x.season && x.season.tmdb === 1 && !x.episode_offset ? 0 : 1);
      if (!out.has(k) || p < prio.get(k)) { out.set(k, mal); prio.set(k, p); }
    }
  }
  return out;
}

function lireListe(fetchImpl) {
  const now = Date.now();
  if (liste && now < liste.until) return liste.promesse;
  // Liste pas relue (GitHub en panne) : l'ancienne sert encore.
  const ancienne = liste ? liste.valeur : null;
  const entree = { until: now + GARDE_LISTE_MS, valeur: ancienne, promesse: null };
  entree.promesse = fetchImpl(LISTE, { signal: AbortSignal.timeout(LISTE_DELAI_MS) })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`liste ${r.status}`))))
    .then((d) => {
      const m = correspondances(d);
      if (!m.size) throw new Error("liste vide");
      entree.valeur = m;
      return m;
    })
    .catch((e) => {
      console.warn(`MyAnimeList : correspondances illisibles (${e && e.message})`);
      entree.until = Date.now() + GARDE_ECHEC_MS;
      return ancienne;
    });
  liste = entree;
  return entree.promesse;
}

const note = (v) => (typeof v === "number" && v > 0 ? v : 0);

/** La note d'un numéro MyAnimeList : un nombre, 0 sans note, null en échec. */
async function lireNote(env, mal, fetchImpl) {
  try {
    if (env.MAL_CLIENT_ID) {
      const r = await fetchImpl(`https://api.myanimelist.net/v2/anime/${mal}?fields=mean`, { headers: { "X-MAL-CLIENT-ID": env.MAL_CLIENT_ID }, signal: AbortSignal.timeout(DELAI_MS) });
      if (r.ok) return note((await r.json()).mean);
      if (r.status === 404) return 0;
    }
    const r = await fetchImpl(`https://api.jikan.moe/v4/anime/${mal}`, { signal: AbortSignal.timeout(DELAI_MS) });
    if (r.status === 404) return 0;
    if (!r.ok) return null;
    const d = await r.json();
    return note(d && d.data && d.data.score);
  } catch {
    return null;
  }
}

/** La note MyAnimeList d'un titre (type « movie » ou « series », numéro TMDB), ou null (pas un animé, pas de note, panne). */
export async function noteMal(env, type, tmdbId, fetchImpl = fetch) {
  try {
    const m = await lireListe(fetchImpl);
    const mal = m && m.get(`${type}:${tmdbId}`);
    if (!mal) return null;
    const now = Date.now(), hit = memo.get(mal);
    let entree = hit && now < hit.until ? hit : null;
    if (!entree) {
      entree = { promesse: lireNote(env, mal, fetchImpl), until: now + GARDE_MS };
      memo.delete(mal);
      memo.set(mal, entree);
      while (memo.size > MAX_MEMO) memo.delete(memo.keys().next().value);
      entree.promesse.then((v) => { if (v === null) entree.until = Date.now() + GARDE_ECHEC_MS; });
    }
    const v = await entree.promesse;
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}
