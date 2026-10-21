/**
 * Liens préparés par le guide (salle 1) à partir des clés et de l'appareil que la personne indique.
 * Tout se calcule dans le navigateur : les fonctions ci-dessous sont aussi injectées telles quelles
 * dans la page (guide.js), d'où leur style autonome (pas d'import, seulement APPAREILS).
 *
 * Seul Torrentio se configure entièrement par son adresse (options séparées par « | »).
 * Lumio, StreamFusion Reborn et WAStream enregistrent la configuration chez eux (compte, jeton) :
 * pour eux, le guide dit seulement quoi cocher selon l'appareil.
 */

// Ce que chaque appareil sait lire (encadré « Avant tout » de l'étape 6, menu et tableau).
// Les box Android sont rangées par ce qu'elles savent lire (HD, 4K avec ou sans Dolby Vision), avec des exemples.
// qualite, exclure : colonnes du tableau. torrentio : jetons d'exclusion (qualityfilter) et taille max (sizefilter).
// lumio, streamfusion, wastream : ce qu'il faut régler sur leur site.
const AUDIO = "Formats audio à masquer : DTS-HD et TrueHD, sauf si un ampli ou une barre de son les décode.";
const SF_RIEN = "Rien de plus à cocher : 480p, CAM et Unknown, déjà cochés, suffisent.";
const HD = {
  qualite: "1080p",
  exclure: "4K, HDR, Dolby Vision, et de préférence HEVC/H.265 et AV1",
  torrentio: { qualityfilter: "4k,hdrall,brremux,threed,cam,scr", sizefilter: "15GB" },
  lumio: "Résolutions : décoche 4K et 1440p. Formats vidéo à masquer : HEVC, AV1 et Dolby Vision. Formats audio à masquer : DTS-HD et TrueHD. Taille max : 15 Go.",
  streamfusion: "Exclusions : coche 2160p, HDR, Dolby Vision et HEVC (en plus de 480p, CAM et Unknown, déjà cochés). Taille max : 15 Go.",
  wastream: "Résolutions : décoche 2160p. Taille max : 15 Go.",
};
// Fire TV Stick 4K Select et Fire TV Stick HD de 2026 (Wi-Fi 6) : Vega OS, pas Android, Nuvio ne s'y installe pas.
const VEGA = "Nuvio ne s'installe pas sur les modèles sous Vega OS";
export const APPAREILS = {
  "fire-hd": { nom: "Fire TV Stick Lite ou Fire TV Stick (HD)", exemples: VEGA + " : le Fire TV Stick HD de 2026 (Wi-Fi 6)", ...HD },
  "box-hd": { nom: "Autre clé ou box HD (1080p)", exemples: "Mi TV Stick, Chromecast avec Google TV HD, box d'entrée de gamme", ...HD },
  "fire-4k": {
    nom: "Fire TV Stick 4K, 4K Max ou Fire TV Cube",
    exemples: VEGA + " : le Fire TV Stick 4K Select",
    qualite: "4K",
    exclure: "AV1 sur les anciens modèles. Dolby Vision « profil 7 » des fichiers REMUX",
    torrentio: { qualityfilter: "brremux,threed,cam,scr" },
    lumio: "Formats vidéo à masquer : AV1 si ton modèle date d'avant 2023. " + AUDIO,
    streamfusion: SF_RIEN,
    wastream: "Rien à changer.",
  },
  "box-4k-dv": {
    nom: "Box 4K avec Dolby Vision",
    exemples: "Chromecast avec Google TV 4K, Google TV Streamer, Mi Box S 2e génération",
    qualite: "4K",
    exclure: "AV1 (sauf Google TV Streamer). Dolby Vision « profil 7 » des fichiers REMUX",
    torrentio: { qualityfilter: "brremux,threed,cam,scr" },
    lumio: "Formats vidéo à masquer : AV1 (sauf sur le Google TV Streamer). " + AUDIO,
    streamfusion: SF_RIEN,
    wastream: "Rien à changer.",
  },
  "box-4k": {
    nom: "Box 4K sans Dolby Vision, ou tu ne sais pas",
    exemples: "box d'opérateur (Freebox, Bbox, SFR…), Mi Box S 1re génération, box Android génériques (X96, H96, Tanix…)",
    qualite: "4K",
    exclure: "Dolby Vision, AV1 et les fichiers REMUX",
    torrentio: { qualityfilter: "dolbyvision,brremux,threed,cam,scr" },
    lumio: "Formats vidéo à masquer : AV1 et Dolby Vision. " + AUDIO,
    streamfusion: "Exclusions : coche Dolby Vision (en plus de 480p, CAM et Unknown, déjà cochés).",
    wastream: "Rien à changer.",
  },
  shield: {
    nom: "Nvidia Shield TV ou Shield TV Pro",
    qualite: "4K",
    exclure: "AV1. Le reste passe, REMUX compris",
    torrentio: { qualityfilter: "threed,cam,scr" },
    lumio: "Formats vidéo à masquer : AV1. " + AUDIO,
    streamfusion: SF_RIEN,
    wastream: "Rien à changer.",
  },
  tv: {
    nom: "TV Android ou Google TV",
    exemples: "le système intégré à la TV : Sony, TCL, Philips, Hisense…",
    qualite: "Selon la TV",
    exclure: "Ce que la fiche technique de ta TV ne cite pas (HDR10+, Dolby Vision…)",
    torrentio: { qualityfilter: "dolbyvision,threed,cam,scr" },
    lumio: "Formats vidéo à masquer : Dolby Vision, si ta TV ne le cite pas dans sa fiche technique. " + AUDIO,
    streamfusion: "Exclusions : coche Dolby Vision si ta TV ne le gère pas (en plus de 480p, CAM et Unknown, déjà cochés).",
    wastream: "Rien à changer.",
  },
  ecran: {
    nom: "Téléphone, tablette ou ordinateur",
    qualite: "Selon l'écran",
    exclure: "Rien en général",
    torrentio: { qualityfilter: "threed,cam,scr" },
    lumio: "Rien à masquer : garde les réglages proposés.",
    streamfusion: SF_RIEN,
    wastream: "Rien à changer.",
  },
};

// Une clé AllDebrid : lettres et chiffres, au moins 15 (en dessous, Torrentio la refuse sans essayer).
export function cleAllDebrid(texte) {
  const k = String(texte || "").replace(/[^A-Za-z0-9]/g, "");
  return k.length >= 15 ? k : "";
}

// Lien d'installation de Torrentio : français en premier, sans le catalogue AllDebrid sur l'accueil,
// et ce que l'appareil ne sait pas lire exclu. "" tant qu'il manque la clé ou l'appareil.
export function torrentioUrl(cle, appareil) {
  const k = cleAllDebrid(cle), a = APPAREILS[appareil];
  if (!k || !a) return "";
  const opts = ["language=french"];
  if (a.torrentio.qualityfilter) opts.push("qualityfilter=" + a.torrentio.qualityfilter);
  if (a.torrentio.sizefilter) opts.push("sizefilter=" + a.torrentio.sizefilter);
  opts.push("debridoptions=nocatalog", "alldebrid=" + k);
  return "https://torrentio.strem.fun/" + opts.join("|") + "/manifest.json";
}

// Lien « Installer dans Nuvio » : nuvio://… installe l’addon dans les applis Nuvio (TV, Android, iPhone, Mac, Linux).
// Pas stremio:// : si Stremio est installé, c’est lui qui l’ouvrirait. (Sous Windows, Nuvio n’enregistre aucun lien :
// la page cache alors le bouton, voir sansInstall.)
export function installUrl(manifest) {
  return /^https:[/][/][^/]+[/].*manifest[.]json$/.test(String(manifest || "")) ? String(manifest).replace(/^https:/, "nuvio:") : "";
}

// Sous Windows, Nuvio Desktop n’ouvre pas les liens nuvio:// : pas de bouton d’installation.
export function sansInstall(userAgent) {
  return /Windows/.test(String(userAgent || ""));
}

// Base perso de la salle 2 (adresse « …/<config>/configure » gardée par la page) → base de l'addon,
// ou "" si ce n'est pas une programmation de ce site.
export function basePerso(configureUrl, origin) {
  try {
    const u = new URL(configureUrl);
    if (u.origin !== origin || !/^[/][A-Za-z0-9_-]+[/]configure$/.test(u.pathname)) return "";
    return origin + u.pathname.replace(/[/]configure$/, "");
  } catch (e) { return ""; }
}

// Ce qu'on envoie sur le téléphone par QR code (après le #, jamais transmis au serveur) : la clé AllDebrid et l'appareil.
export function paquetCles({ ad, appareil }) {
  const o = {};
  if (cleAllDebrid(ad)) o.ad = cleAllDebrid(ad);
  if (APPAREILS[appareil]) o.app = appareil;
  return o;
}
export function lirePaquet(texte) {
  try {
    const o = JSON.parse(texte);
    return paquetCles({ ad: o.ad, appareil: o.app });
  } catch (e) { return {}; }
}

// Le code injecté dans la page du guide.
export const LIENS_JS = `const APPAREILS = ${JSON.stringify(APPAREILS)};
${cleAllDebrid}
${torrentioUrl}
${installUrl}
${sansInstall}
${basePerso}
${paquetCles}
${lirePaquet}`;
