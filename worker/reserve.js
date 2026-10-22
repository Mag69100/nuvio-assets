/**
 * La réserve des affiches maison : les JPEG déjà dessinés par le service d'affiches (Vercel), rangés par leur
 * contenu (contentKey, l'ETag de l'affiche : le même dessin a la même clé). Le service la consulte avant de
 * dessiner. Sans elle, il redessinait chaque nuit des milliers d'affiches à statut, presque toutes identiques à la
 * veille, et toutes les affiches après chaque mise en ligne (elle vide le cache de Vercel). Un dessin coûte
 * ~0,23 s de CPU, et l'offre Hobby n'en donne que 4 h par mois (voir cpu.js).
 * GET /reserve/<clé> : le JPEG, ou 404. PUT /reserve/<clé> : le garde. Les deux avec l'en-tête X-Relais-Cle.
 * Base D1 à part (RESERVE) : une base gratuite tient 500 Mo, et les liens fixes ne doivent jamais manquer de
 * place. Chaque nuit (tâche de 4 h UTC), on oublie les affiches pas lues depuis 8 jours, puis les plus
 * anciennes au-delà de 400 Mo. Sans clé ou sans base (copies, Docker) : 404, le service dessine comme avant.
 */
import { memeCle } from "./cpu.js";

const MAX_OCTETS = 400 * 1024, GARDE_JOURS = 8, PLAFOND_OCTETS = 400 * 1024 * 1024;

let ready = null;
const table = (db) => (ready = ready || db.prepare(
  "CREATE TABLE IF NOT EXISTS affiches (k TEXT PRIMARY KEY, img BLOB NOT NULL, n INTEGER NOT NULL, t TEXT NOT NULL)").run()
  .catch((e) => { ready = null; throw e; }));

const jourUtc = (t) => new Date(t).toISOString().slice(0, 10);

const vide = (status) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

export async function routeReserve(request, env, cle, now = Date.now()) {
  const db = env.RESERVE;
  if (!env.RELAIS_KEY || !db) return vide(404);
  if (!memeCle(request.headers.get("X-Relais-Cle") || "", env.RELAIS_KEY)) return vide(403);
  if (!/^[0-9a-f]{40}$/.test(cle)) return vide(400);
  try {
    await table(db);
    if (request.method === "GET") {
      const r = await db.prepare("SELECT img, t FROM affiches WHERE k = ?").bind(cle).first();
      if (!r) return vide(404);
      // Lue aujourd'hui : gardée 8 jours de plus. Une écriture par affiche et par jour au plus.
      if (r.t < jourUtc(now)) await db.prepare("UPDATE affiches SET t = ? WHERE k = ?").bind(jourUtc(now), cle).run();
      return new Response(new Uint8Array(r.img), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" } });
    }
    if (request.method === "PUT") {
      const img = new Uint8Array(await request.arrayBuffer());
      // Un JPEG (FF D8), de taille raisonnable : rien d'autre ne se range ici.
      if (img.length < 4 || img.length > MAX_OCTETS || img[0] !== 0xff || img[1] !== 0xd8) return vide(400);
      await db.prepare("INSERT OR REPLACE INTO affiches (k, img, n, t) VALUES (?, ?, ?, ?)").bind(cle, img, img.length, jourUtc(now)).run();
      return vide(204);
    }
    return vide(405);
  } catch (e) {
    console.warn(`réserve des affiches : ${e && e.message}`);
    return vide(503);
  }
}

/** Ménage de la nuit : les affiches pas lues depuis 8 jours, puis les plus anciennes au-delà du plafond. */
export async function nettoyerReserve(env, now = Date.now()) {
  const db = env.RESERVE;
  if (!db) return;
  try {
    await table(db);
    await db.prepare("DELETE FROM affiches WHERE t < ?").bind(jourUtc(now - GARDE_JOURS * 86400000)).run();
    const r = await db.prepare("SELECT COALESCE(SUM(n), 0) AS total FROM affiches").first();
    let trop = Number((r && r.total) || 0) - PLAFOND_OCTETS;
    // Par jour de dernière lecture, du plus ancien au plus récent, jusqu'à repasser sous le plafond.
    while (trop > 0) {
      const plusVieux = await db.prepare("SELECT t, SUM(n) AS n FROM affiches GROUP BY t ORDER BY t LIMIT 1").first();
      if (!plusVieux) break;
      await db.prepare("DELETE FROM affiches WHERE t = ?").bind(plusVieux.t).run();
      trop -= Number(plusVieux.n);
    }
  } catch (e) {
    console.warn(`ménage de la réserve des affiches : ${e && e.message}`);
  }
}
