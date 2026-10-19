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

// ---------- l'hébergeur : connexion, jeton d'alerte, « Plus tard » ----------
// Hébergeur = qui connaît le secret ADMIN_PASSWORD. Sans lui, pas d'espace hébergeur.
const hex = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))]
  .map((b) => b.toString(16).padStart(2, "0")).join("");

/** Valeur du cookie « hote » de l'hébergeur (empreinte, jamais le mot de passe) ; "" sans mot de passe. */
export const hostCookie = async (env) => (env.ADMIN_PASSWORD ? hex(`hote|${env.ADMIN_PASSWORD}`) : "");
/** Jeton du lien d'installation « avec alertes » de l'hébergeur ; "" sans mot de passe. */
export const alertToken = async (env) => (env.ADMIN_PASSWORD ? (await hex(`alerte|${env.ADMIN_PASSWORD}`)).slice(0, 24) : "");

const cookieValue = (request, name) => {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
};
/** La requête vient-elle de l'hébergeur (cookie de connexion valide) ? */
export async function isHost(request, env) {
  const want = await hostCookie(env);
  return !!want && cookieValue(request, "hote") === want;
}

// Palier repoussé (« Plus tard ») : KV ETAT s'il est relié, sinon le cache (gardé tant qu'il n'est pas
// vidé ; au pire, la proposition revient).
const DISMISS_URL = "https://cache.local/hote/plus-tard";
export async function dismissed(env) {
  if (env.ETAT) return (await env.ETAT.get("plus-tard")) || "";
  const hit = await caches.default.match(new Request(DISMISS_URL));
  return hit ? hit.text() : "";
}
export async function dismiss(env, step) {
  if (env.ETAT) return env.ETAT.put("plus-tard", step);
  await caches.default.put(new Request(DISMISS_URL), new Response(step, { headers: { "Cache-Control": "public, max-age=31536000" } }));
}

/** Mise à jour à proposer à l'hébergeur (null sans mot de passe, sans palier plus récent, ou repoussée). */
export async function pendingUpdate(env, current) {
  if (!env.ADMIN_PASSWORD) return null;
  const info = await updateInfo(current);
  if (!info) return null;
  return palier(info.version) === (await dismissed(env)) ? null : info;
}

const reply = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
});
const b64url = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * Routes /hote/… d'une copie : connexion, déconnexion, état (pour le site), « Plus tard ».
 * current → VERSION de la copie.
 */
export async function hostRoute(request, env, url, path, current) {
  const secure = url.protocol === "https:" ? "; Secure" : "";   // en http (Docker à la maison), pas de Secure
  if (path === "/hote/connexion" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const ok = env.ADMIN_PASSWORD && typeof body.motDePasse === "string" && body.motDePasse === env.ADMIN_PASSWORD;
    if (!ok) return reply({ error: "Mot de passe incorrect." }, 403);
    return reply({ ok: true }, 200, { "Set-Cookie": `hote=${await hostCookie(env)}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=31536000` });
  }
  if (path === "/hote/deconnexion" && request.method === "POST") {
    return reply({ ok: true }, 200, { "Set-Cookie": `hote=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0` });
  }
  if (path === "/hote/etat") {
    if (!(await isHost(request, env))) return reply({ hote: false });
    const jeton = await alertToken(env);
    return reply({
      hote: true, jeton,
      installation: env.INSTALLATION === "docker" ? "docker" : "cloudflare",
      depot: /^[\w.-]+\/[\w.-]+$/.test(env.DEPOT || "") ? env.DEPOT : "",
      alerte: `${url.origin}/${b64url({ al: jeton })}/manifest.json`,
      maj: await pendingUpdate(env, current),
    });
  }
  if (path === "/hote/plus-tard" && request.method === "POST") {
    if (!(await isHost(request, env))) return reply({ error: "Réservé à l'hébergeur." }, 403);
    const info = await updateInfo(current);
    if (info) await dismiss(env, palier(info.version));
    return reply({ ok: true });
  }
  return reply({ error: "introuvable" }, 404);
}

// ---------- rangée « Mise à jour » dans Nuvio ----------
// Déclarée seulement dans le lien « avec alertes » de l'hébergeur ; vide (donc masquée par Nuvio)
// tant qu'il n'y a rien à proposer.
export const UPDATE_CATALOG = { type: "movie", id: "mise-a-jour", name: "Mise à jour", showInHome: true, extra: [], extraSupported: [] };

/** Le lien de cette requête est-il celui de l'hébergeur d'une copie (jeton d'alerte valide) ? */
export const hasAlerts = async (env, url, cfg) => isCopy(url) && !!cfg.al && cfg.al === (await alertToken(env));

/** Carte (et fiche) « Version X disponible » : nouveautés, puis comment mettre à jour. */
export function updateCard(info, env, origin) {
  const how = env.INSTALLATION === "docker"
    ? "Pour mettre à jour : sur ton serveur, dans le dossier de ta copie, lance\ndocker compose pull && docker compose up -d"
    : `Pour mettre à jour : sur GitHub, ouvre ta copie${/^[\w.-]+\/[\w.-]+$/.test(env.DEPOT || "") ? ` (https://github.com/${env.DEPOT})` : ""} et clique sur « Sync fork » : Cloudflare la redéploie tout seul. C'est aussi expliqué sur ton site, salle 2 → Espace hébergeur.`;
  const notes = info.notes.length ? `Nouveautés :\n${info.notes.map((n) => `• ${n}`).join("\n")}` : "";
  return {
    id: `maj:${info.version}`, type: "movie",
    name: `🔔 Version ${info.version} disponible`,
    poster: `${origin}/logo.png`, posterShape: "square",
    description: [notes, how, `Tout l'historique : ${info.history}`].filter(Boolean).join("\n\n"),
  };
}
