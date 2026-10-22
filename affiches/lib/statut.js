/**
 * Sortie d'un titre, vue de France : est-il disponible chez soi en VF (« sorti »), et quel statut afficher
 * au-dessus de son rang (« Bientôt », « En salle », « Nouveau », « Nouvelle saison ») ?
 * Mêmes règles que les rangées de l'addon (worker/index.js : firstDigital, digitalGuess, likelyVf) :
 * - chez soi = première sortie numérique, vidéo ou télé, où que ce soit (les sources suivent), sinon salle + 45 jours ;
 * - VF probable = film français, ou déjà sorti en France, Belgique, Suisse, Luxembourg ou au Canada, ou sur une
 *   plateforme en France (facts.plateformeFrance : films Netflix sans date francophone chez TMDB) ;
 * - sorti = chez soi ET VF probable. Pas sorti : noir et blanc et note cachée sur l'affiche (réglage « Pas sorti »).
 * Pour un titre de moins d'un an, les sources lues chez Torrentio (avec la qualité) décident quand on les a : ce
 * qu'on obtient en faisant « Lire ». Des sources sans VF : pas sorti (seule la VF compte), « Bientôt » en noir et
 * blanc. Les dates ne servent plus qu'en repli
 * (vérifié sur 69 films récents : les dates seules se trompaient pour 9 d'entre eux).
 */
const NOUVEAU_JOURS = 30, SALLE_JOURS = 45;
const FRANCOPHONES = ["FR", "BE", "CH", "LU", "CA"];

const ajoute = (iso, n) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);

function releaseDates(releases, types, pays) {
  return (releases || [])
    .filter((r) => !pays || pays.includes(r.iso_3166_1))
    .flatMap((r) => r.release_dates || [])
    .filter((r) => types.includes(r.type))
    .map((r) => (r.release_date || "").slice(0, 10))
    .filter(Boolean)
    .sort();
}

/**
 * Un vieux film : sorti il y a plus d'un an, où que ce soit (même ressorti ou annoncé à nouveau). Les avant-premières
 * de festival (type 1) ne comptent pas : un film y passe souvent un an avant sa sortie (Bad Apples), sauf s'il n'a
 * jamais eu que ça, il y a plus de deux ans. Pas un vieux film s'il sort bientôt au cinéma en France pour la première
 * fois (3670 : festivals et sortie coréenne il y a plus d'un an) ; une vraie reprise (film de plus de deux ans,
 * Quand la mer monte, 2004) en reste un.
 */
function estVieux(facts, today) {
  const toutes = releaseDates(facts.releases, [1, 2, 3, 4, 5, 6]);
  const commerciales = releaseDates(facts.releases, [2, 3, 4, 5, 6]);
  const vieux = commerciales[0] ? commerciales[0] < ajoute(today, -365) : toutes[0] < ajoute(today, -730);
  const enFranceAVenir = releaseDates(facts.releases, [2, 3], ["FR"]).some((d) => d > today);
  return vieux && !(enFranceAVenir && (commerciales[0] || toutes[0]) >= ajoute(today, -730));
}

/** Les sources valent-elles d'être lues pour le statut ? Un film récent déjà sorti quelque part, une série récente. */
export function sourcesUtiles(facts, today) {
  if (facts.type === "series") return !!facts.firstAir && facts.firstAir <= today && (facts.lastEpisode || facts.firstAir) >= ajoute(today, -365);
  const commerciales = releaseDates(facts.releases, [2, 3, 4, 5, 6]);
  return commerciales.some((d) => d <= today) && !estVieux(facts, today);
}

/** Les sources lues (avec la qualité) : { vf, sources } si on sait, sinon null (les dates décident). */
const lues = (sources) => (sources && typeof sources.vf === "boolean" ? sources : null);

function sortieFilm(facts, today, sources) {
  const toutes = releaseDates(facts.releases, [1, 2, 3, 4, 5, 6]);
  if (!toutes.length) {
    // Pas de dates détaillées : la date de la fiche, si elle existe, dit seulement si le film est sorti.
    const sorti = !!facts.releaseDate && facts.releaseDate <= today;
    if (sorti) return { sorti, statut: null };
    return facts.releaseDate ? { sorti, statut: "bientot", quand: { quoi: "sortie", date: facts.releaseDate, vers: false } } : { sorti, statut: "bientot" };
  }
  if (estVieux(facts, today)) return { sorti: true, statut: null };
  const commerciales = releaseDates(facts.releases, [2, 3, 4, 5, 6]);
  const s = lues(sources);
  const salleMonde = releaseDates(facts.releases, [2, 3])[0] || "";
  const chezSoiConnu = releaseDates(facts.releases, [4, 5, 6])[0] || "";
  const chezSoi = chezSoiConnu || (salleMonde ? ajoute(salleMonde, SALLE_JOURS) : "");
  const vf = facts.originalLanguage === "fr" ? chezSoi : releaseDates(facts.releases, [2, 3, 4, 5, 6], FRANCOPHONES)[0] || "";
  // Disponible en VF le jour où les deux sont réunis. Sur une plateforme en France : disponible aujourd'hui au
  // plus tard (depuis sa sortie chez soi si on la connaît).
  const reunis = chezSoi && vf ? (chezSoi > vf ? chezSoi : vf) : "";
  const dispo = facts.plateformeFrance && !(reunis && reunis <= today) ? (chezSoi && chezSoi <= today ? chezSoi : today) : reunis;
  // Des sources VF : disponible (depuis la date connue, sinon aujourd'hui). Sans sources lues : les dates.
  if (s && s.vf) {
    const depuis = dispo && dispo <= today ? dispo : chezSoi && chezSoi <= today ? chezSoi : today;
    return { sorti: true, statut: depuis >= ajoute(today, -NOUVEAU_JOURS) ? "nouveau" : null };
  }
  if (!s && dispo && dispo <= today) return { sorti: true, statut: dispo >= ajoute(today, -NOUVEAU_JOURS) ? "nouveau" : null };
  // Pas encore chez soi en VF : « En salle » s'il est au cinéma en France, sinon « Bientôt », avec la date
  // à venir la plus utile (comme les rangées) : dispo chez soi, sortie au cinéma en France, ou sortie ailleurs.
  const sallesFrance = releaseDates(facts.releases, [2, 3], ["FR"]);
  const dispoAVenir = dispo > today ? { quoi: "dispo", date: dispo, vers: !chezSoiConnu } : null;
  if (sallesFrance[0] && sallesFrance[0] <= today) return { sorti: false, statut: "salle", ...(dispoAVenir ? { quand: dispoAVenir } : {}) };
  const cinema = sallesFrance.find((d) => d > today);
  // Des sources, mais aucune en VF (et pas de sortie au cinéma en France à venir) : pas sorti, « Bientôt » sans date
  // (seule la VF compte, et on ne sait pas quand elle viendra).
  if (s && !s.vf && s.sources > 0 && !cinema) return { sorti: false, statut: "bientot" };
  // Déjà sorti quelque part (Bad Apples : au cinéma en Allemagne) : son arrivée chez soi, annoncée ou estimée,
  // comme la rangée « Bientôt dispo » ; jamais la sortie d'un autre pays (« SORT LE » se lirait comme en France).
  const dejaSorti = commerciales.some((d) => d <= today);
  const chezSoiAVenir = dejaSorti && chezSoi > today ? { quoi: "dispo", date: chezSoi, vers: !chezSoiConnu } : null;
  const ailleurs = dejaSorti ? "" : releaseDates(facts.releases, [2, 3, 4]).find((d) => d > today);
  const quand = cinema ? { quoi: "cinema", date: cinema, vers: false } : dispoAVenir || chezSoiAVenir || (ailleurs ? { quoi: "sortie", date: ailleurs, vers: false } : null);
  return { sorti: false, statut: "bientot", ...(quand ? { quand } : {}) };
}

/**
 * Série : les sources lues sont celles du 1er épisode de sa dernière saison, souvent pas encore doublée (One Piece,
 * saison 23 ; la saison en cours de New York Unité spéciale) alors que la série l'est : elles ne jugent que les
 * nouvelles séries (première diffusion il y a moins d'un an). Sans VF dans ces sources (sans sources du tout : pas de
 * quoi juger), une nouvelle série n'est pas sortie : « Bientôt », en noir et blanc ; sauf sur une plateforme en France
 * qui la double (série en anglais ou en français, Netflix, Disney+). Une vieille série dont seule la dernière saison
 * (ou un seul « saison » de mille épisodes, Doraemon) manque de VF : rien ne change.
 */
function sortieSerie(facts, today, sources) {
  const base = sortieSerieDates(facts, today), s = lues(sources);
  const nouvelle = !!facts.firstAir && facts.firstAir >= ajoute(today, -365);
  if (!base.sorti || !s || s.vf || !(s.sources > 0) || !nouvelle || facts.plateformeFrance) return base;
  return { sorti: false, statut: "bientot" };
}

/** Une nouvelle saison (la 2e ou plus) commence dans moins de 60 jours : « SAISON 3 BIENTÔT », série en couleur. */
const PROCHAINE_JOURS = 60;
function saisonProchaine(facts, today) {
  const { nextEpisode: d, nextSeason: s, nextEpisodeNumber: e } = facts;
  return d && d > today && d <= ajoute(today, PROCHAINE_JOURS) && s >= 2 && e === 1 ? s : null;
}

function sortieSerieDates(facts, today) {
  if (!facts.firstAir) return { sorti: false, statut: "bientot" };
  if (facts.firstAir > today) return { sorti: false, statut: "bientot", quand: { quoi: "sortie", date: facts.firstAir, vers: false } };
  const prochaine = saisonProchaine(facts, today);
  if (prochaine) return { sorti: true, statut: "prochaine", saison: prochaine };
  if (facts.firstAir >= ajoute(today, -NOUVEAU_JOURS)) return { sorti: true, statut: "nouveau" };
  const derniere = (facts.seasons || [])
    .filter((s) => s.season_number >= 2 && s.air_date && s.air_date <= today)
    .sort((a, b) => b.season_number - a.season_number)[0];
  return { sorti: true, statut: derniere && derniere.air_date >= ajoute(today, -NOUVEAU_JOURS) ? "saison" : null };
}

/**
 * { sorti: disponible chez soi en VF, statut: "bientot" | "salle" | "nouveau" | "saison" | "prochaine" | null,
 *   saison (« prochaine » : la saison qui commence bientôt),
 *   quand (pas sorti, si on la connaît) : { quoi: "dispo" | "cinema" | "sortie", date, vers: date estimée } }.
 * sources (facultatif) : { vf, sources } lus chez Torrentio avec la qualité ; null ou vf inconnu : les dates.
 */
export function etatSortie(facts, today, sources = null) {
  return facts.type === "series" ? sortieSerie(facts, today, sources) : sortieFilm(facts, today, sources);
}

/** Le statut seul. */
export const statutDe = (facts, today) => etatSortie(facts, today).statut;

// ---------- La suite d'une série, une fois sortie ----------
// Un seul libellé en haut à gauche, jamais deux, par ordre de priorité :
// 1. la sortie (etatSortie : « BIENTÔT », la date ou le compte à rebours, « AU CINÉMA », « NOUVEAU », « NOUVELLE SAISON ») ;
// 2. « NOUVEL ÉPISODE » (réglage Épisodes) : un épisode sorti il y a moins de 7 jours ;
// 3. « TERMINÉE » ou « ANNULÉE » (réglage Fin) : statut TMDB Ended ou Canceled.
// L'avancement de la saison (réglage Avancement) n'est pas un libellé : « S1 · 4/8 » sous le libellé (ou seul),
// pour une série pas finie dont la saison en cours n'est pas complète.
const FINS = { Ended: "TERMINÉE", Canceled: "ANNULÉE" };
export const LIBELLES_FIN = Object.freeze(Object.values(FINS));
const NOUVEL_EPISODE_JOURS = 7;

/**
 * { episode: un épisode sorti il y a moins de 7 jours, fin: "TERMINÉE" | "ANNULÉE" | null,
 *   avance: { s: saison, n: épisodes diffusés, t: épisodes de la saison } | null }.
 * Avancement : la saison du dernier épisode diffusé, avec son nombre d'épisodes connu et pas encore atteint.
 */
export function suiteSerie(facts, today) {
  if (facts.type !== "series") return { episode: false, fin: null, avance: null };
  const last = facts.lastEpisode;
  const episode = !!last && last <= today && Math.round((Date.parse(today) - Date.parse(last)) / 86400000) < NOUVEL_EPISODE_JOURS;
  const fin = FINS[facts.status] || null;
  const saison = (facts.seasons || []).find((s) => s.season_number === facts.lastSeason);
  const n = facts.lastEpisodeNumber, t = saison ? saison.episode_count : null;
  const avance = !fin && facts.lastSeason >= 1 && Number.isInteger(n) && Number.isInteger(t) && n >= 1 && t > n ? { s: facts.lastSeason, n, t } : null;
  return { episode, fin, avance };
}

/** Le libellé de la suite (priorités 2 et 3 ci-dessus), selon les réglages du statut ; null sans rien à dire. */
export function libelleSuite(suite, { episode, fin }) {
  if (episode && suite.episode) return "NOUVEL ÉPISODE";
  return (fin && suite.fin) || null;
}
