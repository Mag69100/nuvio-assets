/**
 * La réserve des affiches déjà dessinées, chez l'addon (worker/reserve.js), rangées par contentKey : une affiche
 * identique à la veille (la plupart des affiches à statut, redemandées chaque nuit) ou d'avant une mise en ligne
 * (qui vide le cache de Vercel) est relue au lieu d'être redessinée. Relire coûte quelques millisecondes de calcul,
 * dessiner ~0,23 s (lib/budget.js).
 * Sans RELAIS_KEY, ou RESERVE=off sur Vercel : pas de réserve, on dessine comme avant. Addon lent ou en panne : on
 * dessine aussi (pas attendu plus de 800 ms).
 * Rangée par contenu ET par code de dessin : une affiche lue chaque jour reste dans la réserve indéfiniment. Si le
 * dessin change sans que DESIGN (lib/contenu.js) change, l'ancien serait resservi pour toujours. L'empreinte des
 * fichiers qui dessinent (et des versions de satori et sharp, dans package.json) entre donc dans la clé.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ADDON_URL } from "./tendances.js";

const DELAI_LIRE_MS = 800, DELAI_GARDER_MS = 1500;
// Copiés avec la fonction (vercel.json, includeFiles). Les fins de ligne ne comptent pas : une mise en ligne depuis
// Windows (CRLF) ou depuis une copie Linux (LF) donne la même empreinte.
const FICHIERS_DU_DESSIN = ["./dessin.js", "./habillage.js", "./polices.js", "../package.json"];
export const EMPREINTE_DESSIN = (() => {
  const h = createHash("sha1");
  for (const f of FICHIERS_DU_DESSIN) {
    try { h.update(readFileSync(new URL(f, import.meta.url), "utf8").replace(/\r\n/g, "\n")); }
    catch (e) { console.warn(`réserve des affiches : ${f} illisible, pas dans l'empreinte`); h.update(`absent ${f}`); }
  }
  return h.digest("hex");
})();
/** La clé d'une affiche dans la réserve : son contenu (contentKey) et l'empreinte du dessin. */
export const cleReserve = (contenu) => createHash("sha1").update(`${EMPREINTE_DESSIN}:${contenu}`).digest("hex");

export function creerReserve({ env = process.env, fetchImpl = fetch } = {}) {
  const actif = !!env.RELAIS_KEY && env.RESERVE !== "off";
  const adresse = (contenu) => `${env.ADDON_URL || ADDON_URL}/reserve/${cleReserve(contenu)}`;
  return {
    /** Le JPEG gardé pour ce contenu (contentKey), ou null. Ne rejette jamais. */
    async lire(contenu) {
      if (!actif) return null;
      try {
        const res = await fetchImpl(adresse(contenu), { headers: { "X-Relais-Cle": env.RELAIS_KEY }, signal: AbortSignal.timeout(DELAI_LIRE_MS) });
        if (res.status !== 200) return null;
        const jpg = Buffer.from(await res.arrayBuffer());
        return jpg.length > 4 && jpg[0] === 0xff && jpg[1] === 0xd8 ? jpg : null;
      } catch (e) {
        return null;
      }
    },
    /** Range un dessin. Ne rejette jamais : une affiche pas rangée sera redessinée, rien de plus. */
    async garder(contenu, jpg) {
      if (!actif) return;
      try {
        const res = await fetchImpl(adresse(contenu), { method: "PUT", body: jpg, headers: { "X-Relais-Cle": env.RELAIS_KEY, "Content-Type": "image/jpeg" },
          signal: AbortSignal.timeout(DELAI_GARDER_MS) });
        if (!res.ok) console.warn(`réserve des affiches : addon ${res.status}`);
      } catch (e) {
        console.warn(`réserve des affiches : ${e && e.message}`);
      }
    },
  };
}
