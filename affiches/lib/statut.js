/**
 * Statut d'un titre, affiché au-dessus de son rang de tendance : « Bientôt », « En salle », « Nouveau »,
 * « Nouvelle saison ». Mêmes règles de dates que l'addon (worker/index.js : releaseDates, firstDigital,
 * digitalGuess) : types TMDB 2 et 3 = salle, 4 = numérique ; sans date numérique, salle + 45 jours.
 */
const NOUVEAU_JOURS = 30, SALLE_JOURS = 45;

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

function statutFilm(facts, today) {
  const toutes = releaseDates(facts.releases, [1, 2, 3, 4, 5, 6]);
  if (!toutes.length) {
    // Pas de dates détaillées : la date de la fiche, si elle existe, dit seulement si le film est sorti.
    return !facts.releaseDate || facts.releaseDate > today ? "bientot" : null;
  }
  if (toutes[0] > today) return "bientot";
  const salleMonde = releaseDates(facts.releases, [2, 3])[0] || "";
  // Sorti au cinéma il y a plus d'un an : un vieux film, même ressorti ou annoncé à nouveau.
  if (salleMonde && salleMonde < ajoute(today, -365)) return null;
  // Chez soi : la première sortie numérique, vidéo ou télé, où que ce soit (les sources suivent),
  // sinon salle + 45 jours.
  const chezSoi = releaseDates(facts.releases, [4, 5, 6])[0] || (salleMonde ? ajoute(salleMonde, SALLE_JOURS) : "");
  if (chezSoi && chezSoi <= today) return chezSoi >= ajoute(today, -NOUVEAU_JOURS) ? "nouveau" : null;
  // Sorti seulement en festival (ou en avant-première), sans cinéma ni sortie chez soi : pas de statut.
  if (!salleMonde && !chezSoi) return null;
  // Pas encore chez soi : « En salle » s'il est au cinéma en France, sinon « Bientôt » (sorti ailleurs seulement).
  const salleFrance = releaseDates(facts.releases, [2, 3], ["FR"])[0] || "";
  return salleFrance && salleFrance <= today ? "salle" : "bientot";
}

function statutSerie(facts, today) {
  if (!facts.firstAir || facts.firstAir > today) return "bientot";
  if (facts.firstAir >= ajoute(today, -NOUVEAU_JOURS)) return "nouveau";
  const derniere = (facts.seasons || [])
    .filter((s) => s.season_number >= 2 && s.air_date && s.air_date <= today)
    .sort((a, b) => b.season_number - a.season_number)[0];
  if (derniere && derniere.air_date >= ajoute(today, -NOUVEAU_JOURS)) return "saison";
  return null;
}

/** "bientot" | "salle" | "nouveau" | "saison" | null, pour today au format AAAA-MM-JJ. */
export function statutDe(facts, today) {
  return facts.type === "series" ? statutSerie(facts, today) : statutFilm(facts, today);
}
