/**
 * Le compteur de calcul du service d'affiches. Vercel (offre Hobby) donne 4 h de CPU actif par mois pour tout le
 * compte, et les dépasser coupe le compte 30 jours. Chaque instance du service envoie ici, une fois par minute au
 * plus, le CPU dépensé depuis son dernier envoi (affiches/lib/budget.js). L'addon le range par jour (UTC) dans la
 * base D1 et répond le total des 31 derniers jours : passé son budget, le service ne dessine plus et l'appli montre
 * l'affiche d'origine. 31 jours glissants plutôt qu'un mois du calendrier : la période de Vercel ne commence pas
 * forcément le 1er, et toute période de 30 jours tient dans une fenêtre de 31.
 * POST /cpu?ms=…, avec l'en-tête X-Relais-Cle (RELAIS_KEY, la même valeur des deux côtés). Sans clé définie ici, ou
 * sans base (copies, Docker) : 404, et le service garde son propre compte, instance par instance.
 */
const FENETRE_JOURS = 31, GARDE_JOURS = 62;
// Un envoi ne dépasse jamais une heure de calcul : au-delà, c'est une erreur ou un abus.
const MAX_MS = 3600000;

let ready = null;
const table = (env) => (ready = ready || env.LIENS.prepare(
  "CREATE TABLE IF NOT EXISTS cpu (j TEXT PRIMARY KEY, ms INTEGER NOT NULL)").run()
  .catch((e) => { ready = null; throw e; }));

const jourUtc = (t) => new Date(t).toISOString().slice(0, 10);

/** Comparaison en temps constant : la durée ne dit pas combien de caractères de la clé sont justes. */
function memeCle(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function routeCpu(request, env, url, now = Date.now()) {
  const reponse = (corps, status = 200) => new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (!env.RELAIS_KEY || !env.LIENS) return reponse({ error: "introuvable" }, 404);
  if (request.method !== "POST") return reponse({ error: "POST seulement" }, 405);
  if (!memeCle(request.headers.get("X-Relais-Cle") || "", env.RELAIS_KEY)) return reponse({ error: "clé" }, 403);
  const ms = Number(url.searchParams.get("ms"));
  if (!Number.isInteger(ms) || ms < 0 || ms > MAX_MS) return reponse({ error: "ms" }, 400);
  try {
    await table(env);
    if (ms > 0) {
      await env.LIENS.prepare("INSERT INTO cpu (j, ms) VALUES (?, ?) ON CONFLICT (j) DO UPDATE SET ms = ms + excluded.ms").bind(jourUtc(now), ms).run();
    }
    const r = await env.LIENS.prepare("SELECT COALESCE(SUM(ms), 0) AS t FROM cpu WHERE j >= ?").bind(jourUtc(now - (FENETRE_JOURS - 1) * 86400000)).first();
    // Une fois par jour environ (le premier envoi après minuit UTC) : on oublie les jours trop vieux.
    if (now % 86400000 < 60000) await env.LIENS.prepare("DELETE FROM cpu WHERE j < ?").bind(jourUtc(now - GARDE_JOURS * 86400000)).run();
    return reponse({ ms: Number((r && r.t) || 0), jours: FENETRE_JOURS });
  } catch (e) {
    console.warn(`compteur de calcul : ${e && e.message}`);
    return reponse({ error: "base" }, 503);
  }
}
