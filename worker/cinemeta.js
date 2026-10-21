/**
 * Nuvio « de base », pour l'avant / après de l'aperçu (apercu.js) : Nuvio TV tout juste installé n'a qu'un addon
 * de catalogues, Cinemeta (AddonPreferences.getDefaultAddons, avec OpenSubtitles qui n'a pas de rangée). Son
 * accueil montre les rangées de Cinemeta qui ne demandent aucun filtre : « Popular » et « Featured », films puis
 * séries, dans l'ordre de son manifest (« New », « Last videos »… ont un filtre obligatoire).
 *
 * Le navigateur ne contacte pas Cinemeta : le worker relaie la rangée, réduite à ce que l'écran affiche, et la
 * garde un jour (Cinemeta la change rarement plus vite).
 */
export const CINEMETA = "https://v3-cinemeta.strem.io";
export const CINEMETA_GARDE_S = 86400;
const MAX = 20;
const CHAMPS = ["id", "type", "name", "poster", "background", "logo", "description", "releaseInfo", "runtime", "genres", "imdbRating", "released"];

/** Une fiche de Cinemeta réduite à ce que l'écran affiche (titres, images, lignes d'infos du haut de l'accueil). */
export function allege(m, type) {
  const out = {};
  for (const k of CHAMPS) {
    const v = m[k];
    if (v == null || v === "") continue;
    if (k === "genres") { if (Array.isArray(v)) out.genres = v.filter((g) => typeof g === "string").slice(0, 3); continue; }
    if (typeof v === "string" || typeof v === "number") out[k] = String(v).slice(0, k === "description" ? 600 : 300);
  }
  out.type = type;
  return out;
}

/** /cinemeta/<movie|series>/<top|imdbRating>.json : { metas }, gardé un jour. */
export async function routeCinemeta(path, headers, ctx) {
  const m = /^\/cinemeta\/(movie|series)\/(top|imdbRating)\.json$/.exec(path);
  if (!m) return new Response(JSON.stringify({ error: "introuvable" }), { status: 404, headers: { ...headers, "Cache-Control": "public, max-age=3600" } });
  const [, type, id] = m;
  const cle = new Request(`https://cache.local/cinemeta-v1/${type}/${id}`);
  const rendre = (corps) => new Response(corps, { headers: { ...headers, "Cache-Control": `public, max-age=${CINEMETA_GARDE_S}` } });
  const hit = await caches.default.match(cle).catch(() => null);
  if (hit) return rendre(await hit.text());
  let metas = null;
  try {
    const r = await fetch(`${CINEMETA}/catalog/${type}/${id}.json`, { cf: { cacheTtl: CINEMETA_GARDE_S, cacheEverything: true } });
    const d = r.ok ? await r.json() : null;
    if (d && Array.isArray(d.metas)) metas = d.metas.filter((x) => x && /^tt\d+$/.test(String(x.id)) && x.name && x.poster).slice(0, MAX).map((x) => allege(x, type));
  } catch (e) { metas = null; }
  // Cinemeta injoignable : une rangée vide, redemandée dans 5 minutes (jamais gardée un jour).
  if (!metas || !metas.length) return new Response(JSON.stringify({ metas: [] }), { status: 502, headers: { ...headers, "Cache-Control": "public, max-age=300" } });
  const corps = JSON.stringify({ metas });
  const garde = caches.default.put(cle, new Response(corps, { headers: { "Cache-Control": `public, max-age=${CINEMETA_GARDE_S}` } })).catch(() => {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(garde); else await garde;
  return rendre(corps);
}
