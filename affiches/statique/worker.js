/**
 * Le Worker des affiches statiques. Les affiches déjà dessinées sont ses fichiers statiques : Cloudflare les sert
 * sans lancer ce code (gratuit, sans limite, hors des 100 000 requêtes par jour). Ce code ne tourne que pour une
 * affiche absente : il la fait dessiner par le serveur des affiches (SERVEUR, affiches/serveur.js, avec RELAIS_KEY) et
 * la renvoie aussitôt, comme avant ; le serveur la publie ensuite avec les autres. Serveur absent ou en panne : elle va
 * dans la file (table demandes de la base nuvio-affiches), réponse 503, et Nuvio montre l'affiche d'origine sans la
 * garder ; la file est dessinée plus tard (serveur, ou machine GitHub en secours).
 * Mis en ligne par affiches/lib/statiques.js (API de Cloudflare), pas par wrangler : la liste des styles est recopiée ici.
 */
const STYLES = new Set(__STYLES__);
// Une file plus longue que ça : des adresses au hasard (robot), pas des cartes de Nuvio.
const FILE_MAX = 5000;
// Le serveur dessine une affiche en moins d'une seconde ; Torrentio peut le faire attendre un peu plus.
const ATTENTE_MS = 8000;
const ADRESSE = /^\/([a-z]+)\/(movie|series)\/(poster|landscape)\/(tt\d{1,10}|tmdb:\d{1,10})\.jpg$/;
const CORS = { "Access-Control-Allow-Origin": "*" };

const absente = () => new Response(null, { status: 503, headers: { ...CORS, "Retry-After": "600", "Cache-Control": "no-store" } });

async function duServeur(env, chemin) {
  if (!env.SERVEUR || !env.RELAIS_KEY) return null;
  try {
    const r = await fetch(`${env.SERVEUR}/statique${chemin}`, { headers: { "X-Relais-Cle": env.RELAIS_KEY }, signal: AbortSignal.timeout(ATTENTE_MS) });
    if (r.status === 404) return new Response("introuvable", { status: 404, headers: { ...CORS, "Cache-Control": "public, max-age=3600" } });
    if (!r.ok || !(r.headers.get("Content-Type") || "").startsWith("image/")) return null;
    return new Response(r.body, { headers: { ...CORS, "Content-Type": "image/jpeg", "Cache-Control": r.headers.get("Cache-Control") || "public, max-age=600" } });
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let chemin = url.pathname;
    try { chemin = decodeURIComponent(chemin); } catch { return new Response("introuvable", { status: 404 }); }
    const m = ADRESSE.exec(chemin);
    if (!m || !STYLES.has(m[1])) return new Response("introuvable", { status: 404, headers: { "Cache-Control": "public, max-age=3600" } });
    const dessinee = await duServeur(env, chemin);
    if (dessinee) return dessinee;
    ctx.waitUntil(env.DB.prepare(
      "INSERT OR IGNORE INTO demandes (chemin, vu) SELECT ?, ? WHERE (SELECT COUNT(*) FROM demandes) < ?")
      .bind(chemin, new Date().toISOString(), FILE_MAX).run()
      .catch((e) => console.warn(`file : ${e && e.message}`)));
    return absente();
  },
};
