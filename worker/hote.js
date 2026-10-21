/**
 * Copies auto-hébergées du Catalogue FR (fork Cloudflare ou conteneur Docker).
 *
 * Le même code sert l'instance principale (la « source ») et les copies. Une copie se reconnaît à son
 * adresse : tout autre hôte que celui de l'instance principale. Seules les copies ont un identifiant d'addon à elles
 * (pour installer les deux dans Nuvio sans conflit) et l'espace hébergeur (/hote/…).
 */

import { hex, sha256 as sha } from "./outils-serveur.js";

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
// Gardé 6 h ; une erreur de GitHub (limite d'appels, panne) n'est pas gardée ; 5 s au plus.
const github = () => ({
  headers: { "User-Agent": "CatalogueFR" }, signal: AbortSignal.timeout(5000),
  cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 6 * 3600, "400-599": 0 } },
});

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
 * Mise à jour disponible pour une copie en version `current` → { version, notes, history } ; null si la
 * copie est à jour ; false si GitHub ne répond pas (impossible de vérifier). Les nouveautés manquent si
 * l'API GitHub refuse (limite d'appels) : le lien vers l'historique reste. Ne lève jamais d'erreur.
 */
export async function updateInfo(current) {
  try {
    const res = await fetch(RAW_INDEX, github());
    if (!res.ok) return false;
    const m = /const VERSION = "(\d+\.\d+\.\d+)"/.exec(await res.text());
    if (!m) return false;
    if (!isNewerStep(m[1], current)) return null;
    const api = await fetch(COMMITS_API, github()).catch(() => null);
    const commits = api && api.ok ? await api.json().catch(() => []) : [];
    return { version: m[1], notes: notesBetween(commits, current, m[1]), history: HISTORY };
  } catch {
    return false;
  }
}

// ---------- l'hébergeur : connexion, jeton d'alerte, « Plus tard » ----------
// Hébergeur = qui connaît le secret ADMIN_PASSWORD. Sans lui, pas d'espace hébergeur.
const TEXT = new TextEncoder();

// Mot de passe trop court, ou laissé tel que dans l'exemple (docker-compose.yml, page /copie) : refusé,
// l'espace hébergeur reste fermé tant qu'il n'est pas changé.
export const MIN_PASSWORD = 10;
const EXAMPLE_PASSWORDS = new Set(["choisis-un-mot-de-passe", "ton-mot-de-passe", "motdepasse", "password"]);
/** État du mot de passe de l'hébergeur : "absent", "faible" ou "ok". */
export function passwordState(env) {
  const pw = typeof env.ADMIN_PASSWORD === "string" ? env.ADMIN_PASSWORD : "";
  if (!pw) return "absent";
  return pw.length < MIN_PASSWORD || EXAMPLE_PASSWORDS.has(pw.trim().toLowerCase()) ? "faible" : "ok";
}
const hasPassword = (env) => passwordState(env) === "ok";

// Signé avec le mot de passe ET un secret du serveur : HOTE_SECRET (tiré au hasard, créé tout seul sur
// Docker, facultatif sur Cloudflare), sinon la clé TMDB. Qui voit le jeton (il est dans le lien
// d'installation) ne peut pas retrouver le mot de passe en essayant des mots.
async function sign(env, what) {
  const secret = env.HOTE_SECRET || env.TMDB_API_KEY || "";
  const key = await crypto.subtle.importKey("raw", TEXT.encode(`${secret}|${env.ADMIN_PASSWORD}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, TEXT.encode(what)));
}
/** Comparaison en temps constant (deux textes de même longueur). */
export const same = (a, b) => {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

// Cookie de connexion : « date d'émission.signature ». Valable 30 jours ; la déconnexion ferme toutes
// les sessions ouvertes avant elle (date gardée comme « Plus tard », voir etat()).
const SESSION_MS = 30 * 86400e3;
/** Valeur du cookie « hote » émis à la date `at` (signature, jamais le mot de passe) ; "" sans mot de passe. */
export const hostCookie = async (env, at = Date.now()) => (hasPassword(env) ? `${at}.${await sign(env, `hote|${at}`)}` : "");
/** Jeton du lien d'installation « avec alertes » de l'hébergeur ; "" sans mot de passe. */
export const alertToken = async (env) => (hasPassword(env) ? (await sign(env, "alerte")).slice(0, 24) : "");

// Essais de mot de passe ratés : au-delà de 10 en un quart d'heure depuis une adresse, on attend. En plus,
// au-delà de 100 ratés en un quart d'heure toutes adresses confondues, plus personne n'essaie : sur Docker,
// l'adresse vient d'un en-tête que le visiteur peut inventer, la limite par adresse ne suffit pas.
// (Par instance du Worker : de quoi décourager quelqu'un qui essaie des mots de passe à la chaîne.)
const FAILS = new Map();
const MAX_FAILS = 10, MAX_FAILS_ALL = 100, FAIL_WINDOW = 15 * 60e3;
const ALL = "*";
const ipOf = (request) => request.headers.get("cf-connecting-ip") || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
const fresh = (f, now) => f && now - f.since <= FAIL_WINDOW;
function blocked(ip, now) {
  return [[ip, MAX_FAILS], [ALL, MAX_FAILS_ALL]].some(([k, max]) => { const f = FAILS.get(k); return fresh(f, now) && f.n >= max; });
}
function failed(ip, now) {
  // Les vieilles entrées partent, pour que la liste ne grossisse pas sans fin.
  if (FAILS.size > 1000) for (const [k, f] of FAILS) if (!fresh(f, now)) FAILS.delete(k);
  for (const k of [ip, ALL]) {
    const f = fresh(FAILS.get(k), now) ? FAILS.get(k) : { n: 0, since: now };
    f.n++;
    FAILS.set(k, f);
  }
}
/** Pour les tests : oublie les essais ratés. */
export const resetFails = () => FAILS.clear();
// Une demande POST venue d'une page d'un autre site (Origin différente) est refusée.
const sameOrigin = (request, url) => { const o = request.headers.get("origin"); return !o || o === url.origin; };

const cookieValue = (request, name) => {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
};
// Petit état de l'hébergeur (palier repoussé, date de la dernière déconnexion) : KV ETAT s'il est relié,
// sinon le cache (gardé tant qu'il n'est pas vidé ; au pire, la proposition revient).
async function readState(env, name) {
  if (env.ETAT) return (await env.ETAT.get(name)) || "";
  const hit = await caches.default.match(new Request(`https://cache.local/hote/${name}`));
  return hit ? hit.text() : "";
}
async function writeState(env, name, value) {
  if (env.ETAT) return env.ETAT.put(name, value);
  await caches.default.put(new Request(`https://cache.local/hote/${name}`), new Response(value, { headers: { "Cache-Control": "public, max-age=31536000" } }));
}

/** La requête vient-elle de l'hébergeur (cookie de connexion valide, pas trop vieux, d'après la dernière déconnexion) ? */
export async function isHost(request, env) {
  if (!hasPassword(env)) return false;
  const m = /^(\d{13})\.([0-9a-f]{64})$/.exec(cookieValue(request, "hote"));
  if (!m) return false;
  const at = Number(m[1]), now = Date.now();
  if (at > now + 60e3 || now - at > SESSION_MS) return false;
  if (!same(m[0], await hostCookie(env, at))) return false;
  return at > (Number(await readState(env, "deconnexion")) || 0);
}

// Palier repoussé (« Plus tard »).
export const dismissed = (env) => readState(env, "plus-tard");
export const dismiss = (env, step) => writeState(env, "plus-tard", step);

/**
 * Mise à jour à proposer à l'hébergeur : comme updateInfo (null à jour, false GitHub injoignable), et null
 * aussi sans mot de passe ou si ce palier a été repoussé.
 */
export async function pendingUpdate(env, current) {
  if (!hasPassword(env)) return null;
  const info = await updateInfo(current);
  if (!info) return info;
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
  if (request.method === "POST" && !sameOrigin(request, url)) {
    return reply({ error: "Demande refusée : elle ne vient pas de ce site (derrière un tunnel ou un proxy, règle ADRESSE_PUBLIQUE)." }, 403);
  }
  if (path === "/hote/connexion" && request.method === "POST") {
    const ip = ipOf(request), now = Date.now();
    if (blocked(ip, now)) return reply({ error: "Trop d'essais : réessaie dans un quart d'heure." }, 429);
    if (!hasPassword(env)) return reply({ error: `Mot de passe d'hébergeur absent ou trop simple (${MIN_PASSWORD} caractères au moins, pas celui de l'exemple).` }, 403);
    const body = await request.json().catch(() => ({}));
    const ok = typeof body.motDePasse === "string" && same(await sha(body.motDePasse), await sha(env.ADMIN_PASSWORD));
    if (!ok) {
      failed(ip, now);
      return reply({ error: "Mot de passe incorrect." }, 403);
    }
    FAILS.delete(ip);
    return reply({ ok: true }, 200, { "Set-Cookie": `hote=${await hostCookie(env, now)}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}` });
  }
  if (path === "/hote/deconnexion" && request.method === "POST") {
    // Seul l'hébergeur connecté ferme les sessions (sinon n'importe qui le déconnecterait).
    if (await isHost(request, env)) await writeState(env, "deconnexion", String(Date.now()));
    return reply({ ok: true }, 200, { "Set-Cookie": `hote=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0` });
  }
  if (path === "/hote/etat") {
    if (!(await isHost(request, env))) {
      const state = passwordState(env);
      return reply({ hote: false, motDePasse: state === "ok", ...(state === "faible" ? { motDePasseFaible: true } : {}) });
    }
    const jeton = await alertToken(env);
    const maj = await pendingUpdate(env, current);
    return reply({
      hote: true, jeton,
      installation: env.INSTALLATION === "docker" ? "docker" : "cloudflare",
      depot: /^[\w.-]+\/[\w.-]+$/.test(env.DEPOT || "") ? env.DEPOT : "",
      alerte: `${url.origin}/${b64url({ al: jeton })}/manifest.json`,
      maj: maj || null,
      verification: maj === false ? "impossible" : "ok",
    });
  }
  if (path === "/hote/plus-tard" && request.method === "POST") {
    if (!(await isHost(request, env))) return reply({ error: "Réservé à l'hébergeur." }, 403);
    // Le palier affiché, envoyé par la page (sans redemander à GitHub, qui peut être injoignable).
    const body = await request.json().catch(() => ({}));
    if (typeof body.palier === "string" && /^\d+\.\d+$/.test(body.palier)) await dismiss(env, body.palier);
    else {
      const info = await updateInfo(current);
      if (info) await dismiss(env, palier(info.version));
    }
    return reply({ ok: true });
  }
  return reply({ error: "introuvable" }, 404);
}

// ---------- rangée « Mise à jour » dans Nuvio ----------
// Déclarée seulement dans le lien « avec alertes » de l'hébergeur ; vide (donc masquée par Nuvio)
// tant qu'il n'y a rien à proposer.
export const UPDATE_CATALOG = { type: "movie", id: "mise-a-jour", name: "Mise à jour", showInHome: true, extra: [], extraSupported: [] };

/** Le lien de cette requête est-il celui de l'hébergeur d'une copie (jeton d'alerte valide) ? */
export const hasAlerts = async (env, url, cfg) => {
  if (!isCopy(url) || !cfg.al) return false;
  const want = await alertToken(env);
  return !!want && same(cfg.al, want);
};

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
