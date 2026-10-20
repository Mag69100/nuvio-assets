/**
 * Page de personnalisation (salle 2, servie sur /configure ; le guide, salle 1, est sur /guide ; le hall à la racine).
 * Tout se passe dans le navigateur : la page fabrique l'adresse personnalisée
 * de l'addon et des collections, rien n'est envoyé ni stocké.
 *
 * Direction visuelle : une salle de cinéma. Titre en enseigne lumineuse, réglages
 * en « bobine » (pellicule perforée), aperçu en direct de l'accueil sur un écran
 * de TV, et le lien remis sous forme de billet d'entrée à détacher.
 */

const ROW_HINTS = {
  "accueil-saison": "Change toute seule : Halloween, Noël, Saint-Valentin, Pâques, été, sinon les films à l'affiche",
  "accueil-top10": "Les films dont tout le monde parle aujourd'hui, dans l'ordre du classement",
  "accueil-tendances-series": "Les séries dont tout le monde parle aujourd'hui, dans l'ordre du classement",
  "accueil-nouveautes-plateformes": "Arrivés depuis 3 mois sur les plateformes que tu choisis plus bas",
  "accueil-series-a-devorer": "Séries notées 8/10 et plus",
  "accueil-mini-series": "Une seule saison, idéal pour un week-end",
  "accueil-pepites": "Très bien notés mais peu connus, nouvelle sélection chaque jour",
  "accueil-cinema-francais": "Les films français des deux dernières années",
  "accueil-films-cultes": "Les classiques que tout le monde a vus (ou devrait)",
  "accueil-anime": "L'animation japonaise du moment",
  "accueil-famille": "Films familiaux, sans horreur",
  "accueil-documentaires": "Documentaires bien notés",
  "accueil-vod-semaine": "Films sortis en numérique ces deux dernières semaines : regardables maintenant",
  "accueil-vod-bientot": "Films qui deviennent regardables dans les six prochaines semaines, avec la date",
  "accueil-attendus": "Les films pas encore sortis dont tout le monde parle, avec leur date au cinéma",
};


/** Couleur d'accent de chaque plateforme (pastille et tuile de l'aperçu). */
const PROVIDER_COLORS = {
  8: "#e50914", 119: "#1a98ff", 337: "#1b3f9c", 531: "#0064ff",
  1899: "#7b2cff", 350: "#d9d9de", 381: "#111111", 283: "#f47521",
};

import { STAGE_HEAD, stageTop, secretsHTML, BEAM_HTML, SEATS_HTML, CREDITS_HTML } from "./stage.js";
import { nuvioDonnees } from "./nuvio.js";
import { feuilles, scripts } from "./statique.js";

// Espace hébergeur d'une copie auto-hébergée (absent de l'instance principale) : connexion avec le mot de
// passe ADMIN_PASSWORD, lien avec alertes (rangée « Mise à jour » dans Nuvio), bannière de mise à jour.
const HOTE_HTML = `
      <section class="act" id="s-hote">
        <header><span>Cabine</span><h2>Espace hébergeur</h2></header>
        <p class="sub">Tu héberges ta propre copie du Catalogue FR. Connecte-toi avec ton mot de passe (le secret ADMIN_PASSWORD de ta copie) pour voir les nouvelles versions et recevoir les alertes dans Nuvio.</p>
        <div id="hote-box" class="hote-box"></div>
      </section>`;
const HOTE_JS = `
// ---------- espace hébergeur ----------
let hote = null;
function hoteCall(path, body) {
  return fetch(D.origin + path, body === undefined ? { credentials: "same-origin" }
    : { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
async function hoteRefresh() {
  try { hote = await (await hoteCall("/hote/etat")).json(); } catch (e) { hote = { hote: false }; }
  hoteRender();
}
function hoteRender() {
  const box = $("hote-box"); box.textContent = "";
  if (hote && hote.motDePasseFaible) {
    box.append(el("p", { class: "alerte", role: "alert", text: "Le mot de passe d'hébergeur de ta copie est trop simple : 10 caractères au moins, et pas celui de l'exemple. Change ADMIN_PASSWORD (Docker : dans docker-compose.yml ; Cloudflare : dans les paramètres de ton Worker), redémarre ou redéploie, puis recharge cette page." }));
    return;
  }
  if (hote && hote.motDePasse === false) {
    box.append(el("p", { class: "alerte", role: "alert", text: "Ta copie n'a pas encore de mot de passe d'hébergeur. Ajoute ADMIN_PASSWORD (Docker : dans docker-compose.yml, rubrique environment ; Cloudflare : un secret dans les paramètres de ton Worker), redémarre ou redéploie, puis recharge cette page." }));
    return;
  }
  if (!hote || !hote.hote) {
    const pw = el("input", { type: "password", id: "hote-mdp", autocomplete: "current-password", placeholder: "Mot de passe", "aria-label": "Mot de passe de l'hébergeur" });
    const msg = el("p", { class: "alerte", role: "alert" });
    const go = async () => {
      const r = await hoteCall("/hote/connexion", { motDePasse: pw.value }).catch(() => null);
      if (r && r.ok) hoteRefresh();
      else msg.textContent = !r ? "Pas de réponse de ta copie : vérifie ta connexion et réessaie."
        : r.status === 429 ? "Trop d'essais : réessaie dans un quart d'heure."
        : (await r.json().catch(() => ({}))).error || "Mot de passe incorrect.";
    };
    pw.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
    box.append(el("div", { class: "hote-ligne" }, pw, el("button", { type: "button", class: "hote-btn", text: "Se connecter", onclick: go })), msg);
    return;
  }
  const alertes = el("input", { type: "checkbox", id: "hote-alertes" });
  alertes.checked = state.al === hote.jeton;
  alertes.addEventListener("change", () => { state.al = alertes.checked ? hote.jeton : ""; update(); });
  box.append(el("label", { class: "switch" }, alertes, el("span", {},
    el("b", { text: "Alertes de mise à jour dans Nuvio" }),
    el("small", { text: "Ajoute à ton lien une rangée « Mise à jour », en tête de l'accueil, visible seulement quand une nouvelle version est sortie. Réinstalle ton lien après l'avoir coché, et ne coche pas pour les liens que tu donnes aux autres." }))));
  box.append(hote.maj ? hoteBanner(hote.maj)
    : hote.verification === "impossible"
      ? el("p", { class: "alerte", role: "alert", text: "Impossible de vérifier les mises à jour pour l'instant (GitHub ne répond pas). Réessaie plus tard." })
      : el("p", { class: "sub", text: "Ta copie est à jour (ou tu as repoussé la dernière version)." }));
  box.append(el("button", { type: "button", class: "hote-btn line", text: "Se déconnecter", onclick: async () => { await hoteCall("/hote/deconnexion", {}); hoteRefresh(); } }));
}
function hoteBanner(maj) {
  const b = el("div", { class: "hote-maj", role: "status" }, el("b", { text: "Version " + maj.version + " disponible" }));
  if (maj.notes.length) b.append(el("ul", {}, maj.notes.map((n) => el("li", { text: n }))));
  b.append(el("a", { href: maj.history, target: "_blank", rel: "noopener", text: "Tout l'historique des changements" }));
  const how = el("div", { class: "hote-how", hidden: "" });
  if (hote.installation === "docker") {
    how.append(el("p", { text: "Sur ton serveur, dans le dossier de ta copie, lance :" }), el("code", { text: "docker compose pull && docker compose up -d" }));
  } else {
    how.append(el("p", { text: "Sur GitHub, ouvre ta copie du dépôt et clique sur « Sync fork », puis « Update branch » : Cloudflare redéploie ta copie tout seul, en une minute environ." }));
    if (hote.depot) how.append(el("a", { href: "https://github.com/" + hote.depot, target: "_blank", rel: "noopener", text: "Ouvrir github.com/" + hote.depot }));
  }
  b.append(el("div", { class: "hote-ligne" },
    el("button", { type: "button", class: "hote-btn", text: "Mettre à jour", onclick: () => { how.hidden = false; } }),
    el("button", { type: "button", class: "hote-btn line", text: "Plus tard", onclick: async () => { await hoteCall("/hote/plus-tard", { palier: maj.version.split(".").slice(0, 2).join(".") }); hote.maj = null; hoteRender(); } })), how);
  return b;
}
hoteRefresh();
`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function configurePage({ origin, cfg, rows, discover, providers, collections, defaults, regions, genres, languages, sorts, seasons, maxCustom, season, copy = false }) {
  const plain = (c) => ({ n: c.n, r: c.r, p: c.p, d: c.d, c: c.c, o: c.o, x: c.x, g: c.g, e: c.e, m: c.m, a: c.a, f: c.f, h: c.h, t: c.t, u: c.u, k: c.k, al: c.al });
  const data = {
    origin, maxCustom,
    cfg: plain(cfg),
    defaults: plain(defaults),
    rows: rows.map((d) => ({
      id: d.id,
      name: d.id === "accueil-saison" ? "Spécial saison" : d.name,
      now: d.id === "accueil-saison" ? d.name : "",
      kind: d.mix ? "Films + séries" : d.type === "series" ? "Séries" : "Films",
      type: d.type,
      hint: ROW_HINTS[d.id] || "",
    })),
    discover: discover.map((d) => ({ id: d.id, name: d.name, type: d.type })),
    providers: providers.map((p) => ({ id: p.id, name: p.name, tile: Boolean(p.folder), color: PROVIDER_COLORS[p.id] || "#888" })),
    collections, regions, genres, languages, sorts, seasons,
  };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const LOGO = origin + "/logo.png";

  return `<!doctype html>
<html lang="fr" data-saison="${esc(season || "")}">
<head>
<meta charset="utf-8">
${STAGE_HEAD}
<script>try{if(window.parent!==window&&parent.location.origin===location.origin)document.documentElement.classList.add("dans-guide")}catch(e){}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(cfg.n)} · Ta programmation</title>
<meta name="description" content="Compose ton accueil Nuvio en français : rangées, plateformes, collections, filtres.">
<meta property="og:title" content="Compose ta programmation Nuvio">
<meta property="og:image" content="${LOGO}">
<link rel="icon" href="${LOGO}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@400;500;700;800&family=Inter:wght@400;500;600;700;800&family=Courier+Prime:wght@400;700&family=Instrument+Serif:ital@0;1&family=Limelight&family=Pacifico&family=Orbitron:wght@500;700&display=swap">
<style>
/* Salle obscure : enseigne en haut, la bobine de réglages à gauche, l'écran et le billet à droite. */
:root {
  --velvet: #170c12;      /* fond : velours sombre */
  --velvet-2: #22121b;    /* panneaux */
  --velvet-3: #2f1925;    /* survols, cases */
  --seat: #3d2230;        /* traits */
  --cream: #f5ead8;       /* texte, papier du billet */
  --dim: #b9a59c;         /* texte secondaire */
  --bulb: #ffcf6b;        /* ampoules de l'enseigne */
  --red: #e5413a;         /* rideau, accent principal */
  --ink: #2a1a14;         /* encre du billet */
  --display: "Bebas Neue", Impact, "Arial Narrow", sans-serif;
  --body: "Figtree", "Segoe UI", system-ui, sans-serif;
  --type: "Courier Prime", "Courier New", ui-monospace, monospace;
  color-scheme: dark;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html, body { margin: 0; }
html { overflow-x: clip; }
body {
  background:
    radial-gradient(ellipse 80% 40% at 50% -5%, rgba(229,65,58,.22), transparent 70%),
    repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 2px, transparent 2px 46px),
    var(--velvet);
  color: var(--cream); font: 16px/1.55 var(--body);
  padding-top: max(28px, env(safe-area-inset-top));
  padding-bottom: calc(96px + env(safe-area-inset-bottom));
  padding-left: max(16px, env(safe-area-inset-left)); padding-right: max(16px, env(safe-area-inset-right));
}
a { color: var(--bulb); }
button { font-family: inherit; }
:focus-visible { outline: 3px solid var(--bulb); outline-offset: 3px; border-radius: 6px; }

/* ---------- Enseigne ---------- */
.marquee-wrap { position: relative; max-width: 1180px; margin: 0 auto 36px; display: grid; justify-items: center; gap: 14px; text-align: center; }
.marquee-wrap p { margin: 0; max-width: 58ch; color: var(--dim); }
.marquee-wrap p b { color: var(--cream); }

/* ---------- Mise en page ---------- */
.layout { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 36px; align-items: start; }
main { display: grid; gap: 22px; min-width: 0; }
.act { background: var(--velvet-2); border: 1px solid var(--seat); border-radius: 16px; padding: 22px; display: grid; gap: 14px; min-width: 0; }
.act header { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.act h2 { margin: 0; font: 400 2rem/1 var(--display); letter-spacing: .03em; }
.act header span { font: 700 .74rem var(--body); letter-spacing: .22em; text-transform: uppercase; color: var(--red); }
.act .sub { margin: -6px 0 0; color: var(--dim); font-size: .94rem; max-width: 62ch; }

input[type=text] {
  width: 100%; font: 400 1.7rem/1.1 var(--display); letter-spacing: .04em; padding: 12px 14px;
  color: #fff6e6; background: var(--velvet); border: 1px dashed var(--seat); border-radius: 10px;
}

/* La bobine : chaque rangée est une image de pellicule perforée. */
.reel { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.frame {
  --perf: radial-gradient(circle at 50% 50%, var(--velvet) 3px, transparent 3.5px) 0 4px / 14px 14px repeat-y;
  position: relative; display: grid; grid-template-columns: 26px auto minmax(0, 1fr) auto; gap: 12px; align-items: center;
  padding: 10px 12px 10px 0; border-radius: 6px; background: #0f080c; border: 1px solid #000;
  transition: transform .18s ease, background .18s ease;
}
.frame::before { content: ""; align-self: stretch; background: var(--perf), #24131c; border-radius: 6px 0 0 6px; margin: -10px 0; }
.frame.on { background: linear-gradient(90deg, #3a1a24, #26131c); border-color: #5a2e3c; }
.frame.flash { transform: translateX(6px); }
.frame .pos { font: 400 1.6rem/1 var(--display); color: var(--seat); min-width: 1.6ch; text-align: right; }
.frame.on .pos { color: var(--bulb); }
.frame label { cursor: pointer; min-width: 0; }
.frame b { font-weight: 800; }
.frame .kind { margin-left: 8px; font: 700 .68rem var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--dim); white-space: nowrap; }
.frame small { display: block; color: var(--dim); font-size: .85rem; line-height: 1.35; }
.frame:not(.on) b, .frame:not(.on) small { opacity: .55; }
.frame input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.tools { display: flex; gap: 4px; align-items: center; }
.toggle { font: 800 .72rem var(--body); letter-spacing: .1em; text-transform: uppercase; border-radius: 99px; padding: 6px 10px; border: 1px solid var(--seat); background: transparent; color: var(--dim); cursor: pointer; white-space: nowrap; }
.frame.on .toggle { background: var(--red); border-color: var(--red); color: #fff; }
.arrow { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--seat); background: transparent; color: var(--cream); cursor: pointer; font-size: .95rem; }
.arrow:disabled { opacity: .25; cursor: default; }
.frame:focus-within { outline: 2px solid var(--bulb); outline-offset: 2px; }

/* Pastilles (plateformes, Découvrir, collections) */
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { position: relative; }
.chip input { position: absolute; inset: 0; opacity: 0; cursor: pointer; margin: 0; }
.chip span {
  display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 99px;
  border: 1px solid var(--seat); background: var(--velvet); color: var(--dim); font-weight: 700; font-size: .92rem;
  transition: background .15s ease, color .15s ease, border-color .15s ease;
}
.chip i { width: 10px; height: 10px; border-radius: 50%; background: var(--c, var(--dim)); box-shadow: 0 0 0 2px rgba(255,255,255,.08); }
.chip input:checked + span { background: var(--cream); border-color: var(--cream); color: var(--ink); }
.chip input:focus-visible + span { outline: 3px solid var(--bulb); outline-offset: 2px; }
.group { display: grid; gap: 8px; }
.group h3 { margin: 0; font: 700 .72rem var(--body); letter-spacing: .22em; text-transform: uppercase; color: var(--dim); }
.warn { margin: 0; color: var(--bulb); font-weight: 700; font-size: .9rem; }
.reset { justify-self: start; background: none; border: 0; padding: 0; color: var(--dim); text-decoration: underline; text-underline-offset: 4px; cursor: pointer; font-size: .92rem; }

/* ---------- L'écran : aperçu de l'accueil ---------- */
.steps-howto { margin: 0; padding: 0; list-style: none; counter-reset: st; display: grid; gap: 12px; }
.steps-howto li { counter-increment: st; display: grid; grid-template-columns: 44px 1fr; gap: 12px; align-items: start; color: #d9c8be; }
.steps-howto li::before { content: counter(st); font: 400 2.2rem/1 var(--display); color: var(--bulb); text-align: center; border: 1px dashed rgba(255,207,107,.4); border-radius: 10px; padding: 6px 0 2px; }
.steps-howto b { color: var(--cream); }
aside { position: sticky; top: 18px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 22px; min-width: 0; }
/* Trop haut pour la fenêtre : la colonne prend toute la hauteur, l'écran reste collé en haut (en entier)
   et le billet arrive en bas, à la fin du défilement. */
aside.long { position: relative; top: auto; align-self: stretch; grid-template-rows: minmax(0, 1fr) auto auto; }
aside.long .stage:not(.big) { position: sticky; top: var(--stage-top, 18px); }

/* ---------- Le billet ---------- */
.ticket { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 74px; color: var(--ink); filter: drop-shadow(0 16px 30px rgba(0,0,0,.5)); }
.ticket .main, .ticket .stub {
  background: var(--cream);
  background-image: repeating-linear-gradient(0deg, rgba(42,26,20,.035) 0 1px, transparent 1px 4px);
}
.ticket .main { border-radius: 12px 0 0 12px; padding: 18px 18px 16px; display: grid; gap: 10px; min-width: 0;
  -webkit-mask: radial-gradient(circle 11px at 100% 0, transparent 98%, #000) top / 100% 51% no-repeat, radial-gradient(circle 11px at 100% 100%, transparent 98%, #000) bottom / 100% 51% no-repeat;
          mask: radial-gradient(circle 11px at 100% 0, transparent 98%, #000) top / 100% 51% no-repeat, radial-gradient(circle 11px at 100% 100%, transparent 98%, #000) bottom / 100% 51% no-repeat; }
.ticket .stub { border-radius: 0 12px 12px 0; border-left: 2px dashed rgba(42,26,20,.35); display: grid; place-items: center;
  -webkit-mask: radial-gradient(circle 11px at 0 0, transparent 98%, #000) top / 100% 51% no-repeat, radial-gradient(circle 11px at 0 100%, transparent 98%, #000) bottom / 100% 51% no-repeat;
          mask: radial-gradient(circle 11px at 0 0, transparent 98%, #000) top / 100% 51% no-repeat, radial-gradient(circle 11px at 0 100%, transparent 98%, #000) bottom / 100% 51% no-repeat; }
.stub span { writing-mode: vertical-rl; transform: rotate(180deg); font: 400 1.25rem/1 var(--display); letter-spacing: .12em; color: var(--red); white-space: nowrap; }
.t-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; border-bottom: 2px solid var(--ink); padding-bottom: 6px; }
.t-head b { font: 400 1.7rem/1 var(--display); letter-spacing: .04em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.t-head span { font: 700 .78rem var(--type); white-space: nowrap; }
.t-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; font: 400 .8rem var(--type); }
.t-meta b { font-weight: 700; }
.t-label { font: 700 .7rem var(--body); letter-spacing: .2em; text-transform: uppercase; color: #7a5a4c; }
.t-url { font: 400 .76rem/1.45 var(--type); word-break: break-all; user-select: all; background: rgba(42,26,20,.07); border-radius: 6px; padding: 8px 10px; max-height: 6.2em; overflow: auto; }
.t-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.btn { font: 800 .9rem var(--body); border-radius: 8px; padding: 11px 10px; cursor: pointer; text-align: center; text-decoration: none; border: 2px solid var(--ink); }
.btn.solid { background: var(--ink); color: var(--cream); }
.btn.solid:hover { background: var(--red); border-color: var(--red); }
.btn.line { background: transparent; color: var(--ink); }
.btn.full { grid-column: 1 / -1; }

.howto { background: var(--velvet-2); border: 1px solid var(--seat); border-radius: 16px; padding: 16px 18px; font-size: .9rem; color: var(--dim); display: grid; gap: 8px; }
.howto b { color: var(--cream); }
.howto ol { margin: 0; padding-left: 1.2em; display: grid; gap: 3px; }

/* Barre du bas sur téléphone */
.dock { display: none; }
@media (max-width: 960px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
  aside { position: static; order: -1; }
  .tv { max-width: 520px; width: 100%; justify-self: center; }
  .dock { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; gap: 10px; align-items: center;
    padding: 12px max(16px, env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
    background: rgba(23,12,18,.94); backdrop-filter: blur(8px); border-top: 1px solid var(--seat); }
  .dock { transition: transform .25s cubic-bezier(.22,1,.36,1); }
  .dock.cache { transform: translateY(110%); }
  .dock-billet { flex: 1; min-width: 0; min-height: 44px; padding: 0; border: 0; background: none; text-align: left; cursor: pointer; font: 400 .85rem/1.35 var(--body); color: var(--dim); }
  .dock-billet b { color: var(--cream); }
  .dock-billet i { font-style: normal; color: var(--bulb); margin-left: 4px; }
  .dock .btn { border-color: var(--cream); background: var(--cream); color: var(--ink); flex: none; min-height: 46px; }
  /* Clavier ouvert : la barre du bas cacherait le champ qu'on remplit. */
  body:has(:is(input[type=text], input[type=password], input[type=number], input[type=search], select):focus) .dock { display: none; }
}
@media (max-width: 520px) {
  .frame { grid-template-columns: 22px auto minmax(0, 1fr); }
  .tools { grid-column: 2 / -1; }
  .ticket { grid-template-columns: minmax(0, 1fr) 54px; }
  .act { padding: 18px 16px; }
  .act h2 { font-size: 1.75rem; }
  .t-btns { grid-template-columns: minmax(0, 1fr); }
  .t-btns .btn { min-height: 48px; }
}
@media (prefers-reduced-motion: reduce) { *, *::before { animation: none !important; transition: none !important; } }

/* ---------- Ajouts : réglages avancés ---------- */
/* Sommaire : une bande de pellicule flottante, la section en cours s'allume. */
.nav { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 12px); z-index: 15; justify-self: start; max-width: 100%;
  display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none; padding: 9px 10px;
  border-radius: 14px; border: 1px solid rgba(255,207,107,.22);
  background:
    radial-gradient(circle, rgba(0,0,0,.55) 2px, transparent 2.5px) 6px 2px / 12px 6px repeat-x,
    radial-gradient(circle, rgba(0,0,0,.55) 2px, transparent 2.5px) 6px calc(100% - 2px) / 12px 6px repeat-x,
    rgba(28,14,21,.82);
  -webkit-backdrop-filter: blur(10px) saturate(1.3); backdrop-filter: blur(10px) saturate(1.3);
  box-shadow: 0 10px 30px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.03); }
.nav::-webkit-scrollbar { display: none; }
.nav a { flex: none; text-decoration: none; color: var(--dim); font: 700 .8rem var(--body); letter-spacing: .02em; padding: 7px 10px; border-radius: 9px; transition: background .2s ease, color .2s ease; }
.nav a:hover { color: var(--cream); background: rgba(255,255,255,.05); }
.nav a.on { background: var(--bulb); color: var(--ink); box-shadow: 0 0 14px rgba(255,207,107,.45); }
.frame .orig { font-style: normal; color: var(--bulb); font-size: .78rem; margin-left: 6px; }
.frame .rename { display: none; gap: 6px; margin-top: 6px; }
.frame.editing .rename { display: flex; }
.rename input { flex: 1; min-width: 0; font: 600 .95rem var(--body); padding: 7px 10px; border-radius: 8px; border: 1px solid var(--bulb); background: var(--velvet); color: var(--cream); }
.mini { font: 700 .78rem var(--body); border-radius: 8px; padding: 6px 10px; border: 1px solid var(--seat); background: transparent; color: var(--cream); cursor: pointer; white-space: nowrap; }
.mini.ok { background: var(--bulb); border-color: var(--bulb); color: var(--ink); }
.mini.del { color: #ff9c95; }
.icon { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--seat); background: transparent; color: var(--cream); cursor: pointer; font-size: .9rem; }
.badge { display: inline-block; margin-left: 8px; font: 800 .62rem var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--ink); background: var(--bulb); border-radius: 4px; padding: 2px 5px; vertical-align: 2px; }
.add-row { justify-self: start; font: 800 .95rem var(--body); padding: 12px 18px; border-radius: 10px; border: 1px dashed var(--bulb); background: rgba(255,207,107,.06); color: var(--bulb); cursor: pointer; }
.add-row:disabled { opacity: .4; cursor: default; }

.builder { border: 1px solid var(--bulb); border-radius: 14px; padding: 18px; display: grid; gap: 16px; background: linear-gradient(180deg, #2a1720, #1d0f16); }
.builder h3 { margin: 0; font: 400 1.6rem/1 var(--display); letter-spacing: .03em; color: var(--bulb); }
.field { display: grid; gap: 8px; }
.ai-key { display: flex; gap: 8px; }
.ai-key input { flex: 1; min-width: 0; }
.ai-key button { flex: none; padding: 0 12px; border-radius: 8px; border: 1px solid var(--seat); background: var(--velvet); color: var(--cream); cursor: pointer; }
#ai-key-hint { color: var(--dim); min-height: 1.2em; }
#ai-key-hint.alerte { color: #ffe1d8; min-height: 0; }
/* Clé masquée sans champ « mot de passe » (Chrome proposerait de l'enregistrer). */
#ai-key.masque { -webkit-text-security: disc; text-security: disc; }
/* Espace hébergeur (copies auto-hébergées seulement). */
.hote-box { display: grid; gap: 12px; }
.hote-ligne { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.hote-ligne input { flex: 1; min-width: 0; font: 600 1rem var(--body); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--seat); background: var(--velvet); color: var(--cream); }
.hote-btn { padding: 10px 14px; border-radius: 8px; border: 1px solid var(--cream); background: var(--cream); color: var(--ink); font: 700 .9rem var(--body); cursor: pointer; }
.hote-btn.line { background: transparent; color: var(--cream); justify-self: start; }
.hote-maj { border: 1px solid var(--red); border-radius: 12px; padding: 14px 16px; display: grid; gap: 10px; background: var(--velvet-2); }
.hote-maj ul { margin: 0; padding-left: 1.2em; color: var(--dim); }
.hote-maj a { color: var(--cream); }
.hote-how { display: grid; gap: 8px; color: var(--dim); }
.hote-how p { margin: 0; }
.hote-how code { display: block; padding: 8px 10px; border-radius: 6px; background: var(--velvet); color: var(--cream); user-select: all; overflow-wrap: anywhere; }
.field > span { font: 700 .72rem var(--body); letter-spacing: .2em; text-transform: uppercase; color: var(--dim); }
.field input:is([type=text], [type=password]).plain, select, input[type=number] { font: 600 1rem var(--body); letter-spacing: 0; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--seat); background: var(--velvet); color: var(--cream); }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.seg { display: inline-flex; flex-wrap: wrap; gap: 0; border: 1px solid var(--seat); border-radius: 10px; overflow: hidden; justify-self: start; }
.seg button { font: 700 .88rem var(--body); padding: 9px 14px; border: 0; background: var(--velvet); color: var(--dim); cursor: pointer; border-right: 1px solid var(--seat); }
.seg button:last-child { border-right: 0; }
.seg button[aria-pressed="true"] { background: var(--cream); color: var(--ink); }
/* Listes déroulantes : flèche dorée ; le menu ouvert prend les couleurs de la salle
   dans les navigateurs qui savent le personnaliser (sinon, menu du système). */
select { cursor: pointer; appearance: none; padding-right: 38px; transition: border-color .2s ease;
  background: var(--velvet) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23ffcf6b' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") right 14px center / 12px 8px no-repeat; }
select:hover { border-color: rgba(255,207,107,.5); }
@supports (appearance: base-select) {
  select, ::picker(select) { appearance: base-select; }
  select { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-right: 14px; background-image: none; }
  select::picker-icon { content: ""; width: 7px; height: 7px; border-right: 2px solid var(--bulb); border-bottom: 2px solid var(--bulb); transform: translateY(-2px) rotate(45deg); transition: transform .25s ease; }
  select:open { border-color: var(--bulb); }
  select:open::picker-icon { transform: translateY(2px) rotate(225deg); }
  ::picker(select) { margin-top: 6px; padding: 6px; max-height: 320px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--seat) transparent;
    border: 1px solid rgba(255,207,107,.35); border-radius: 12px; background: #1d0f16; color: var(--cream); box-shadow: 0 18px 44px rgba(0,0,0,.65), 0 0 0 1px rgba(0,0,0,.4);
    opacity: 0; transform: translateY(-6px); transition: opacity .18s ease, transform .18s ease, overlay .18s allow-discrete, display .18s allow-discrete; }
  ::picker(select):popover-open { opacity: 1; transform: none; }
  @starting-style { ::picker(select):popover-open { opacity: 0; transform: translateY(-6px); } }
  select option { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font: 600 .95rem var(--body); color: var(--cream); background: transparent; cursor: pointer; }
  select option:hover, select option:focus-visible { background: rgba(255,207,107,.12); color: #fff; outline: none; }
  select option:checked { background: var(--bulb); color: var(--ink); font-weight: 800; }
  select option::checkmark { content: "✓"; order: 1; margin-left: auto; }
}

/* Curseurs de note : un sillon sombre, la part choisie en or, une graduation par point,
   et une ampoule qu'on fait glisser (éteinte tant qu'il n'y a pas de note minimale). */
.range { display: flex; align-items: center; gap: 14px; }
.range input[type=range] { --p: 0%; --steps: 8; flex: 1; min-width: 0; height: 30px; margin: 0; background: transparent; cursor: pointer; -webkit-appearance: none; appearance: none; }
.range input[type=range]:focus-visible { outline: none; }
.range input[type=range]::-webkit-slider-runnable-track { height: 8px; border-radius: 4px;
  background: linear-gradient(90deg, #a8742a, var(--bulb)) 0 0 / var(--p) 100% no-repeat, repeating-linear-gradient(90deg, rgba(255,255,255,.16) 0 1px, transparent 1px calc(100% / var(--steps))), #0f080c;
  box-shadow: inset 0 1px 2px rgba(0,0,0,.6), 0 0 0 1px var(--seat); }
.range input[type=range]::-moz-range-track { height: 8px; border-radius: 4px; background: repeating-linear-gradient(90deg, rgba(255,255,255,.16) 0 1px, transparent 1px calc(100% / var(--steps))), #0f080c; box-shadow: inset 0 1px 2px rgba(0,0,0,.6), 0 0 0 1px var(--seat); }
.range input[type=range]::-moz-range-progress { height: 8px; border-radius: 4px; background: linear-gradient(90deg, #a8742a, var(--bulb)); }
.range input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; margin-top: -7px; border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #fff8e1, var(--bulb) 55%, #c98b2e); box-shadow: 0 0 0 3px #1b0d14, 0 0 16px rgba(255,207,107,.85); transition: transform .15s ease, box-shadow .15s ease; }
.range input[type=range]::-moz-range-thumb { width: 22px; height: 22px; border: 0; border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #fff8e1, var(--bulb) 55%, #c98b2e); box-shadow: 0 0 0 3px #1b0d14, 0 0 16px rgba(255,207,107,.85); transition: transform .15s ease, box-shadow .15s ease; }
.range input[type=range]:hover::-webkit-slider-thumb, .range input[type=range]:active::-webkit-slider-thumb { transform: scale(1.15); }
.range input[type=range]:hover::-moz-range-thumb, .range input[type=range]:active::-moz-range-thumb { transform: scale(1.15); }
.range input[type=range]:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px #1b0d14, 0 0 0 6px var(--bulb), 0 0 16px rgba(255,207,107,.85); }
.range input[type=range]:focus-visible::-moz-range-thumb { box-shadow: 0 0 0 3px #1b0d14, 0 0 0 6px var(--bulb), 0 0 16px rgba(255,207,107,.85); }
.range input[type=range].zero::-webkit-slider-thumb { background: radial-gradient(circle at 40% 35%, #8a6a4c, #4e3420 60%, #2e1c12); box-shadow: 0 0 0 3px #1b0d14, inset 0 0 3px rgba(0,0,0,.6); }
.range input[type=range].zero::-moz-range-thumb { background: radial-gradient(circle at 40% 35%, #8a6a4c, #4e3420 60%, #2e1c12); box-shadow: 0 0 0 3px #1b0d14, inset 0 0 3px rgba(0,0,0,.6); }
.range input[type=range].zero + output { color: var(--dim); }
.range output { font: 400 1.5rem/1 var(--display); color: var(--bulb); min-width: 3.4ch; text-align: right; }
.summary { margin: 0; padding: 12px 14px; border-radius: 10px; background: rgba(0,0,0,.25); font: 400 .9rem/1.45 var(--type); color: var(--cream); }
.b-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.b-actions .mini { padding: 10px 16px; font-size: .9rem; }

.chips.danger .chip input:checked + span { background: var(--red); border-color: var(--red); color: #fff; text-decoration: line-through; text-decoration-thickness: 2px; }
.switch { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.switch input { appearance: none; width: 46px; height: 26px; border-radius: 99px; background: var(--seat); position: relative; cursor: pointer; flex: none; transition: background .15s ease; }
.switch input::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--cream); transition: transform .15s ease; }
.switch input:checked { background: var(--red); }
.switch input:checked::after { transform: translateX(20px); }
.switch small { display: block; color: var(--dim); }

.coll { border: 1px solid var(--seat); border-radius: 12px; padding: 12px 14px; display: grid; gap: 10px; background: var(--velvet); }
.coll-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.coll-head .switch b { font-weight: 800; }
.coll details summary { cursor: pointer; color: var(--bulb); font-weight: 700; font-size: .88rem; }
.coll details .chips { margin-top: 10px; }
.coll .chip span { padding: 6px 11px; font-size: .84rem; }
.coll.off { opacity: .55; }

@media (max-width: 520px) { .two { grid-template-columns: 1fr; } }

/* ================= Grand jeu : la salle ================= */
:root { --serif: "Instrument Serif", "Iowan Old Style", Georgia, serif; }
/* Lambrequin de velours en haut de la page */
.valance { position: absolute; inset: 0 0 auto; height: 74px; pointer-events: none; z-index: 1;
  background:
    radial-gradient(ellipse 34px 22px at 34px 0, transparent 0 20px, rgba(0,0,0,.35) 21px, transparent 26px) 0 52px / 68px 30px repeat-x,
    radial-gradient(ellipse 34px 30px at 34px 0, #6d1420 0 28px, transparent 29px) 0 46px / 68px 32px repeat-x,
    repeating-linear-gradient(90deg, rgba(0,0,0,.28) 0 3px, transparent 3px 22px, rgba(255,255,255,.04) 22px 24px, transparent 24px 34px),
    linear-gradient(#4a0c15, #7a1824 70%, #5a0f1a);
  -webkit-mask: linear-gradient(#000 60%, #000) top / 100% 48px no-repeat, radial-gradient(ellipse 34px 30px at 34px 0, #000 28px, transparent 29px) 0 46px / 68px 32px repeat-x;
          mask: linear-gradient(#000 60%, #000) top / 100% 48px no-repeat, radial-gradient(ellipse 34px 30px at 34px 0, #000 28px, transparent 29px) 0 46px / 68px 32px repeat-x;
  filter: drop-shadow(0 8px 10px rgba(0,0,0,.5)); }
.valance::after { content: ""; position: absolute; left: 0; right: 0; top: 40px; height: 6px; background: repeating-linear-gradient(90deg, #d9a441 0 6px, #8a5f1a 6px 9px); opacity: .9; }
body { position: relative; padding-top: max(104px, calc(env(safe-area-inset-top) + 92px)); }
/* Grain de pellicule */
body::after { content: ""; position: fixed; inset: -50%; pointer-events: none; z-index: 50; opacity: .07; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  animation: grain 1.2s steps(6) infinite; }
@keyframes grain { 0%{transform:translate(0,0)} 20%{transform:translate(-3%,2%)} 40%{transform:translate(2%,-3%)} 60%{transform:translate(-2%,-1%)} 80%{transform:translate(3%,3%)} 100%{transform:translate(0,0)} }
.marquee-wrap p { font-size: 1.04rem; }
.guide-link { display: inline-block; font: 800 .92rem var(--body); text-decoration: none; color: var(--ink); background: var(--bulb); padding: 9px 16px; border-radius: 99px; box-shadow: 0 0 22px rgba(255,207,107,.35); }
.guide-link:hover { background: #fff1c9; }
.marquee-wrap .tagline { font: italic 400 1.5rem/1.2 var(--serif); color: var(--bulb); margin: 0; }

/* Titres de section : lettrage d'enseigne + numéro de séance */
.act { position: relative; overflow: hidden; }
.act::before { content: ""; position: absolute; inset: 0 0 auto; height: 2px; background: linear-gradient(90deg, transparent, rgba(255,207,107,.5), transparent); }
.act .sub { font-family: var(--serif); font-size: 1.12rem; line-height: 1.4; color: #cdb8ad; }
.act header span { font-family: var(--type); font-weight: 700; letter-spacing: .14em; background: var(--red); color: #fff; padding: 3px 8px 2px; border-radius: 3px; transform: rotate(-2deg); display: inline-block; }
.act h2 { font-size: 2.2rem; }

/* L'écran : vrais visuels */
.stage { position: relative; }
.stage .glow { position: absolute; inset: 6% 4% 10%; z-index: -1; filter: blur(42px) saturate(1.4); opacity: .55; background-size: cover; background-position: center; transition: background-image .6s ease; border-radius: 30px; }
/* ---------- L'écran : un vrai petit Nuvio, qu'on parcourt à la souris ou aux flèches ---------- */
.tv { overflow: hidden; background: #050304; border-radius: 16px; padding: 10px; box-shadow: 0 0 0 2px #2b1820, 0 30px 80px rgba(0,0,0,.6), 0 0 90px rgba(120,160,255,.06); }
.screen { position: relative; aspect-ratio: 16 / 9; border-radius: 8px; overflow: hidden; background: linear-gradient(180deg, #13101a, #0b0910); container-type: inline-size; }
.tv-foot { height: 10px; width: 34%; margin: 8px auto 0; border-radius: 0 0 10px 10px; background: #1c1116; }
@keyframes fade-in { from { opacity: 0; } }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } }
/* Sous l'écran : format des affiches, agrandir */
.screen-tools { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: -8px; }
.screen-tools .seg button { padding: 7px 12px; font-size: .82rem; }
.caption { margin: -12px 0 0; text-align: center; color: var(--dim); font-size: .82rem; }
.big-close { display: none; }
.screen-fun { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.stage .screen-tools { justify-content: center; }
#pp-btn[aria-pressed="true"] { background: var(--cream); border-color: var(--cream); color: var(--ink); }
.screen-fun .mini { padding: 8px 14px; font-size: .84rem; border-color: rgba(255,207,107,.4); color: var(--bulb); }
.screen-fun .mini:hover { background: rgba(255,207,107,.1); }
.stage .screen-tools { margin-top: 14px; }
/* La colonne collante crée sa propre pile d'affichage : on la passe devant tout quand l'écran est en grand. */
.ecran-grand aside { z-index: 66; }
/* Le billet du jour (z-index 84) ne passe pas devant l'écran agrandi. */
.ecran-grand .billet-jour { display: none; }
/* L'écran en grand, par-dessus la page */
.stage.big { position: fixed; inset: 0; z-index: 65; display: grid; place-content: center; justify-items: center; padding: 24px; background: rgba(5,3,4,.92); }
.stage.big .tv { width: min(1180px, calc(100vw - 48px), calc((100vh - 230px) * 16 / 9)); max-width: none; }
.stage.big .screen-tools, .stage.big .screen-fun { width: min(1100px, calc(100vw - 48px)); }
.stage.big .caption { display: none; }
.stage.big .glow { inset: 15%; }
.stage.big .big-close { display: inline-flex; margin-top: 16px; border-color: var(--cream); background: var(--cream); color: var(--ink); }

/* Le billet qui se déchire quand on copie */
.ticket .stub { transition: transform .5s cubic-bezier(.3,1.4,.5,1); transform-origin: 0 100%; }
.ticket.torn .stub { transform: translate(10px, 16px) rotate(9deg); }
.ticket.torn .main { animation: thump .4s ease; }
@keyframes thump { 30% { transform: translateY(2px); } }
.stamp { position: absolute; right: 90px; top: 40%; transform: rotate(-12deg) scale(.6); opacity: 0; font: 400 1.6rem/1 var(--display); letter-spacing: .1em; color: var(--red); border: 3px solid var(--red); border-radius: 6px; padding: 4px 10px; pointer-events: none; transition: all .35s cubic-bezier(.3,1.6,.5,1); mix-blend-mode: multiply; }
.ticket.torn .stamp { opacity: .85; transform: rotate(-12deg) scale(1); }

/* Le billet holographique : il s'incline sous la souris, un reflet irisé le traverse. */
.ticket { transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transition: transform .35s ease; }
.ticket.tilting { transition: transform .08s linear; }
.ticket .main { position: relative; }
.ticket .main::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity .3s ease; mix-blend-mode: soft-light;
  background: linear-gradient(115deg, transparent 25%, rgba(255,240,200,.9) 42%, rgba(255,170,220,.75) 48%, rgba(150,220,255,.75) 54%, transparent 70%) var(--mx, 50%) 0 / 260% 100% no-repeat; }
.ticket.tilting .main::after { opacity: 1; }
.t-seance { margin-top: -4px; font: 700 .74rem var(--type); color: #7a5a4c; }
.qr { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 12px; align-items: center; padding: 10px; border-radius: 8px; background: rgba(42,26,20,.07); }
.qr svg { width: 112px; height: 112px; display: block; border-radius: 6px; }
.qr p { margin: 0; font-size: .85rem; line-height: 1.4; }
.qr-wait { font: 400 .78rem var(--type); }

/* L'écran grésille comme quand on change de chaîne. */
.screen::before { content: ""; position: absolute; inset: 0; z-index: 3; pointer-events: none; opacity: 0; mix-blend-mode: screen;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E") 0 0 / 140px 140px, repeating-linear-gradient(0deg, rgba(255,255,255,.09) 0 1px, transparent 1px 3px); }
.screen.zap::before { animation: zap .4s steps(5); }
@keyframes zap { 0% { opacity: .85; background-position: 0 0, 0 0; } 25% { background-position: 50px 30px, 0 6px; } 50% { opacity: .55; background-position: -40px 70px, 0 2px; } 75% { background-position: 20px -40px, 0 9px; } 100% { opacity: 0; } }

/* Une rangée mise à l'affiche : le projecteur la balaie, son numéro saute. */
.frame.lit::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(100deg, transparent 38%, rgba(255,226,165,.3) 50%, transparent 62%) no-repeat; background-size: 240% 100%;
  animation: sweep-row .75s ease-out both; }
@keyframes sweep-row { from { background-position: 100% 0; } to { background-position: 0 0; } }
.frame.lit .pos { animation: tick .45s cubic-bezier(.3,1.7,.5,1); }
@keyframes tick { from { transform: scale(.3); opacity: 0; } }

</style>
${feuilles("scene.css", "nuvio.css")}
<style>
/* ---------- Téléphone (après tout le reste, pour passer devant) ---------- */
@media (max-width: 960px) {
  /* L'aperçu en haut, les réglages, puis le billet tout à la fin (là où on en a besoin). */
  aside, .rail { display: contents; }
  .stage { order: -2; }
  .caption { order: -1; margin-top: -26px; }
  .ticket { order: 1; scroll-margin: 24px; }
}
/* Doigt plutôt que souris : des cibles d'au moins 44 px, et des champs en 16 px (sinon iOS zoome dans la page). */
.caption .doigt { display: none; }
@media (hover: none), (pointer: coarse) {
  .caption .souris { display: none; }
  .caption .doigt { display: inline; }
  .arrow, .icon { width: 44px; height: 44px; font-size: 1.05rem; }
  .toggle { min-height: 44px; padding: 8px 12px; }
  .tools { gap: 6px; }
  .mini, .seg button, .screen-tools .seg button { min-height: 44px; }
  .chip span { min-height: 44px; }
  .nav a { padding: 11px 12px; }
  .reset { padding: 12px 0; }
  .add-row { min-height: 48px; }
  .coll details summary { padding-block: 11px; }
  .nvo-rech input, .rename input, .field input:is([type=text], [type=password]).plain, select, input[type=number] { font-size: 16px; }
  .act { scroll-margin-top: 76px; }
}
/* Ouverte par-dessus le guide (dans un cadre) : seulement les réglages et le billet. La barre du guide
   porte le titre et « Terminé » ; rien ne mène ailleurs (salles, guide, mode d'emploi déjà dans le guide). */
.dans-guide .valance, .dans-guide .foyer, .dans-guide .marquee-wrap, .dans-guide .draperie, .dans-guide #s-mode, .dans-guide .nav a[href="#s-mode"] { display: none !important; }
.dans-guide body { padding-top: 16px; }
@media (prefers-reduced-motion: reduce) { body::after, .frame::after, .frame .pos, .screen::before, .nv *, .fiche, .fiche * { animation: none !important; } .ticket { transform: none; } .nv, .nv-track { scroll-behavior: auto; } }
</style>
</head>
<body>
  <div class="valance" aria-hidden="true"></div>
  ${stageTop({ here: "programmation", origin })}
  ${secretsHTML("programmation")}
  <div class="marquee-wrap">
    ${BEAM_HTML}
    <div class="marquee"><small>Nuvio · en français</small><h1>Ta programmation</h1></div>
    <p class="tagline">Ton accueil, ta salle, tes règles.</p>
    <a class="guide-link" href="${origin}/guide">Pas encore Nuvio ? Suis le guide de A à Z →</a>
    <p>Choisis ce qui passe sur ton accueil, crée tes propres rangées, renomme-les, filtre ce que tu ne veux pas voir. <b>L'écran se met à jour en direct</b>, et ton billet contient ton lien d'installation. Rien n'est enregistré : tout tient dans le lien.</p>
  </div>

  <div class="layout">
    <main>
      <nav class="nav" aria-label="Sections">
        <a href="#s-nom">Nom</a><a href="#s-pays">Pays</a><a href="#s-rangees">Rangées</a><a href="#s-saison">Saison</a>
        <a href="#s-plateformes">Plateformes</a><a href="#s-filtres">Filtres</a><a href="#s-ia">IA</a><a href="#s-decouvrir">Découvrir</a><a href="#s-collections">Collections</a>${copy ? '<a href="#s-hote">Hébergeur</a>' : ""}<a href="#s-mode">Installer</a>
      </nav>

      <section class="act" id="s-nom">
        <header><span>Affiche</span><h2>Le nom de ton addon</h2></header>
        <label for="name" class="sub">Il apparaît dans la liste des addons de Nuvio.</label>
        <input type="text" id="name" maxlength="40" autocomplete="off" spellcheck="false" enterkeyhint="done">
      </section>

      <section class="act" id="s-pays">
        <header><span>Salle</span><h2>Ton pays</h2></header>
        <p class="sub">Les plateformes et les sorties au cinéma changent d'un pays à l'autre. Au Québec, les titres sont en français québécois quand ils existent.</p>
        <div class="seg" id="regions" role="group" aria-label="Pays"></div>
      </section>

      <section class="act" id="s-rangees">
        <header><span>Bobine</span><h2>Les rangées de l'accueil</h2></header>
        <p class="sub">Mets à l'affiche celles que tu veux, range-les avec les flèches, et renomme-les avec le crayon. Tu peux aussi créer tes propres rangées.</p>
        <ol class="reel" id="rows"></ol>
        <button type="button" class="add-row" id="add-row">+ Créer une rangée sur mesure</button>
        <div class="builder" id="builder" hidden>
          <h3 id="b-title">Nouvelle rangée</h3>
          <label class="field"><span>Nom de la rangée</span><input type="text" class="plain" id="b-name" maxlength="40" enterkeyhint="done" placeholder="ex. K-dramas à pleurer"></label>
          <div class="field"><span>Quoi</span><div class="seg" id="b-type" role="group" aria-label="Type"></div></div>
          <div class="field"><span>Genres (l'un ou l'autre)</span><div class="chips" id="b-genres"></div></div>
          <div class="field"><span>Seulement sur ces plateformes (facultatif)</span><div class="chips" id="b-prov"></div></div>
          <div class="two">
            <label class="field"><span>Langue d'origine</span><select id="b-lang"></select></label>
            <div class="field"><span>Sortis entre</span><div class="two"><input type="number" id="b-from" min="1900" max="2100" inputmode="numeric" enterkeyhint="done" placeholder="1900" aria-label="Année de début"><input type="number" id="b-to" min="1900" max="2100" inputmode="numeric" enterkeyhint="done" placeholder="aujourd'hui" aria-label="Année de fin"></div></div>
          </div>
          <div class="field"><span>Note minimale</span><div class="range"><input type="range" id="b-vote" min="0" max="9" step="0.5" aria-label="Note minimale"><output id="b-vote-out"></output></div></div>
          <div class="field"><span>Ordre</span><div class="seg" id="b-sort" role="group" aria-label="Ordre"></div></div>
          <p class="summary" id="b-summary"></p>
          <div class="b-actions"><button type="button" class="mini ok" id="b-save">Ajouter à l'affiche</button><button type="button" class="mini" id="b-cancel">Annuler</button></div>
        </div>
      </section>

      <section class="act" id="s-saison">
        <header><span>Calendrier</span><h2>La rangée « Spécial »</h2></header>
        <p class="sub">Elle change toute seule selon la période. Décoche les fêtes qui ne t'intéressent pas : en dehors des fêtes choisies, elle montre les films à l'affiche.</p>
        <div class="chips" id="seasons"></div>
      </section>

      <section class="act" id="s-plateformes">
        <header><span>Abonnements</span><h2>Tes plateformes</h2></header>
        <p class="sub">Elles décident du contenu de « Nouveautés sur tes plateformes » et des tuiles de la collection Plateformes.</p>
        <div class="chips" id="providers"></div>
        <p class="warn" id="prov-warn" hidden>Aucune plateforme choisie : la rangée « Nouveautés sur tes plateformes » ne s'affichera pas.</p>
      </section>

      <section class="act" id="s-filtres">
        <header><span>Le videur</span><h2>Ce que tu ne veux pas voir</h2></header>
        <p class="sub">Ces filtres s'appliquent partout : rangées, Découvrir et collections.</p>
        <div class="field"><span>Genres à masquer</span><div class="chips danger" id="excl"></div></div>
        <div class="two">
          <div class="field"><span>Note minimale partout</span><div class="range"><input type="range" id="g-vote" min="0" max="8" step="0.5" aria-label="Note minimale partout"><output id="g-vote-out"></output></div></div>
          <label class="field"><span>Rien de sorti avant</span><select id="g-year"></select></label>
        </div>
        <label class="switch"><input type="checkbox" id="g-family"><span><b>Mode famille</b><small>Films tous publics ou -10 ans seulement, pas d'horreur, séries pour la famille et les enfants.</small></span></label>
        <label class="switch"><input type="checkbox" id="g-unreleased"><span><b>Tendances : seulement ce qu'on peut déjà regarder</b><small>TMDB y met aussi les films encore au cinéma ou pas encore sortis. Ils passent dans « Bientôt dispo » et « Les plus attendus ».</small></span></label>
      </section>

      <section class="act" id="s-ia">
        <header><span>Projectionniste</span><h2>La recherche par IA</h2></header>
        <p class="sub">L'IA comprend les recherches du genre « le film où un mec revit la même journée » et écrit dans les fiches « pour qui », « à savoir » et le rappel avant une suite. Elle marche avec ta propre clé Gemini, gratuite : crée-la en 2 minutes sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>, puis colle-la ici.</p>
        <div class="field">
          <span>Ta clé Gemini (facultatif)</span>
          <div class="ai-key">
            <input type="text" id="ai-key" class="plain masque" autocomplete="off" data-1p-ignore data-lpignore="true" spellcheck="false" enterkeyhint="done" placeholder="AIza…" aria-label="Ta clé Gemini" aria-describedby="ai-key-hint">
            <button type="button" id="ai-key-eye" aria-label="Afficher la clé" aria-pressed="false">👁</button>
          </div>
          <small id="ai-key-hint" aria-live="polite"></small>
        </div>
        <p class="sub">Ta clé est rangée dans ton lien d'installation : ne partage pas ce lien. Sans clé, tu profites quand même des réponses déjà écrites pour les autres.</p>
${copy ? "" : `        <p class="sub">Le lien partagé sature ? <a href="${origin}/copie">Monte ta propre copie</a> : la même chose, avec tes clés et ton quota.</p>
`}      </section>

      <section class="act" id="s-decouvrir">
        <header><span>Coulisses</span><h2>Les catalogues de Découvrir</h2></header>
        <p class="sub">Ils ne passent pas sur l'accueil, seulement dans l'onglet Découvrir, avec leurs filtres par genre, année ou décennie.</p>
        <div class="group"><h3>Films</h3><div class="chips" id="disc-movie"></div></div>
        <div class="group"><h3>Séries</h3><div class="chips" id="disc-series"></div></div>
      </section>

      <section class="act" id="s-collections">
        <header><span>Grand écran</span><h2>Les collections</h2></header>
        <p class="sub">Les grandes tuiles en haut de l'accueil, à importer avec le second lien de ton billet. Choisis les collections, puis les tuiles de chacune.</p>
        <div id="collections" style="display:grid;gap:10px"></div>
      </section>

${copy ? HOTE_HTML : ""}
      <section class="act" id="s-mode">
        <header><span>Mode d'emploi</span><h2>Installer sur ta TV sans rien taper</h2></header>
        <ol class="steps-howto">
          <li><span><b>Sur la TV</b>, dans Nuvio : Addons → <b>Gérer depuis le téléphone</b>. Un QR code s'affiche.</span></li>
          <li><span><b>Scanne-le avec ton téléphone</b>, connecté au même Wi-Fi que la TV.</span></li>
          <li><span><b>Colle les liens de ton billet</b> : l'addon dans l'onglet Addons, les collections dans l'onglet Collections → Importer → URL.</span></li>
          <li><span><b>Mets Nuvio en français</b> : langue de l'appli et langue TMDB (Paramètres → Enrichissement TMDB).</span></li>
        </ol>
        <p class="sub">Nuvio est sur ton téléphone, ta tablette ou ton ordinateur ? Pas besoin de QR code : colle directement les liens de ton billet dans l'appli (Addons, puis Collections → Importer → URL).</p>
        <p class="sub">Pour retrouver tes réglages plus tard, ouvre ton lien d'addon en remplaçant « manifest.json » par « configure ». Tu pars de zéro ? <a href="${origin}/guide">Le guide complet</a> installe Nuvio et tous les addons, dans l'ordre.</p>
      </section>

      <button type="button" class="reset" id="reset">Revenir à la programmation d'origine</button>
    </main>

    <aside>
      <div class="rail">
      <div class="stage" id="stage">
        <div class="glow" id="glow" aria-hidden="true"></div>
        <div class="tv"><div class="screen" id="screen" role="region" aria-label="Aperçu interactif de ton accueil Nuvio"></div></div>
        <div class="tv-foot"></div>
        <div class="screen-tools">
          <button type="button" class="mini" id="ret-btn" title="Le bouton Retour de la télécommande (touche Retour arrière du clavier)">◀ Retour</button>
          <div class="seg" id="fmt" role="group" aria-label="Format des affiches"></div>
          <button type="button" class="mini" id="pp-btn" aria-pressed="false">Affiches PostersPlus</button>
        </div>
        <div class="screen-fun">
          <button type="button" class="mini" id="zoom" aria-pressed="false">Agrandir l'écran</button>
        </div>
        <button type="button" class="btn big-close" id="big-close">Fermer le grand écran</button>
      </div>
      </div>
      <p class="caption"><span class="souris">Passe la souris sur une affiche (ou utilise les flèches) comme avec la télécommande, clique pour ouvrir sa fiche ; « Retour » ouvre le menu de Nuvio.</span><span class="doigt">Touche une affiche pour ouvrir sa fiche, fais glisser les rangées du doigt.</span></p>

      <div class="ticket" id="ticket">
        <div class="main">
          <div class="t-head"><b id="t-name"></b><span id="t-serial"></span></div>
          <div class="t-seance" id="t-seance"></div>
          <div class="t-meta"><span><b id="t-rows"></b> rangées</span><span><b id="t-prov"></b> plateformes</span><span><b id="t-coll"></b> collections</span><span id="t-extra"></span></div>
          <div class="t-label">Addon · Addons → Ajouter un addon</div>
          <div class="t-url" id="u-manifest"></div>
          <div class="t-btns">
            <button type="button" class="btn solid" id="copy-manifest">Copier</button>
            <a class="btn line" id="open-app" href="#">Ouvrir dans l'appli</a>
          </div>
          <div class="t-label">Collections · Collections → Importer → URL</div>
          <div class="t-url" id="u-collections"></div>
          <div class="t-btns"><button type="button" class="btn solid full" id="copy-collections">Copier</button></div>
          <div class="t-btns">
            <button type="button" class="btn line" id="qr-btn" aria-expanded="false" aria-controls="qr">Continuer sur le téléphone</button>
            <button type="button" class="btn line" id="share-btn">Offrir ce billet</button>
            <button type="button" class="btn line full" id="img-btn">Télécharger le billet en image</button>
          </div>
          <div class="qr" id="qr" hidden><div id="qr-code" class="qr-wait">Impression du QR code…</div><p>Scanne-le avec ton téléphone : cette page s'ouvre avec les mêmes réglages, il ne reste qu'à copier les liens.</p></div>
        </div>
        <div class="stub"><span>Admis · 1 salle</span></div>
        <div class="stamp" aria-hidden="true">Copié</div>
      </div>

    </aside>
  </div>

  ${SEATS_HTML}
  ${CREDITS_HTML}


  <div class="dock"><button type="button" class="dock-billet" id="dock-billet">Ton billet : <b id="dock-count"></b><i aria-hidden="true">↓</i></button><button type="button" class="btn" id="dock-copy">Copier mon lien</button></div>

<script>${nuvioDonnees(origin)}</script>
${scripts("nuvio.js")}
<script>
const D = ${json};
const hashDepart = location.hash; // l'adresse est réécrite ensuite (réglages), on garde l'ancre demandée
window.hashDepart = hashDepart;
const clone = (o) => JSON.parse(JSON.stringify(o));
const state = clone(D.cfg);
const $ = (id) => document.getElementById(id);
// Écran tactile : on n'y donne jamais le focus à un champ de nous-mêmes (ça ouvrirait le clavier).
const tactile = matchMedia("(hover: none), (pointer: coarse)").matches;
const same =(a, b) => JSON.stringify(a) === JSON.stringify(b);
const baseIds = D.rows.map(r => r.id);
let order = [];
function resetOrder() { order = [...state.r, ...allRowIds().filter(id => !state.r.includes(id))]; }
function allRowIds() { return [...baseIds, ...state.x.map((_, i) => "perso-" + i)]; }

// ---------- adresse courte (voir config.js : positions, masques, seulement les différences) ----------
function rowRef(id) { return id.startsWith("perso-") ? "p" + id.slice(6) : baseIds.indexOf(id); }
function compact(st) {
  const o = {}, df = D.defaults;
  const idx = (ids, ref) => ids.map(id => ref.indexOf(id));
  const mask = (ids, ref) => ref.reduce((m, id, i) => ids.includes(id) ? m | (1 << i) : m, 0);
  if (st.n !== df.n) o.n = st.n;
  if (!same(st.r, df.r)) o.r = st.r.map(rowRef);
  if (!same(st.p, df.p)) o.p = idx(st.p, D.providers.map(p => p.id));
  if (!same(st.d, df.d)) o.d = mask(st.d, D.discover.map(d => d.id));
  if (!same(st.c, df.c)) o.c = mask(st.c, D.collections.map(c => c.id));
  if (Object.keys(st.o).length) { o.o = {}; for (const [k, v] of Object.entries(st.o)) o.o[rowRef(k)] = v; }
  if (st.x.length) o.x = st.x.map(x => {
    const r = {};
    if (x.n) r.n = x.n; if (x.t) r.t = x.t; if (x.g.length) r.g = x.g; if (x.w.length) r.w = x.w;
    if (x.l) r.l = x.l; if (x.y[0] || x.y[1]) r.y = x.y; if (x.v) r.v = x.v; if (x.s) r.s = x.s;
    return r;
  });
  if (st.g !== df.g) o.g = st.g;
  if (st.e.length) o.e = idx(st.e, D.genres.map(g => g[0]));
  if (st.m) o.m = st.m;
  if (st.a) o.a = st.a;
  if (st.f) o.f = 1;
  if (st.u) o.u = 1;
  if (st.k) o.k = st.k;
  if (st.al) o.al = st.al;
  if (!same(st.h, df.h)) o.h = mask(st.h, D.seasons.map(s => s[0]));
  const t = {};
  D.collections.forEach((c, i) => { if (st.t[c.id] && st.t[c.id].length) t[i] = st.t[c.id]; });
  if (Object.keys(t).length) o.t = t;
  return o;
}
function enc(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = ""; bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
}

// ---------- petits composants ----------
function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (k === "class") n.className = v; else if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null) n.setAttribute(k, v);
  }
  kids.flat().forEach(k => k && n.append(k));
  return n;
}
function chip(container, id, label, checked, onChange, color) {
  const i = el("input", { type: "checkbox", id });
  i.checked = checked; i.addEventListener("change", () => onChange(i.checked));
  const s = el("span");
  if (color) { const dot = el("i"); dot.style.setProperty("--c", color); s.append(dot); }
  s.append(document.createTextNode(label));
  container.append(el("label", { class: "chip" }, i, s));
}
function seg(container, labels, current, onPick) {
  container.textContent = "";
  labels.forEach((lab, i) => container.append(el("button", { type: "button", "aria-pressed": String(i === current), text: lab, onclick: () => onPick(i) })));
}
// Curseur de note : part dorée, graduations, ampoule éteinte à « Toutes ».
function paintRange(r) {
  const min = Number(r.min), max = Number(r.max), v = Number(r.value);
  r.style.setProperty("--p", ((v - min) / (max - min) * 100) + "%");
  r.style.setProperty("--steps", String(max - min));
  r.classList.toggle("zero", v <= min);
}
document.querySelectorAll(".range input[type=range]").forEach((r) => r.addEventListener("input", () => paintRange(r)));
const fmtVote = (v) => v ? v.toLocaleString("fr-FR") + "+" : "Toutes";

// ---------- rangées ----------
function rowInfo(id) {
  if (id.startsWith("perso-")) {
    const i = Number(id.slice(6)), x = state.x[i]; if (!x) return null;
    return { id, custom: i, name: x.n || "Ma rangée " + (i + 1), kind: ["Films", "Séries", "Films + séries"][x.t], hint: describe(x) };
  }
  return D.rows.find(r => r.id === id);
}
function renderRows(flashId) {
  const ol = $("rows"); ol.textContent = "";
  let n = 0;
  order.forEach((id, idx) => {
    const r = rowInfo(id); if (!r) return;
    const on = state.r.includes(id);
    const shown = state.o[id] || r.name;
    const li = el("li", { class: "frame" + (on ? " on" : "") + (id === flashId ? " flash" : "") + (id === justOn ? " lit" : "") });
    const cb = el("input", { type: "checkbox", id: "row-" + id }); cb.checked = on;
    cb.addEventListener("change", () => { setRow(id, cb.checked); renderRows(id); update(); });
    const lab = el("label", { for: cb.id },
      el("b", { text: shown }),
      r.custom !== undefined ? el("span", { class: "badge", text: "Sur mesure" }) : null,
      el("span", { class: "kind", text: r.kind }),
      state.o[id] ? el("em", { class: "orig", text: "(" + r.name + ")" }) : null,
      el("small", { text: r.hint + (r.now ? " · en ce moment : " + r.now : "") }));
    const inp = el("input", { type: "text", value: state.o[id] || "", placeholder: r.name, maxlength: "40", enterkeyhint: "done", "aria-label": "Nouveau nom pour " + r.name });
    const saveName = () => { const v = inp.value.trim(); if (v && v !== r.name) state.o[id] = v; else delete state.o[id]; renderRows(id); update(); };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") renderRows(); });
    const box = el("div", { class: "body" }, lab, el("div", { class: "rename" }, inp, el("button", { type: "button", class: "mini ok", text: "OK", onclick: saveName })));
    const tools = el("div", { class: "tools" });
    tools.append(el("button", { type: "button", class: "toggle", "aria-pressed": String(on), text: on ? "À l'affiche" : "Ajouter", onclick: () => { setRow(id, !on); renderRows(id); update(); } }));
    if (r.custom !== undefined) tools.append(el("button", { type: "button", class: "icon", title: "Modifier", "aria-label": "Modifier " + shown, text: "⚙", onclick: () => openBuilder(r.custom) }));
    else tools.append(el("button", { type: "button", class: "icon", title: "Renommer", "aria-label": "Renommer " + shown, text: "✎", onclick: () => { li.classList.add("editing"); inp.focus(); inp.select(); } }));
    [["↑", -1, "Monter"], ["↓", 1, "Descendre"]].forEach(([t, d, a]) => {
      const j = idx + d;
      const bt = el("button", { type: "button", class: "arrow", text: t, "aria-label": a + " " + shown });
      bt.disabled = j < 0 || j >= order.length;
      bt.addEventListener("click", () => {
        [order[idx], order[j]] = [order[j], order[idx]];
        state.r = order.filter(x => state.r.includes(x));
        renderRows(id); update();
        const again = document.querySelector('#rows .frame.flash .arrow[aria-label^="' + a + '"]'); if (again && !again.disabled) again.focus();
      });
      tools.append(bt);
    });
    li.append(el("span", { class: "pos", text: on ? String(++n) : "·" }), cb, box, tools);
    ol.append(li);
  });
  justOn = null;
  $("add-row").disabled = state.x.length >= D.maxCustom;
  if (flashId) setTimeout(() => document.querySelectorAll(".frame.flash").forEach(f => f.classList.remove("flash")), 180);
}
let justOn = null; // rangée qu'on vient de mettre à l'affiche (balayée par le projecteur)
function setRow(id, on) {
  if (on && !state.r.includes(id)) justOn = id;
  const set = new Set(state.r); on ? set.add(id) : set.delete(id);
  state.r = order.filter(x => set.has(x));
}

// ---------- rangée sur mesure ----------
let draft = null, editing = -1;
const blank = () => ({ n: "", t: 0, g: [], w: [], l: "", y: [0, 0], v: 0, s: 0 });
function describe(x) {
  const kind = ["Films", "Séries", "Films et séries"][x.t];
  const lang = x.l ? " · " + (D.languages.find(l => l[0] === x.l) || ["", ""])[1].toLowerCase() : "";
  const g = x.g.length ? " · " + x.g.map(i => D.genres[i][0]).join(" ou ") : "";
  const w = x.w.length ? " · sur " + x.w.map(i => D.providers[i].name).join(", ") : "";
  const y = x.y[0] && x.y[1] ? " · de " + x.y[0] + " à " + x.y[1] : x.y[0] ? " · depuis " + x.y[0] : x.y[1] ? " · jusqu'à " + x.y[1] : "";
  const v = x.v ? " · notés " + x.v.toLocaleString("fr-FR") + "+" : "";
  return kind + lang + g + w + y + v + " · " + D.sorts[x.s].toLowerCase();
}
function openBuilder(i) {
  editing = i; draft = i >= 0 ? clone(state.x[i]) : blank();
  $("b-title").textContent = i >= 0 ? "Modifier la rangée" : "Nouvelle rangée";
  $("b-save").textContent = i >= 0 ? "Enregistrer" : "Ajouter à l'affiche";
  $("b-name").value = draft.n;
  $("b-genres").textContent = ""; $("b-prov").textContent = "";
  D.genres.forEach((g, gi) => chip($("b-genres"), "bg-" + gi, g[0], draft.g.includes(gi), on => { toggleIdx(draft.g, gi, on); drawBuilder(); }));
  D.providers.forEach((p, pi) => chip($("b-prov"), "bp-" + pi, p.name, draft.w.includes(pi), on => { toggleIdx(draft.w, pi, on); drawBuilder(); }, p.color));
  $("b-lang").value = draft.l; $("b-from").value = draft.y[0] || ""; $("b-to").value = draft.y[1] || ""; $("b-vote").value = draft.v; paintRange($("b-vote"));
  delBtn.hidden = i < 0;
  $("builder").hidden = false; drawBuilder();
  $("builder").scrollIntoView({ behavior: "smooth", block: tactile ? "start" : "center" }); if (!tactile) $("b-name").focus({ preventScroll: true });
}
function toggleIdx(list, i, on) { const k = list.indexOf(i); if (on && k < 0) list.push(i); if (!on && k >= 0) list.splice(k, 1); list.sort((a, b) => a - b); }
function drawBuilder() {
  seg($("b-type"), ["Films", "Séries", "Les deux"], draft.t, (i) => { draft.t = i; drawBuilder(); });
  seg($("b-sort"), D.sorts, draft.s, (i) => { draft.s = i; drawBuilder(); });
  $("b-vote-out").textContent = fmtVote(draft.v);
  // Genres qui n'existent pas pour les séries (ex. Horreur) : grisés quand on choisit « Séries ».
  D.genres.forEach((g, gi) => { const box = $("bg-" + gi).parentElement; box.style.opacity = (draft.t === 1 && !g[2]) || (draft.t === 0 && !g[1]) ? ".35" : ""; });
  $("b-summary").textContent = (draft.n || "Ta rangée") + " → " + describe(draft);
}
$("b-name").addEventListener("input", () => { draft.n = $("b-name").value.trim(); drawBuilder(); });
$("b-lang").addEventListener("change", () => { draft.l = $("b-lang").value; drawBuilder(); });
$("b-from").addEventListener("input", () => { draft.y[0] = Number($("b-from").value) || 0; drawBuilder(); });
$("b-to").addEventListener("input", () => { draft.y[1] = Number($("b-to").value) || 0; drawBuilder(); });
$("b-vote").addEventListener("input", () => { draft.v = Number($("b-vote").value); drawBuilder(); });
$("add-row").addEventListener("click", () => openBuilder(-1));
$("b-cancel").addEventListener("click", () => { $("builder").hidden = true; });
$("b-save").addEventListener("click", () => {
  if (editing >= 0) state.x[editing] = draft;
  else { state.x.push(draft); const id = "perso-" + (state.x.length - 1); order.push(id); setRow(id, true); }
  // une seule rangée : bouton Supprimer dans le formulaire de modification
  $("builder").hidden = true; renderRows(editing >= 0 ? "perso-" + editing : "perso-" + (state.x.length - 1)); update();
});
function deleteCustom(i) {
  const shift = (id) => { if (!id.startsWith("perso-")) return id; const k = Number(id.slice(6)); return k === i ? null : k > i ? "perso-" + (k - 1) : id; };
  state.x.splice(i, 1);
  state.r = state.r.map(shift).filter(Boolean);
  order = order.map(shift).filter(Boolean);
  const o = {}; for (const [k, v] of Object.entries(state.o)) { const nk = shift(k); if (nk) o[nk] = v; } state.o = o;
}
const delBtn = el("button", { type: "button", class: "mini del", text: "Supprimer cette rangée", onclick: () => { if (editing >= 0) { deleteCustom(editing); $("builder").hidden = true; renderRows(); update(); } } });
$("b-cancel").after(delBtn);

// ---------- aperçu : l'écran Nuvio commun (nuvio.js), nourri par le lien en cours ----------
// Il lit exactement ce que Nuvio recevra : le manifest.json et le collections.json de ce lien, dans leur ordre
// (« Suivre l'ordre des addons »), avec Plateformes épinglée tout en haut.
const byPos = (list) => [...list].sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99));
const jsonCache = new Map();
function fetchJSON(url) {
  if (!jsonCache.has(url)) jsonCache.set(url, fetch(url).then(r => r.ok ? r.json() : null).catch(() => null));
  return jsonCache.get(url);
}
let currentBase = D.origin, screenTimer = 0, screenToken = 0, lastZap = 0;
let configureUrl = D.origin + "/configure"; // adresse de cette page avec les réglages en cours
let shareUrl = configureUrl;                  // la même, sans la clé Gemini : pour le billet partagé
// L'écran grésille à chaque changement (pas plus de deux fois par seconde).
function zap(sc) {
  const now = Date.now(); if (now - lastZap < 450) return; lastZap = now;
  sc.classList.remove("zap"); void sc.offsetWidth; sc.classList.add("zap");
}
const E = NV.ecran($("screen"), { base: () => currentBase });
E.paysage(NV.reglages.format === "l"); E.pp();
// La lueur derrière la TV prend les couleurs du haut de l'écran.
new MutationObserver(() => { const i = E.hero.el.querySelector(".nvo-bd > i.on:last-of-type") || E.hero.el.querySelector(".nvo-bd > i:last-of-type"); if (i && i.style.backgroundImage) $("glow").style.backgroundImage = i.style.backgroundImage; })
  .observe(E.hero.el, { subtree: true, attributes: true, attributeFilter: ["class", "style"] });
function renderScreen() {
  zap($("screen"));
  const token = ++screenToken, base = currentBase;
  clearTimeout(screenTimer);
  screenTimer = setTimeout(async () => {
    const [man, colls] = await Promise.all([fetchJSON(base + "/manifest.json"), fetchJSON(base + "/collections.json")]);
    if (token !== screenToken) return;
    const keep = E.rangees.scrollTop;
    E.vider();
    const collections = Array.isArray(colls) ? colls : ((colls && colls.collections) || []);
    const accueil = ((man && man.catalogs) || []).filter((c) => c.showInHome !== false && !(c.extra || []).some((x) => x.isRequired));
    const rangeeTuiles = (c) => { const { piste } = E.rangee(c.title); (c.folders || []).forEach((f) => piste.append(NV.tuile(f, c.title, c.id))); };
    collections.filter((c) => c.pinToTop).forEach(rangeeTuiles);
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); e.target._charge(); } }), { root: E.rangees, rootMargin: "300px 0px" });
    accueil.forEach((c) => {
      const { section, piste } = E.rangee(c.name);
      for (let k = 0; k < 8; k++) piste.append(NV.carte(null));
      section._charge = () => fetchJSON(base + "/catalog/" + c.type + "/" + encodeURIComponent(c.id) + ".json").then((d) => {
        if (token !== screenToken) return;
        const metas = ((d && d.metas) || []).filter((m) => m.poster);
        piste.textContent = "";
        if (!metas.length) { section.remove(); return; }
        metas.slice(0, 20).forEach((m) => piste.append(NV.carte(m)));
        E.pret();
      });
      io.observe(section);
    });
    collections.filter((c) => !c.pinToTop).forEach(rangeeTuiles);
    if (!E.rangees.children.length) { const { piste } = E.rangee("Écran noir"); piste.append(NV.mkd("p", "vide", "Coche au moins une rangée ou une collection.")); }
    E.rangees.scrollTop = keep;
    E.pret();
  }, 300);
}

// ---------- Les salles du foyer ajoutent leur rangée sur mesure ----------
window.rangeePresente = (nom) => state.x.some((x) => x.n === nom);
window.ajouterRangee = (r) => {
  if (state.x.some((x) => x.n === r.n)) return "deja";
  if (state.x.length >= D.maxCustom) return "plein";
  const x = { n: r.n, t: r.t || 0, g: (r.genres || []).map((g) => D.genres.findIndex((G) => G[0] === g)).filter((i) => i >= 0), w: [], l: "", y: r.y || [0, 0], v: r.v || 0, s: r.s || 0 };
  state.x.push(x);
  const id = "perso-" + (state.x.length - 1);
  order.push(id); setRow(id, true); renderRows(id); update();
  return "ok";
};

// ---------- outils : télécommande, format des affiches, PostersPlus, grand écran ----------
$("ret-btn").addEventListener("click", () => E.retour());
function drawPP() { $("pp-btn").setAttribute("aria-pressed", String(NV.reglages.pp)); }
$("pp-btn").addEventListener("click", () => { NV.reglages.pp = !NV.reglages.pp; drawPP(); E.pp(); if (window.sfx) sfx.click(); });
drawPP();
function drawFmt() {
  seg($("fmt"), ["Affiches verticales", "Paysage"], NV.reglages.format === "l" ? 1 : 0, (i) => {
    NV.reglages.format = i ? "l" : "p";
    drawFmt(); E.paysage(i === 1);
    if (window.sfx) sfx.click();
  });
}
drawFmt();
const stageEl = $("stage");
function setBig(on) {
  stageEl.classList.toggle("big", on);
  document.body.classList.toggle("ecran-grand", on);
  $("zoom").setAttribute("aria-pressed", String(on));
  document.body.style.overflow = on ? "hidden" : "";
  if (on) { const f = E.pilote.sel; if (f) f.focus({ preventScroll: true }); }
  else $("zoom").focus({ preventScroll: true });
  if (window.sfx) sfx.click();
}
$("zoom").addEventListener("click", () => setBig(!stageEl.classList.contains("big")));
$("big-close").addEventListener("click", () => setBig(false));
stageEl.addEventListener("click", (e) => { if (e.target === stageEl) setBig(false); });
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (E.ouvert() && (stageEl.classList.contains("big") || $("screen").contains(document.activeElement))) { e.preventDefault(); E.retour(); return; }
  if (stageEl.classList.contains("big")) setBig(false);
});

// ---------- billet ----------
function serial(s) { let h = 7; for (const ch of s) h = (h * 131 + ch.charCodeAt(0)) % 99991; return "N° " + String(h).padStart(5, "0"); }
function update() {
  state.n = $("name").value.trim() || D.defaults.n;
  const c = compact(state);
  const base = D.origin + (Object.keys(c).length ? "/" + enc(c) : "");
  const manifest = base + "/manifest.json";
  currentBase = base;
  // L'adresse de la page suit les réglages : on peut revenir, recharger ou partager sans rien perdre.
  configureUrl = base + "/configure";
  const shared = compact({ ...state, k: "", al: "" });
  shareUrl = D.origin + (Object.keys(shared).length ? "/" + enc(shared) : "") + "/configure";
  try { if (location.protocol.startsWith("http") && location.href !== configureUrl) history.replaceState(null, "", configureUrl); } catch (e) {}
  try { sessionStorage.setItem("programmation", configureUrl); } catch (e) {}
  if (!$("qr").hidden) drawQr();
  $("u-manifest").textContent = manifest;
  $("u-collections").textContent = base + "/collections.json";
  // nuvio:// et pas stremio:// (sinon Stremio, s'il est installé, s'ouvre à la place) ; sous Windows, Nuvio n'ouvre aucun lien.
  $("open-app").href = manifest.replace(/^https:/, "nuvio:");
  // Lien http (copie Docker à la maison) : pas de nuvio://, le bouton ouvrirait le fichier dans le navigateur.
  $("open-app").hidden = !/^https:/.test(manifest) || /Windows/.test(navigator.userAgent);
  $("copy-manifest").classList.toggle("full", $("open-app").hidden);
  $("t-name").textContent = state.n;
  $("t-serial").textContent = serial(manifest);
  $("t-rows").textContent = state.r.length;
  $("t-prov").textContent = state.p.length;
  $("t-coll").textContent = state.c.length;
  const extras = [];
  if (state.x.length) extras.push(state.x.length + " sur mesure");
  if (state.e.length || state.m || state.a || state.f) extras.push("filtres actifs");
  if (state.g !== "FR") extras.push((D.regions.find(r => r.id === state.g) || {}).name);
  $("t-extra").textContent = extras.join(" · ");
  $("dock-count").textContent = state.r.length + " rangées, " + state.p.length + " plateformes";
  $("prov-warn").hidden = state.p.length > 0 || !state.r.includes("accueil-nouveautes-plateformes");
  renderScreen();
}

// ---------- tout le reste ----------
function toggle(key, id, on, all) {
  const set = new Set(state[key]); on ? set.add(id) : set.delete(id);
  state[key] = all.filter(x => set.has(x));
  update();
}
function renderCollections() {
  const box = $("collections"); box.textContent = "";
  byPos(D.collections).forEach(c => {
    const on = state.c.includes(c.id);
    const hidden = new Set(state.t[c.id] || []);
    const cb = el("input", { type: "checkbox", id: "col-" + c.id }); cb.checked = on;
    cb.addEventListener("change", () => { toggle("c", c.id, cb.checked, D.collections.map(x => x.id)); renderCollections(); });
    const count = c.folders.length - hidden.size;
    const head = el("div", { class: "coll-head" }, el("label", { class: "switch" }, cb, el("span", null, el("b", { text: c.name }), el("small", { text: count + " tuile" + (count > 1 ? "s" : "") + " sur " + c.folders.length }))));
    const wrap = el("div", { class: "coll" + (on ? "" : " off") }, head);
    if (c.folders.length) {
      const chipsBox = el("div", { class: "chips" });
      c.folders.forEach(({ title, i }) => chip(chipsBox, "tile-" + c.id + "-" + i, title, !hidden.has(i), (keep) => {
        const set = new Set(state.t[c.id] || []); keep ? set.delete(i) : set.add(i);
        if (set.size) state.t[c.id] = [...set].sort((a, b) => a - b); else delete state.t[c.id];
        const small = head.querySelector("small"); const n = c.folders.length - set.size;
        small.textContent = n + " tuile" + (n > 1 ? "s" : "") + " sur " + c.folders.length;
        update();
      }));
      const det = el("details", null, el("summary", { text: "Choisir les tuiles" }), chipsBox);
      if (c.id === "plateformes-streaming") det.append(el("p", { class: "sub", style: "margin:8px 0 0", text: "Les tuiles des plateformes suivent aussi tes abonnements." }));
      wrap.append(det);
    }
    box.append(wrap);
  });
}
function renderAll() {
  $("name").value = state.n;
  $("ai-key").value = state.k || ""; aiKeyHint();
  resetOrder(); renderRows();
  seg($("regions"), D.regions.map(r => r.name), D.regions.findIndex(r => r.id === state.g), (i) => { state.g = D.regions[i].id; renderAll(); });
  ["providers", "disc-movie", "disc-series", "seasons", "excl"].forEach(id => { $(id).textContent = ""; });
  D.providers.forEach(p => chip($("providers"), "prov-" + p.id, p.name, state.p.includes(p.id), on => toggle("p", p.id, on, D.providers.map(x => x.id)), p.color));
  D.discover.forEach(d => chip($(d.type === "series" ? "disc-series" : "disc-movie"), "disc-" + d.id, d.name, state.d.includes(d.id), on => toggle("d", d.id, on, D.discover.map(x => x.id))));
  D.seasons.forEach(([k, label]) => chip($("seasons"), "season-" + k, label, state.h.includes(k), on => toggle("h", k, on, D.seasons.map(s => s[0]))));
  // Téléréalité : déjà masquée partout, sauf dans les rangées sur mesure qui la choisissent.
  D.genres.filter(([name]) => name !== "Téléréalité").forEach(([name]) => chip($("excl"), "excl-" + name, name, state.e.includes(name), on => toggle("e", name, on, D.genres.map(g => g[0]))));
  $("g-vote").value = state.m; $("g-vote-out").textContent = fmtVote(state.m); paintRange($("g-vote"));
  $("g-year").value = String(state.a); $("g-family").checked = state.f;
  $("g-unreleased").checked = !state.u;
  renderCollections();
  update();
}

// listes déroulantes fixes
D.languages.forEach(([code, label]) => $("b-lang").append(el("option", { value: code, text: label })));
[0, 1960, 1970, 1980, 1990, 2000, 2010, 2015, 2020].forEach(y => $("g-year").append(el("option", { value: String(y), text: y ? String(y) : "Aucune limite" })));
$("g-vote").addEventListener("input", () => { state.m = Number($("g-vote").value); $("g-vote-out").textContent = fmtVote(state.m); update(); });
$("g-year").addEventListener("change", () => { state.a = Number($("g-year").value); update(); });
$("g-family").addEventListener("change", () => { state.f = $("g-family").checked; update(); });
$("g-unreleased").addEventListener("change", () => { state.u = !$("g-unreleased").checked; update(); });

function copy(btn, node, label) {
  const ok = () => {
    btn.textContent = "Copié ✓"; setTimeout(() => btn.textContent = label, 1500); popcorn(btn); sfx.punch(); bravo();
    const t = $("ticket"); t.classList.remove("torn"); void t.offsetWidth; t.classList.add("torn"); setTimeout(() => t.classList.remove("torn"), 1700);
  };
  const fallback = () => { const r = document.createRange(); r.selectNodeContents(node); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "Sélectionné"; setTimeout(() => btn.textContent = label, 1500); };
  try { navigator.clipboard.writeText(node.textContent).then(ok, fallback); } catch (e) { fallback(); }
}
$("copy-manifest").addEventListener("click", e => copy(e.currentTarget, $("u-manifest"), "Copier"));
$("copy-collections").addEventListener("click", e => copy(e.currentTarget, $("u-collections"), "Copier"));
$("dock-copy").addEventListener("click", e => copy(e.currentTarget, $("u-manifest"), "Copier mon lien"));
$("dock-billet").addEventListener("click", () => $("ticket").scrollIntoView({ behavior: "smooth", block: "start" }));
// Le billet est à l'écran : la barre du bas ferait doublon (et cacherait ses boutons).
if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => document.querySelector(".dock").classList.toggle("cache", e.isIntersecting), { threshold: .15 }).observe($("ticket"));
$("name").addEventListener("input", update);
// Clé Gemini : nettoyée à la saisie ; l'indication dit si elle a la forme d'une clé.
function aiKeyHint() {
  const k = state.k || "";
  const cleOk = /^[A-Za-z0-9._~+/=:-]{20,200}$/.test(k);
  $("ai-key-hint").textContent = !k ? "" : cleOk ? "Clé reconnue ✓" : "Ça ne ressemble pas à une clé Gemini : recopie-la depuis Google AI Studio (elle commence par AIza).";
  $("ai-key-hint").classList.toggle("alerte", !!k && !cleOk);
}
$("ai-key").addEventListener("input", () => { state.k = $("ai-key").value.trim(); aiKeyHint(); update(); });
$("ai-key").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } });
$("ai-key-eye").addEventListener("click", (e) => {
  const show = $("ai-key").classList.toggle("masque") === false;
  e.currentTarget.setAttribute("aria-pressed", String(show));
  e.currentTarget.setAttribute("aria-label", show ? "Masquer la clé" : "Afficher la clé");
});
// « OK » du clavier : on referme le clavier au lieu de rester dans le champ.
$("name").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } });
$("reset").addEventListener("click", () => { Object.assign(state, clone(D.defaults)); $("builder").hidden = true; renderAll(); });

// ---------- billet : séance, QR code, partage, reflet ----------
{
  const now = new Date();
  $("t-seance").textContent = "Séance du " + now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + " à " + now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
let qrLib = null;
function loadQr() {
  if (!qrLib) qrLib = new Promise((ok, ko) => {
    const sc = document.createElement("script");
    sc.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
    // Empreinte du fichier : si le CDN servait autre chose, le navigateur refuserait de l'exécuter.
    sc.integrity = "sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k"; sc.crossOrigin = "anonymous";
    sc.onload = () => ok(window.qrcode); sc.onerror = () => { qrLib = null; ko(); };
    document.head.append(sc);
  });
  return qrLib;
}
function drawQr() {
  const box = $("qr-code");
  loadQr().then((qrcode) => {
    const q = qrcode(0, "M"); q.addData(shareUrl); q.make();
    const n = q.getModuleCount(), w = n + 4; let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + c + " " + r + "h1v1h-1z";
    box.className = "";
    box.innerHTML = '<svg viewBox="-2 -2 ' + w + " " + w + '" role="img" aria-label="QR code de ta programmation" shape-rendering="crispEdges"><rect x="-2" y="-2" width="' + w + '" height="' + w + '" fill="#fff"/><path d="' + d + '" fill="#2a1a14"/></svg>';
  }, () => { box.className = "alerte"; box.setAttribute("role", "alert"); box.textContent = "QR code indisponible : vérifie ta connexion."; });
}
$("qr-btn").addEventListener("click", () => {
  const open = $("qr").hidden;
  $("qr").hidden = !open; $("qr-btn").setAttribute("aria-expanded", String(open));
  if (open) drawQr();
  sfx.click();
});
$("share-btn").addEventListener("click", async (e) => {
  const btn = e.currentTarget, label = btn.textContent;
  const data = { title: state.n + ", ma programmation Nuvio", text: "Ouvre ce lien pour avoir les mêmes rangées que moi dans Nuvio.", url: shareUrl };
  if (navigator.share) { try { await navigator.share(data); popcorn(btn); } catch (err) {} return; }
  try { await navigator.clipboard.writeText(shareUrl); btn.textContent = "Lien copié ✓"; popcorn(btn); } catch (err) { btn.textContent = "Copie impossible"; toast("Copie impossible : sélectionne le lien et copie-le à la main.", true); }
  setTimeout(() => { btn.textContent = label; }, 1800);
});
// Le billet en image (1080 × 1350), à garder ou à envoyer.
function fitText(c, text, max) {
  if (c.measureText(text).width <= max) return text;
  while (text.length > 1 && c.measureText(text + "…").width > max) text = text.slice(0, -1);
  return text + "…";
}
function drawTicket(c, qr) {
  const W = 1080, H = 1350;
  c.fillStyle = "#170c12"; c.fillRect(0, 0, W, H);
  const glow = c.createRadialGradient(W / 2, -60, 40, W / 2, -60, 800); glow.addColorStop(0, "rgba(229,65,58,.35)"); glow.addColorStop(1, "rgba(229,65,58,0)");
  c.fillStyle = glow; c.fillRect(0, 0, W, H);
  c.fillStyle = "rgba(0,0,0,.18)"; for (let x = 0; x < W; x += 46) c.fillRect(x, 0, 2, H);
  // L'enseigne
  const sx = 120, sy = 60, sw = 840, sh = 190;
  c.fillStyle = "#22121b"; c.beginPath(); c.roundRect(sx, sy, sw, sh, 22); c.fill();
  c.strokeStyle = "#4a2a36"; c.lineWidth = 5; c.stroke();
  const pts = [], e = 22, nx = Math.round((sw - 2 * e) / 24), ny = Math.round((sh - 2 * e) / 24);
  for (let i = 0; i < nx; i++) pts.push([sx + e + i * (sw - 2 * e) / nx, sy + e]);
  for (let j = 0; j < ny; j++) pts.push([sx + sw - e, sy + e + j * (sh - 2 * e) / ny]);
  for (let i = 0; i < nx; i++) pts.push([sx + sw - e - i * (sw - 2 * e) / nx, sy + sh - e]);
  for (let j = 0; j < ny; j++) pts.push([sx + e, sy + sh - e - j * (sh - 2 * e) / ny]);
  pts.forEach(([x, y], k) => { c.fillStyle = k % 2 ? "#ffcf6b" : "#fff3cf"; c.shadowColor = "#ffcf6b"; c.shadowBlur = 12; c.beginPath(); c.arc(x, y, 6, 0, 6.283); c.fill(); });
  c.shadowBlur = 0; c.textAlign = "center";
  c.fillStyle = "#ffcf6b"; c.font = '700 24px "Figtree"'; c.fillText("NUVIO  ·  EN FRANÇAIS", W / 2, sy + 70);
  c.fillStyle = "#fff6e6"; c.shadowColor = "rgba(255,207,107,.7)"; c.shadowBlur = 24; c.font = '400 104px "Bebas Neue"'; c.fillText("MA PROGRAMMATION", W / 2, sy + 160); c.shadowBlur = 0;
  // Le billet
  const tx = 90, ty = 300, tw = 900, th = 960, stub = 150, cut = tx + tw - stub;
  c.fillStyle = "#f5ead8"; c.beginPath(); c.roundRect(tx, ty, tw, th, 26); c.fill();
  c.fillStyle = "#170c12"; [[cut, ty], [cut, ty + th]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 22, 0, 6.283); c.fill(); });
  c.strokeStyle = "rgba(42,26,20,.4)"; c.lineWidth = 3; c.setLineDash([12, 10]); c.beginPath(); c.moveTo(cut, ty + 34); c.lineTo(cut, ty + th - 34); c.stroke(); c.setLineDash([]);
  c.save(); c.translate(cut + stub / 2 + 16, ty + th / 2); c.rotate(-Math.PI / 2); c.fillStyle = "#e5413a"; c.font = '400 64px "Bebas Neue"'; c.fillText("ADMIS  ·  1 SALLE", 0, 0); c.restore();
  const L = tx + 50, R = cut - 40;
  c.textAlign = "left"; c.fillStyle = "#2a1a14";
  c.font = '400 86px "Bebas Neue"'; c.fillText(fitText(c, state.n.toUpperCase(), R - L - 200), L, ty + 110);
  c.textAlign = "right"; c.font = '700 28px "Courier Prime"'; c.fillText($("t-serial").textContent, R, ty + 104);
  c.fillRect(L, ty + 132, R - L, 4);
  c.textAlign = "left"; c.fillStyle = "#7a5a4c"; c.font = '700 26px "Courier Prime"'; c.fillText(fitText(c, $("t-seance").textContent, R - L), L, ty + 180);
  c.fillStyle = "#2a1a14"; c.font = '700 30px "Figtree"';
  c.fillText(state.r.length + " rangées   " + state.p.length + " plateformes   " + state.c.length + " collections", L, ty + 232);
  c.fillStyle = "#7a5a4c"; c.font = '800 22px "Figtree"'; c.fillText("AU PROGRAMME", L, ty + 292);
  const names = state.r.map((id) => { const r = rowInfo(id); return r ? (state.o[id] || r.now || r.name) : null; }).filter(Boolean);
  c.fillStyle = "#2a1a14"; c.font = '600 30px "Figtree"';
  names.slice(0, 8).forEach((n, i) => c.fillText(fitText(c, (i + 1) + ".  " + n, R - L), L, ty + 342 + i * 46));
  if (names.length > 8) { c.fillStyle = "#7a5a4c"; c.fillText("… et " + (names.length - 8) + " autres", L, ty + 342 + 8 * 46); }
  // QR code : la même programmation, en un scan
  const qy = ty + th - 250;
  if (qr) {
    const n = qr.getModuleCount(), size = 200, cell = size / (n + 4);
    c.fillStyle = "#fff"; c.fillRect(L, qy, size, size); c.fillStyle = "#2a1a14";
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) c.fillRect(L + (k + 2) * cell, qy + (r + 2) * cell, Math.ceil(cell), Math.ceil(cell));
  }
  c.fillStyle = "#2a1a14"; c.font = 'italic 400 38px "Instrument Serif"';
  const tl = qr ? L + 230 : L;
  ["Scanne-moi pour avoir", "la même programmation", "dans Nuvio."].forEach((line, i) => c.fillText(line, tl, qy + 70 + i * 46));
  c.textAlign = "center"; c.fillStyle = "#b9a59c"; c.font = 'italic 400 30px "Instrument Serif"';
  c.fillText("Une séance préparée sur " + D.origin.replace(/^https?:[/][/]/, ""), W / 2, H - 40);
}
$("img-btn").addEventListener("click", async (e) => {
  const btn = e.currentTarget, label = btn.textContent;
  btn.textContent = "Impression du billet…"; btn.disabled = true;
  try {
    await Promise.all(['400 90px "Bebas Neue"', '700 28px "Courier Prime"', '700 30px "Figtree"', '800 22px "Figtree"', '600 30px "Figtree"', 'italic 400 38px "Instrument Serif"'].map((f) => document.fonts.load(f)));
    let qr = null;
    try { const qrcode = await loadQr(); qr = qrcode(0, "M"); qr.addData(shareUrl); qr.make(); } catch (err) { qr = null; }
    const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1350;
    drawTicket(cv.getContext("2d"), qr);
    const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
    const file = new File([blob], "billet-nuvio.png", { type: "image/png" });
    if (matchMedia("(pointer: coarse)").matches && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: state.n });
    else { const a = el("a", { href: URL.createObjectURL(blob), download: "billet-nuvio.png" }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
    btn.textContent = "Billet imprimé ✓"; popcorn(btn); if (window.sfx) sfx.punch();
  } catch (err) { btn.textContent = "Impression impossible"; toast("Impression du billet impossible : réessaie, ou fais une capture d'écran.", true); }
  btn.disabled = false;
  setTimeout(() => { btn.textContent = label; }, 2000);
});
const tk = $("ticket");
if (matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  tk.addEventListener("pointermove", (e) => {
    const r = tk.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    tk.classList.add("tilting");
    tk.style.setProperty("--rx", ((.5 - y) * 7).toFixed(2) + "deg");
    tk.style.setProperty("--ry", ((x - .5) * 9).toFixed(2) + "deg");
    tk.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
  });
  tk.addEventListener("pointerleave", () => { tk.classList.remove("tilting"); tk.style.setProperty("--rx", "0deg"); tk.style.setProperty("--ry", "0deg"); });
}

renderAll();

// L'écran et le billet suivent le défilement. S'ils sont trop hauts ensemble pour la fenêtre,
// seul l'écran suit (toujours en entier) et le billet attend en bas de la colonne.
const asideEl = document.querySelector("aside"), ticketEl = $("ticket"), captionEl = asideEl.querySelector(".caption");
function placeAside() {
  if (matchMedia("(max-width: 960px)").matches) { asideEl.classList.remove("long"); asideEl.style.top = ""; return; }
  const besoin = stageEl.offsetHeight + captionEl.offsetHeight + ticketEl.offsetHeight + 44 + 36;
  const long = besoin > innerHeight;
  asideEl.classList.toggle("long", long);
  asideEl.style.top = long ? "" : Math.min(18, innerHeight - asideEl.offsetHeight - 18) + "px";
  asideEl.style.setProperty("--stage-top", Math.min(18, innerHeight - stageEl.offsetHeight - 18) + "px");
}
addEventListener("resize", placeAside);
const asideRO = new ResizeObserver(placeAside); [asideEl, stageEl, ticketEl].forEach((el) => asideRO.observe(el)); placeAside();

// Sommaire : un clic amène la section juste sous le sommaire (qui reste collé en haut),
// et la section en cours s'allume : la dernière dont le haut a passé le sommaire.
const navLinks = [...document.querySelectorAll(".nav a")];
const navBar = document.querySelector(".nav");
const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href")));
let navLock = 0;
function lightNav(a) {
  navLinks.forEach((x) => x.classList.toggle("on", x === a));
  if (a) navBar.scrollTo({ left: a.offsetLeft - navBar.clientWidth / 2 + a.offsetWidth / 2, behavior: "smooth" });
}
function navOffset() { return navBar.getBoundingClientRect().height + 24; }
navLinks.forEach((a, i) => a.addEventListener("click", (e) => {
  e.preventDefault();
  const y = sections[i].getBoundingClientRect().top + scrollY - navOffset();
  scrollTo({ top: Math.max(0, y), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  lightNav(a); navLock = Date.now() + 1200;
  sections[i].setAttribute("tabindex", "-1"); sections[i].focus({ preventScroll: true });
}));
let navTick = false;
function spyNav() {
  navTick = false;
  if (Date.now() < navLock) return;
  const line = navOffset() + 40;
  // Sections masquées (dans le guide : #s-mode) ignorées, sinon leur lien invisible s'allumerait.
  const visible = (sec) => sec && sec.getClientRects().length > 0;
  let cur = 0;
  sections.forEach((sec, i) => { if (visible(sec) && sec.getBoundingClientRect().top <= line) cur = i; });
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) {
    for (let i = sections.length - 1; i >= 0; i--) if (visible(sections[i])) { cur = i; break; }
  }
  if (!navLinks[cur].classList.contains("on")) lightNav(navLinks[cur]);
}
addEventListener("scroll", () => { if (!navTick) { navTick = true; requestAnimationFrame(spyNav); } }, { passive: true });
spyNav();
{ const i = navLinks.findIndex((a) => a.getAttribute("href") === hashDepart); if (i >= 0) setTimeout(() => navLinks[i].click(), 500); }
${copy ? HOTE_JS : ""}
</script>
${scripts("scene.js")}
</body>
</html>`;
}
