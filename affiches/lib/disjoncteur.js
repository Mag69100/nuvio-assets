/**
 * Disjoncteur des dessins : chaque lien valable et nouveau (options × titres × formes) fait dessiner une affiche,
 * de 0,25 à 0,8 s par réponse, dont 0,1 à 0,2 s de calcul compté (README), et l'offre gratuite de Vercel n'en donne
 * que 4 h par mois (dépassées : service coupé 30 jours). Au-delà d'un nombre de dessins par minute ou par heure sur une instance, on ne dessine plus : l'affiche
 * d'origine de TMDB, le temps que ça se calme. Compté par instance, contre les pointes ; le total du mois, toutes
 * instances comprises, est tenu par le budget de calcul (lib/budget.js).
 */

/**
 * Un compteur à fenêtres glissantes. fenetres : [[durée en ms, dessins au plus], …]. plein() : une fenêtre est
 * pleine ; compte() : un dessin de plus.
 */
export function creerDisjoncteur(fenetres, horloge = Date.now) {
  const plusLongue = Math.max(...fenetres.map(([ms]) => ms));
  const plafond = Math.max(...fenetres.map(([, max]) => max));
  let instants = [];   // heures des derniers dessins, dans l'ordre
  const nettoie = (now) => {
    const i = instants.findIndex((t) => t > now - plusLongue);
    instants = i < 0 ? [] : instants.slice(i);
  };
  return {
    plein() {
      const now = horloge();
      nettoie(now);
      return fenetres.some(([ms, max]) => instants.filter((t) => t > now - ms).length >= max);
    },
    compte() {
      instants.push(horloge());
      // Jamais plus que la plus grande limite en mémoire : au-delà, la fenêtre est pleine de toute façon.
      if (instants.length > plafond) instants = instants.slice(-plafond);
    },
  };
}

/**
 * Limites par défaut, réglables sur Vercel (RENDUS_MINUTE, RENDUS_HEURE) :
 * - 60 par minute : une personne qui ouvre l'appli avec des réglages à elle fait dessiner une rangée ou deux d'un
 *   coup (le reste vient du CDN), bien en dessous ; un robot qui essaie des liens au hasard est arrêté en une minute.
 * - 600 par heure : vers 300 personnes par jour, on compte 40 à 150 dessins par heure en moyenne (README), trois
 *   ou quatre fois plus le soir : une heure de pointe passe. 600 dessins, c'est 1 à 2 min de calcul : un abus
 *   continu use moins d'une heure par jour sur une instance, au lieu des 4 h du mois en quelques heures.
 */
export function disjoncteurDe(env = {}) {
  const lu = (v, defaut) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : defaut);
  return creerDisjoncteur([[60 * 1000, lu(env.RENDUS_MINUTE, 60)], [3600 * 1000, lu(env.RENDUS_HEURE, 600)]]);
}
