/**
 * Le mot de passe de la séance : la preuve que le Catalogue FR est bien installé dans Nuvio, et que sa
 * recherche répond.
 *
 * Le guide (salle 1) tire un code de 4 chiffres et dit « dans Nuvio, va dans Rechercher et tape : séance 4821 ».
 * La recherche de l'addon reconnaît ce mot de passe : elle répond par une seule carte, « ✓ Salle connectée »
 * (rien à regarder), et note le code avec l'heure. Pendant ce temps, le guide demande toutes les 3 secondes
 * GET /seance/<code> : dès que le code est noté, l'étape est cochée.
 *
 * Rien d'autre n'est gardé : le code et l'heure, valables 15 minutes. Dans la base D1 des liens fixes (LIENS),
 * table créée au premier besoin et vidée au fil de l'eau ; sans base (copie sans D1), dans le cache de
 * Cloudflare, qui est propre à chaque centre de données : la TV et le téléphone passent en général par le
 * même, mais pas toujours (le guide le dit après 10 minutes sans réponse).
 */

export const SEANCE_ID = "catfr-seance";
const VALIDE_MS = 15 * 60e3;
const PURGE_MS = 10 * 60e3;
const cacheKey = (code) => new Request(`https://cache.local/seance/${code}`);
const NO_STORE = { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };

/**
 * Le code d'une recherche « séance 4821 » (accents, majuscules et espaces indifférents, « seance4821 » aussi),
 * ou null si ce n'en est pas une.
 */
export function codeSeance(query) {
  const q = String(query || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const m = /^seance\s*(\d{4})$/i.exec(q);
  return m ? m[1] : null;
}

let pret = null, purgee = 0;
const table = (env) => (pret = pret || env.LIENS.prepare(
  "CREATE TABLE IF NOT EXISTS seances (code TEXT PRIMARY KEY, t INTEGER NOT NULL)").run()
  .catch((e) => { pret = null; throw e; }));
const noTable = (e) => /no such table/i.test(String((e && e.message) || e));

/** Note le code (base D1, sinon cache de Cloudflare). Ne lève jamais d'erreur. */
export async function noterSeance(env, code, now = Date.now()) {
  try {
    if (env.LIENS) {
      await table(env);
      await env.LIENS.prepare("INSERT OR REPLACE INTO seances (code, t) VALUES (?, ?)").bind(code, now).run();
      // Les vieux codes partent au fil de l'eau, une fois toutes les 10 minutes au plus (par instance).
      if (now - purgee > PURGE_MS) {
        purgee = now;
        await env.LIENS.prepare("DELETE FROM seances WHERE t < ?").bind(now - VALIDE_MS).run();
      }
      return true;
    }
    await caches.default.put(cacheKey(code), new Response(String(now), { headers: { "Cache-Control": `public, max-age=${VALIDE_MS / 1000}` } }));
    return true;
  } catch (e) {
    console.warn("séance :", String((e && e.message) || e).slice(0, 200));
    return false;
  }
}

/** Le code a-t-il été tapé dans Nuvio depuis moins de 15 minutes ? */
export async function seanceVue(env, code, now = Date.now()) {
  let t = 0;
  if (env.LIENS) {
    try {
      const r = await env.LIENS.prepare("SELECT t FROM seances WHERE code = ?").bind(code).first();
      t = r ? Number(r.t) : 0;
    } catch (e) {
      if (!noTable(e)) throw e;
    }
  } else {
    const hit = await caches.default.match(cacheKey(code)).catch(() => null);
    t = hit ? Number(await hit.text()) || 0 : 0;
  }
  return t > 0 && now - t < VALIDE_MS;
}

/** La carte montrée dans la recherche de Nuvio (et sa fiche, si on l'ouvre). */
export function carteSeance(origin, type = "movie") {
  return {
    id: SEANCE_ID, type,
    name: "✓ Salle connectée",
    poster: `${origin}/logo.png`, posterShape: "square",
    description: "C'est bon : Nuvio voit bien le Catalogue FR, et sa recherche marche. Reviens au guide sur ton téléphone ou ton ordinateur : l'étape s'est cochée toute seule. (Cette carte n'est pas un film : rien à regarder ici.)",
  };
}

/**
 * Recherche de Nuvio : « séance 4821 » → la carte, jamais gardée en cache (ni chez Cloudflare ni dans Nuvio),
 * et le code noté. null pour toute autre recherche. La carte est dans la rangée « Films » seulement (pas en
 * double dans « Séries »), mais le code est noté par les deux : l'une des deux suffit.
 * `limite` : liaison facultative de wrangler.toml (LIMITE_SEANCE), par adresse IP, contre les codes notés à la chaîne.
 */
export async function rechercheSeance(request, env, type, query) {
  const code = codeSeance(query);
  if (!code) return null;
  let ok = true;
  if (env.LIMITE_SEANCE) {
    const ip = request.headers.get("cf-connecting-ip") || "?";
    ({ success: ok } = await env.LIMITE_SEANCE.limit({ key: ip }).catch(() => ({ success: true })));
  }
  if (ok) await noterSeance(env, code);
  const metas = type === "movie" ? [carteSeance(new URL(request.url).origin)] : [];
  return new Response(JSON.stringify({ metas }), { headers: NO_STORE });
}

/** GET /seance/<code> → { ok } : le guide demande si son code a été tapé dans Nuvio. */
export async function routeSeance(request, env, code) {
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "Méthode non prise en charge." }), { status: 405, headers: NO_STORE });
  if (!/^\d{4}$/.test(code)) return new Response(JSON.stringify({ error: "Code invalide." }), { status: 400, headers: NO_STORE });
  try {
    return new Response(JSON.stringify({ ok: await seanceVue(env, code) }), { headers: NO_STORE });
  } catch (e) {
    console.warn("séance :", String((e && e.message) || e).slice(0, 200));
    return new Response(JSON.stringify({ ok: false, error: "Base injoignable pour le moment." }), { status: 503, headers: { ...NO_STORE, "Retry-After": "10" } });
  }
}
