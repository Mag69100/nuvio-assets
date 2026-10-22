/**
 * La réserve des affiches déjà dessinées, chez l'addon (worker/reserve.js), rangées par contentKey : une affiche
 * identique à la veille (la plupart des affiches à statut, redemandées chaque nuit) ou d'avant une mise en ligne
 * (qui vide le cache de Vercel) est relue au lieu d'être redessinée. Relire coûte quelques millisecondes de calcul,
 * dessiner ~0,23 s (lib/budget.js).
 * Sans RELAIS_KEY, ou RESERVE=off sur Vercel : pas de réserve, on dessine comme avant. Addon lent ou en panne : on
 * dessine aussi (pas attendu plus de 800 ms).
 */
import { ADDON_URL } from "./tendances.js";

const DELAI_LIRE_MS = 800, DELAI_GARDER_MS = 1500;

export function creerReserve({ env = process.env, fetchImpl = fetch } = {}) {
  const actif = !!env.RELAIS_KEY && env.RESERVE !== "off";
  const adresse = (cle) => `${env.ADDON_URL || ADDON_URL}/reserve/${cle}`;
  return {
    /** Le JPEG gardé pour ce contenu, ou null. Ne rejette jamais. */
    async lire(cle) {
      if (!actif) return null;
      try {
        const res = await fetchImpl(adresse(cle), { headers: { "X-Relais-Cle": env.RELAIS_KEY }, signal: AbortSignal.timeout(DELAI_LIRE_MS) });
        if (res.status !== 200) return null;
        const jpg = Buffer.from(await res.arrayBuffer());
        return jpg.length > 4 && jpg[0] === 0xff && jpg[1] === 0xd8 ? jpg : null;
      } catch (e) {
        return null;
      }
    },
    /** Range un dessin. Ne rejette jamais : une affiche pas rangée sera redessinée, rien de plus. */
    async garder(cle, jpg) {
      if (!actif) return;
      try {
        const res = await fetchImpl(adresse(cle), { method: "PUT", body: jpg, headers: { "X-Relais-Cle": env.RELAIS_KEY, "Content-Type": "image/jpeg" },
          signal: AbortSignal.timeout(DELAI_GARDER_MS) });
        if (!res.ok) console.warn(`réserve des affiches : addon ${res.status}`);
      } catch (e) {
        console.warn(`réserve des affiches : ${e && e.message}`);
      }
    },
  };
}
