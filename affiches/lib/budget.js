/**
 * Budget de calcul du service. L'offre Hobby de Vercel donne 4 h de CPU actif par mois pour tout le compte, et les
 * dépasser coupe le compte 30 jours. Mesuré le 2026-10-22 (en-tête X-Affiche-Cpu) : environ 0,23 s par dessin et
 * 0,8 s au démarrage d'une instance.
 * L'instance compte son CPU (process.cpuUsage : tout ce qu'elle calcule, démarrage compris) et l'envoie à l'addon
 * une fois par minute au plus (worker/cpu.js). L'addon répond le total des 31 derniers jours, toutes instances
 * comprises. Passé le budget, on ne dessine plus : seules les affiches déjà dans la réserve (lib/reserve.js) sont
 * servies, les autres laissent l'appli montrer l'affiche d'origine. 20 minutes plus loin, on s'arrête tout à fait,
 * avant même de lire TMDB (lire une fiche coûte aussi).
 * CPU_BUDGET_MIN (minutes, 140 par défaut, plus ces 20) : le reste des 4 h va aux autres fonctions et aux autres
 * projets du compte, et à ce qui a été dépensé avant que le compteur existe.
 * Sans RELAIS_KEY, ou addon injoignable : le dernier total connu plus ce que l'instance n'a pas encore envoyé. Ça
 * protège moins, mais ça ne bloque jamais à tort.
 */
import { ADDON_URL } from "./tendances.js";

const INTERVALLE_MS = 60000, DELAI_MS = 1000, MARGE_MS = 20 * 60000;
const cpuProcessus = () => { const c = process.cpuUsage(); return (c.user + c.system) / 1000; };

export function creerBudget({ env = process.env, fetchImpl = fetch, cpu = cpuProcessus, horloge = Date.now } = {}) {
  const lu = (v, defaut) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : defaut);
  const budgetMs = lu(env.CPU_BUDGET_MIN, 140) * 60000;
  // envoye : le CPU de l'instance déjà compté chez l'addon ; total : le dernier total des 31 jours lu chez lui.
  let envoye = 0, total = 0, dernier = -Infinity, enCours = null;

  async function envoyer() {
    const ms = Math.floor(cpu() - envoye);
    try {
      const res = await fetchImpl(`${env.ADDON_URL || ADDON_URL}/cpu?ms=${ms}`, {
        method: "POST", headers: { "X-Relais-Cle": env.RELAIS_KEY }, signal: AbortSignal.timeout(DELAI_MS) });
      if (!res.ok) throw new Error(`addon ${res.status}`);
      const corps = await res.json();
      if (!Number.isFinite(corps.ms)) throw new Error("réponse illisible");
      envoye += ms;
      total = corps.ms;
    } catch (e) {
      // Rien de compté : ce CPU part avec le prochain envoi.
      console.warn(`compteur de calcul : ${e && e.message}`);
    }
  }

  return {
    /** Le budget lu (minutes), pour l'en-tête X-Affiche-Cpu : de quoi vérifier le réglage de Vercel. */
    minutes: budgetMs / 60000,
    /** Le budget des 31 jours est dépensé : plus de dessin. */
    epuise: () => total + (cpu() - envoye) >= budgetMs,
    /** La marge aussi : plus rien du tout. */
    arret: () => total + (cpu() - envoye) >= budgetMs + MARGE_MS,
    /** Envoie le CPU de l'instance si la dernière fois date d'une minute ; ne rejette jamais. */
    noter() {
      if (!env.RELAIS_KEY || enCours || horloge() - dernier < INTERVALLE_MS) return enCours || Promise.resolve();
      dernier = horloge();
      enCours = envoyer().finally(() => { enCours = null; });
      return enCours;
    },
  };
}
