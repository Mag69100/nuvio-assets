/**
 * Statut d'un titre, affiché au-dessus de son rang de tendance : « Bientôt », « En salle », « Nouveau »,
 * « Nouvelle saison ». Mêmes règles de dates que l'addon (worker/index.js : releaseDates, firstDigital,
 * digitalGuess) : types TMDB 2 et 3 = salle, 4 = numérique ; sans date numérique, salle + 45 jours.
 */
const NOUVEAU_JOURS = 30, SALLE_JOURS = 45;

const ajoute = (iso, n) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);

function releaseDates(releases, types) {
  return (releases || [])
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
  const salle = releaseDates(facts.releases, [2, 3])[0] || "";
  const numerique = releaseDates(facts.releases, [4])[0] || (salle ? ajoute(salle, SALLE_JOURS) : "");
  if (numerique > today && salle && salle <= today) return "salle";
  if (numerique && numerique <= today && numerique >= ajoute(today, -NOUVEAU_JOURS)) return "nouveau";
  return null;
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
