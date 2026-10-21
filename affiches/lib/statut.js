/**
 * Sortie d'un titre, vue de France : est-il disponible chez soi en VF (« sorti »), et quel statut afficher
 * au-dessus de son rang (« Bientôt », « En salle », « Nouveau », « Nouvelle saison ») ?
 * Mêmes règles que les rangées de l'addon (worker/index.js : firstDigital, digitalGuess, likelyVf) :
 * - chez soi = première sortie numérique, vidéo ou télé, où que ce soit (les sources suivent), sinon salle + 45 jours ;
 * - VF probable = film français, ou déjà sorti en France, Belgique, Suisse, Luxembourg ou au Canada, ou sur une
 *   plateforme d'un de ces pays (facts.plateformeFrancophone : films Netflix sans date francophone chez TMDB) ;
 * - sorti = chez soi ET VF probable. Pas sorti : noir et blanc et note cachée sur l'affiche (réglage « Pas sorti »).
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

function sortieFilm(facts, today) {
  const toutes = releaseDates(facts.releases, [1, 2, 3, 4, 5, 6]);
  if (!toutes.length) {
    // Pas de dates détaillées : la date de la fiche, si elle existe, dit seulement si le film est sorti.
    const sorti = !!facts.releaseDate && facts.releaseDate <= today;
    if (sorti) return { sorti, statut: null };
    return facts.releaseDate ? { sorti, statut: "bientot", quand: { quoi: "sortie", date: facts.releaseDate, vers: false } } : { sorti, statut: "bientot" };
  }
  // Sorti il y a plus d'un an, où que ce soit : un vieux film (même ressorti ou annoncé à nouveau).
  if (toutes[0] < ajoute(today, -365)) return { sorti: true, statut: null };
  const salleMonde = releaseDates(facts.releases, [2, 3])[0] || "";
  const chezSoiConnu = releaseDates(facts.releases, [4, 5, 6])[0] || "";
  const chezSoi = chezSoiConnu || (salleMonde ? ajoute(salleMonde, SALLE_JOURS) : "");
  const vf = facts.originalLanguage === "fr" ? chezSoi : releaseDates(facts.releases, [2, 3, 4, 5, 6], FRANCOPHONES)[0] || "";
  // Disponible en VF le jour où les deux sont réunis. Sur une plateforme francophone : disponible aujourd'hui au
  // plus tard (depuis sa sortie chez soi si on la connaît).
  const reunis = chezSoi && vf ? (chezSoi > vf ? chezSoi : vf) : "";
  const dispo = facts.plateformeFrancophone && !(reunis && reunis <= today) ? (chezSoi && chezSoi <= today ? chezSoi : today) : reunis;
  if (dispo && dispo <= today) return { sorti: true, statut: dispo >= ajoute(today, -NOUVEAU_JOURS) ? "nouveau" : null };
  // Pas encore chez soi en VF : « En salle » s'il est au cinéma en France, sinon « Bientôt », avec la date
  // à venir la plus utile (comme les rangées) : dispo chez soi, sortie au cinéma en France, ou sortie ailleurs.
  const sallesFrance = releaseDates(facts.releases, [2, 3], ["FR"]);
  const dispoAVenir = dispo > today ? { quoi: "dispo", date: dispo, vers: !chezSoiConnu } : null;
  if (sallesFrance[0] && sallesFrance[0] <= today) return { sorti: false, statut: "salle", ...(dispoAVenir ? { quand: dispoAVenir } : {}) };
  const cinema = sallesFrance.find((d) => d > today);
  const ailleurs = releaseDates(facts.releases, [2, 3, 4]).find((d) => d > today);
  const quand = cinema ? { quoi: "cinema", date: cinema, vers: false } : dispoAVenir || (ailleurs ? { quoi: "sortie", date: ailleurs, vers: false } : null);
  return { sorti: false, statut: "bientot", ...(quand ? { quand } : {}) };
}

function sortieSerie(facts, today) {
  if (!facts.firstAir) return { sorti: false, statut: "bientot" };
  if (facts.firstAir > today) return { sorti: false, statut: "bientot", quand: { quoi: "sortie", date: facts.firstAir, vers: false } };
  if (facts.firstAir >= ajoute(today, -NOUVEAU_JOURS)) return { sorti: true, statut: "nouveau" };
  const derniere = (facts.seasons || [])
    .filter((s) => s.season_number >= 2 && s.air_date && s.air_date <= today)
    .sort((a, b) => b.season_number - a.season_number)[0];
  return { sorti: true, statut: derniere && derniere.air_date >= ajoute(today, -NOUVEAU_JOURS) ? "saison" : null };
}

/**
 * { sorti: disponible chez soi en VF, statut: "bientot" | "salle" | "nouveau" | "saison" | null,
 *   quand (pas sorti, si on la connaît) : { quoi: "dispo" | "cinema" | "sortie", date, vers: date estimée } }.
 */
export function etatSortie(facts, today) {
  return facts.type === "series" ? sortieSerie(facts, today) : sortieFilm(facts, today);
}

/** Le statut seul. */
export const statutDe = (facts, today) => etatSortie(facts, today).statut;
