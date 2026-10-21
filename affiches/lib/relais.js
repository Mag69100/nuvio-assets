/**
 * Clé des relais (/qualite, /notes, /vf.json) : une lecture qui n'est pas dans le cache du CDN va chez Torrentio
 * ou MDBList. Des identifiants au hasard (ou un paramètre en trop, qui change l'adresse) videraient le quota de
 * MDBList ou feraient bloquer Vercel par Torrentio. Avec RELAIS_KEY (variable du projet Vercel), seuls le service
 * lui-même et l'addon (qui envoient l'en-tête) font lire une adresse nouvelle ; une réponse déjà au CDN reste servie
 * à tous (l'en-tête ne compte pas dans la clé du cache). Sans RELAIS_KEY : relais ouverts, comme avant.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export const ENTETE_RELAIS = "X-Relais-Cle";

/** En-têtes à envoyer au relais (rien sans clé). */
export const enteteRelais = (cle) => (cle ? { [ENTETE_RELAIS]: cle } : {});

/** La demande doit-elle être refusée ? (clé configurée, et en-tête absent ou faux ; comparaison à temps constant) */
export function relaisRefuse(request, env = {}) {
  if (!env.RELAIS_KEY) return false;
  const empreinte = (x) => createHash("sha256").update(String(x)).digest();
  return !timingSafeEqual(empreinte(request.headers.get(ENTETE_RELAIS) || ""), empreinte(env.RELAIS_KEY));
}

/** Refus : jamais gardé par le CDN (la bonne demande suivante doit passer). */
export const refusRelais = () => new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
