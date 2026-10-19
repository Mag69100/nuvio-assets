/**
 * Copies auto-hébergées du Catalogue FR (fork Cloudflare ou conteneur Docker).
 *
 * Le même code sert l'instance principale (la « source ») et les copies. Une copie se reconnaît à son
 * adresse : tout autre hôte que celui de l'instance principale. Seules les copies ont un identifiant d'addon à elles
 * (pour installer les deux dans Nuvio sans conflit) et l'espace hébergeur (/hote/…).
 */

export const SOURCE_HOST = "nuvio-assets.xnzxflix.workers.dev";
const ADDON_ID = "com.xnzx07.catalogue-fr";

/** La requête arrive-t-elle sur une copie (et pas sur l'instance principale) ? */
export const isCopy = (url) => url.hostname !== SOURCE_HOST;

/** Identifiant de l'addon dans Nuvio : celui de la source, « …perso » sur une copie. */
export const addonId = (url) => (isCopy(url) ? `${ADDON_ID}.perso` : ADDON_ID);
