import { test } from "node:test";
import assert from "node:assert/strict";
import { creerBudget } from "../lib/budget.js";
import { makeHandler } from "../api/affiche.js";

// Un addon simulé : il additionne ce qu'on lui envoie et répond le total.
function addon({ panne = false, depart = 0 } = {}) {
  const envois = [];
  let total = depart;
  const fetchImpl = async (url, opts = {}) => {
    const u = new URL(String(url));
    if (u.pathname !== "/cpu") return new Response(JSON.stringify({}), { status: 404 });
    envois.push({ ms: Number(u.searchParams.get("ms")), cle: opts.headers && opts.headers["X-Relais-Cle"], methode: opts.method });
    if (panne) return new Response("{}", { status: 503 });
    total += Number(u.searchParams.get("ms"));
    return new Response(JSON.stringify({ ms: total, jours: 31 }));
  };
  return { envois, fetchImpl };
}

test("budget_envoie_le_cpu_une_fois_par_minute", async () => {
  const a = addon();
  let cpu = 1200, t = 1_000_000;
  const b = creerBudget({ env: { RELAIS_KEY: "cle" }, fetchImpl: a.fetchImpl, cpu: () => cpu, horloge: () => t });
  await b.noter();
  assert.deepEqual(a.envois, [{ ms: 1200, cle: "cle", methode: "POST" }]);
  cpu = 1500; t += 30000;
  await b.noter();   // moins d'une minute : rien
  assert.equal(a.envois.length, 1);
  t += 31000;
  await b.noter();   // seulement ce qui n'a pas encore été envoyé
  assert.deepEqual(a.envois.map((e) => e.ms), [1200, 300]);
});

test("budget_epuise_avec_le_total_de_toutes_les_instances", async () => {
  // Les autres instances ont déjà dépensé 139 min (budget : 140) ; celle-ci 30 s, puis 61 s.
  const a = addon({ depart: 139 * 60000 });
  let cpu = 30000;
  const b = creerBudget({ env: { RELAIS_KEY: "cle" }, fetchImpl: a.fetchImpl, cpu: () => cpu, horloge: () => 0 });
  assert.equal(b.epuise(), false);   // total encore inconnu : seulement le CPU de l'instance
  await b.noter();
  assert.equal(b.epuise(), false);
  cpu += 31000;                      // pas encore envoyé, mais compté
  assert.equal(b.epuise(), true);
});

test("budget_reglable", async () => {
  const b = creerBudget({ env: { CPU_BUDGET_MIN: "1" }, fetchImpl: addon().fetchImpl, cpu: () => 59000 });
  assert.equal(b.epuise(), false);
  const c = creerBudget({ env: { CPU_BUDGET_MIN: "1" }, fetchImpl: addon().fetchImpl, cpu: () => 60000 });
  assert.equal(c.epuise(), true);
  assert.equal(c.minutes, 1);
  assert.equal(creerBudget({ env: {} }).minutes, 140);
});

test("budget_sans_cle_ne_demande_rien", async () => {
  const a = addon();
  const b = creerBudget({ env: {}, fetchImpl: a.fetchImpl, cpu: () => 5000, horloge: () => 0 });
  await b.noter();
  assert.equal(a.envois.length, 0);
  assert.equal(b.epuise(), false);
});

test("budget_addon_en_panne_renvoie_plus_tard", async () => {
  const a = addon({ panne: true });
  let t = 0;
  const b = creerBudget({ env: { RELAIS_KEY: "cle" }, fetchImpl: a.fetchImpl, cpu: () => 4000, horloge: () => t });
  await b.noter();   // ne rejette pas
  t += 60000;
  await b.noter();
  // Rien n'a été compté : le même CPU repart.
  assert.deepEqual(a.envois.map((e) => e.ms), [4000, 4000]);
});

test("affiche_budget_epuise_sans_appeler_tmdb", async () => {
  // L'addon dit que le budget du mois est dépensé : dès la réponse lue, plus aucune fiche lue ni affiche dessinée.
  const appels = [];
  const fetchImpl = async (url) => {
    const u = String(url);
    appels.push(u);
    if (u.includes("/cpu?")) return new Response(JSON.stringify({ ms: 1e9, jours: 31 }));
    return new Response("{}", { status: 404 });
  };
  const h = makeHandler({ fetchImpl, env: { TMDB_API_KEY: "k", RELAIS_KEY: "cle" } });
  await h(new Request("https://affiches.test/api/affiche?type=movie&shape=poster&id=tt15239678"));
  appels.length = 0;
  const res = await h(new Request("https://affiches.test/api/affiche?type=movie&shape=poster&id=tt15239678"));
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(appels, []);
});
