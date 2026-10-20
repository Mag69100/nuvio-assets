/**
 * Vraies notes IMDb, d'après data/imdb-ratings.bin du dépôt (refait chaque semaine par GitHub Actions).
 * Le fichier est lu sur GitHub au lieu d'être intégré au service : les commits de chaque nuit ne
 * redéploient donc pas le service et ne vident pas le cache des affiches. Même format que worker/ratings.js.
 */
export const NOTES_URL = "https://raw.githubusercontent.com/xnzx07/nuvio-assets/main/data/imdb-ratings.bin";
const GARDE_MS = 12 * 3600 * 1000;

let memo = null;   // { lire, until } ou { promesse }
export function resetMemo() { memo = null; }

/** Fonction « tt… » → « 7.9 » (ou undefined) à partir du contenu du fichier. */
export function decodeRatings(bytes) {
  const count = (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
  const ids = new Uint32Array(count);
  let pos = 4;
  for (let i = 0, id = 0; i < count; i++) {
    let gap = 0, shift = 0, c;
    do { c = bytes[pos++]; gap += (c & 0x7f) * 2 ** shift; shift += 7; } while (c & 0x80);
    id += gap;
    ids[i] = id;
  }
  const notes = bytes.subarray(pos, pos + count);
  return (imdbId) => {
    const m = /^tt(\d+)$/.exec(imdbId || "");
    if (!m) return undefined;
    const id = Number(m[1]);
    let lo = 0, hi = count - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (ids[mid] < id) lo = mid + 1;
      else if (ids[mid] > id) hi = mid - 1;
      else return (notes[mid] / 10).toFixed(1);
    }
    return undefined;
  };
}

async function charger(fetchImpl) {
  try {
    const res = await fetchImpl(NOTES_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return decodeRatings(new Uint8Array(await res.arrayBuffer()));
  } catch { return null; }
}

/** Note IMDb d'un titre (« 8.4 »), undefined si IMDb n'en a pas ou si le fichier est illisible. */
export async function ratingOf(imdbId, fetchImpl = fetch) {
  const now = Date.now();
  if (!memo || (memo.until && now > memo.until)) {
    const promesse = charger(fetchImpl);
    memo = { promesse };
    // Échec : on réessaiera dans 10 min, pas à chaque affiche.
    promesse.then((lire) => { memo = { lire, until: Date.now() + (lire ? GARDE_MS : 10 * 60 * 1000) }; });
  }
  const lire = memo.lire !== undefined ? memo.lire : await memo.promesse;
  return lire ? lire(imdbId) : undefined;
}
