/**
 * Copies auto-hébergées du Catalogue FR (fork Cloudflare ou conteneur Docker).
 *
 * Le même code sert l'instance principale (la « source ») et les copies. Une copie se reconnaît à son
 * adresse : tout autre hôte que celui de l'instance principale. Seules les copies ont un identifiant d'addon à elles
 * (pour installer les deux dans Nuvio sans conflit) et l'espace hébergeur (/hote/…).
 */

export const SOURCE_HOST = "nuvio-assets.xnzxflix.workers.dev";
const ADDON_ID = "com.xnzx07.catalogue-fr";

/** La requête arrive-t-elle sur une copie (et pas sur l'instance principale) ? */
export const isCopy = (url) => url.hostname !== SOURCE_HOST;

/** Identifiant de l'addon dans Nuvio : celui de la source, « …perso » sur une copie. */
export const addonId = (url) => (isCopy(url) ? `${ADDON_ID}.perso` : ADDON_ID);

// ---------- dernière version publiée sur le dépôt ----------
const REPO = "xnzx07/nuvio-assets";
const RAW_INDEX = `https://raw.githubusercontent.com/${REPO}/main/worker/index.js`;
const COMMITS_API = `https://api.github.com/repos/${REPO}/commits?per_page=100`;
export const HISTORY = `https://github.com/${REPO}/commits/main`;
const GITHUB = { headers: { "User-Agent": "CatalogueFR" }, cf: { cacheTtl: 6 * 3600, cacheEverything: true } };

const parts = (v) => String(v).split(".").map(Number);
/** Palier d'une version (« 5.22.3 » → « 5.22 ») : on ne propose pas chaque petite correction. */
export const palier = (v) => parts(v).slice(0, 2).join(".");
const cmp = (a, b) => {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
};
/** La dernière version est-elle d'un palier plus récent que celle de la copie ? */
export const isNewerStep = (latest, current) => cmp(`${palier(latest)}.0`, `${palier(current)}.0`) > 0;

/**
 * Nouveautés d'après les commits « vX.Y.Z : texte » (format de l'API GitHub), entre la version de la
 * copie (exclue) et la dernière (incluse), de la plus récente à la plus ancienne, au plus 15.
 */
export function notesBetween(commits, current, latest) {
  const out = [];
  for (const c of Array.isArray(commits) ? commits : []) {
    const m = /^v(\d+\.\d+\.\d+) : (.+)/.exec(((c && c.commit && c.commit.message) || "").split("\n")[0]);
    if (m && cmp(m[1], current) > 0 && cmp(m[1], latest) <= 0) out.push(m[2].trim());
  }
  return out.slice(0, 15);
}

/**
 * Mise à jour disponible pour une copie en version `current` → { version, notes, history }, ou null
 * (pas de palier plus récent, ou GitHub injoignable). Les nouveautés manquent si l'API GitHub refuse
 * (limite d'appels) : le lien vers l'historique reste. Ne lève jamais d'erreur.
 */
export async function updateInfo(current) {
  try {
    const res = await fetch(RAW_INDEX, GITHUB);
    if (!res.ok) return null;
    const m = /const VERSION = "(\d+\.\d+\.\d+)"/.exec(await res.text());
    if (!m || !isNewerStep(m[1], current)) return null;
    const api = await fetch(COMMITS_API, GITHUB).catch(() => null);
    const commits = api && api.ok ? await api.json().catch(() => []) : [];
    return { version: m[1], notes: notesBetween(commits, current, m[1]), history: HISTORY };
  } catch {
    return null;
  }
}
