/**
 * Le Worker des affiches statiques. Les affiches déjà dessinées sont ses fichiers statiques : Cloudflare les sert
 * sans lancer ce code (gratuit, sans limite, hors des 100 000 requêtes par jour). Ce code ne tourne que pour une
 * affiche absente : il la met dans la file (table demandes de la base nuvio-affiches) et répond 503, et Nuvio montre
 * l'affiche d'origine sans la garder. La machine GitHub dépile la file toutes les 10 minutes
 * (scripts/affiches-statiques.mjs), dessine l'affiche et la publie avec les autres.
 * Mis en ligne par ce même script (API de Cloudflare), pas par wrangler : la liste des styles est recopiée ici.
 */
const STYLES = new Set(__STYLES__);
// Une file plus longue que ça : des adresses au hasard (robot), pas des cartes de Nuvio.
const FILE_MAX = 5000;
const ADRESSE = /^\/([a-z]+)\/(movie|series)\/(poster|landscape)\/(tt\d{1,10}|tmdb:\d{1,10})\.jpg$/;

const absente = () => new Response(null, { status: 503, headers: { "Retry-After": "600", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let chemin = url.pathname;
    try { chemin = decodeURIComponent(chemin); } catch { return new Response("introuvable", { status: 404 }); }
    const m = ADRESSE.exec(chemin);
    if (!m || !STYLES.has(m[1])) return new Response("introuvable", { status: 404, headers: { "Cache-Control": "public, max-age=3600" } });
    ctx.waitUntil(env.DB.prepare(
      "INSERT OR IGNORE INTO demandes (chemin, vu) SELECT ?, ? WHERE (SELECT COUNT(*) FROM demandes) < ?")
      .bind(chemin, new Date().toISOString(), FILE_MAX).run()
      .catch((e) => console.warn(`file : ${e && e.message}`)));
    return absente();
  },
};
