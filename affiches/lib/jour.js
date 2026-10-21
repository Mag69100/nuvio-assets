/**
 * Le jour vu de Paris : « AUJOURD'HUI », « DEMAIN » et les statuts (« NOUVEAU »…) changent à minuit à Paris,
 * pas à minuit UTC (22 h ou 23 h à Paris). Heure d'été comprise : Intl connaît les règles du fuseau.
 */
const PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

/** Date et heure à Paris d'un instant : { y, m, d, h, mi, s } (mois de 1 à 12). */
function aParis(ms) {
  const p = Object.fromEntries(PARIS.formatToParts(new Date(ms)).map(({ type, value }) => [type, Number(value)]));
  return { y: p.year, m: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second };
}

/** Le jour à Paris (« 2026-10-21 ») d'un instant (maintenant par défaut). */
export function jourParis(now = Date.now()) {
  const { y, m, d } = aParis(now);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Écart de Paris avec UTC à un instant, en ms (une heure l'hiver, deux l'été). */
function decalage(ms) {
  const t = aParis(ms);
  return Date.UTC(t.y, t.m - 1, t.d, t.h, t.mi, t.s) - Math.floor(ms / 1000) * 1000;
}

/** Heure (ms) du prochain minuit à Paris. Les changements d'heure se font à 1 h UTC, jamais vers minuit. */
export function prochainMinuitParis(now = Date.now()) {
  const { y, m, d } = aParis(now), minuitUtc = Date.UTC(y, m - 1, d + 1);
  return minuitUtc - decalage(minuitUtc - 3 * 3600 * 1000);
}

/** Secondes jusqu'au prochain minuit à Paris (une minute au moins). */
export const secondesAvantMinuitParis = (now = Date.now()) => Math.max(60, Math.ceil((prochainMinuitParis(now) - now) / 1000));
