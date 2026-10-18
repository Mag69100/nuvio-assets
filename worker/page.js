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
  "accueil-top10": "Les films dont tout le monde parle cette semaine",
  "accueil-tendances-series": "Les séries dont tout le monde parle cette semaine",
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
};

/** Affiches PostersPlus conseillées pour l'aperçu, SANS clé : « TA_CLE_TMDB » est remplacé dans
 *  le navigateur par la clé que la personne tape (gardée sur son appareil, comme dans le guide). */
const PP_URL = "https://postersplus.stremio.ru/poster?tmdb_id={tmdb_id?}&imdb_id={imdb_id?}&stremio_id={id}&type={type}&shape={shape}&pc=stremio_tv_nuvio&tmdb_key=TA_CLE_TMDB&tg=low&bgr=low&vpcb=1&sm=notch&_bgr=low&_sm=sash&bp=top_left&_ip=bottom_right&_soo10=1&_rs=bullet_star&_gs=1&_bst=gold&_rb=1&_rbl=imdb&_cl=off&fti=1&irs=dataset&trs=direct&rdm=2&nsyo=0.93&soo10=1&rb=imdb&rbs=normalized&mw=lb:.01,tk:.01,im:.97,tm:.01&tw=tk:.01,im:.97,tm:.02&ll=fr-fr&fbs=photoreal&lba=1&cgsia=1&rsco=1&hur=1&mo=genre,year,rating&_mo=&ol=fr&stc=FFFFFF&sbs=gold&sbsw=1.40&sbsh=1.20&sbpo=auto_hug&bdm=7&bg1=tr:4:res&bms=3&_bdm=7&_bg1=chip:4:res:30&qad=1&wfq=1&gnq=1";

/** Couleur d'accent de chaque plateforme (pastille et tuile de l'aperçu). */
const PROVIDER_COLORS = {
  8: "#e50914", 119: "#1a98ff", 337: "#1b3f9c", 531: "#0064ff",
  1899: "#7b2cff", 350: "#d9d9de", 381: "#111111", 283: "#f47521",
};

import { STAGE_HEAD, STAGE_CSS, stageTop, secretsHTML, BEAM_HTML, SEATS_HTML, CREDITS_HTML, STAGE_JS } from "./stage.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function configurePage({ origin, cfg, rows, discover, providers, collections, defaults, regions, genres, languages, sorts, seasons, maxCustom, season }) {
  const plain = (c) => ({ n: c.n, r: c.r, p: c.p, d: c.d, c: c.c, o: c.o, x: c.x, g: c.g, e: c.e, m: c.m, a: c.a, f: c.f, h: c.h, t: c.t });
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
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(cfg.n)} · Ta programmation</title>
<meta name="description" content="Compose ton accueil Nuvio en français : rangées, plateformes, collections, filtres.">
<meta property="og:title" content="Compose ta programmation Nuvio">
<meta property="og:image" content="${LOGO}">
<link rel="icon" href="${LOGO}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@400;500;700;800&family=Courier+Prime:wght@400;700&family=Instrument+Serif:ital@0;1&family=Limelight&family=Pacifico&family=Orbitron:wght@500;700&display=swap">
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
  body:has(:is(input[type=text], input[type=number], input[type=search], select):focus) .dock { display: none; }
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
.field > span { font: 700 .72rem var(--body); letter-spacing: .2em; text-transform: uppercase; color: var(--dim); }
.field input[type=text].plain, select, input[type=number] { font: 600 1rem var(--body); letter-spacing: 0; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--seat); background: var(--velvet); color: var(--cream); }
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
.screen { position: relative; aspect-ratio: 16 / 10.5; border-radius: 8px; overflow: hidden; background: linear-gradient(180deg, #13101a, #0b0910); container-type: inline-size; }
.screen::after { content: ""; position: absolute; inset: 0; z-index: 4; pointer-events: none; background: linear-gradient(115deg, rgba(255,255,255,.07), transparent 40%); }
.tv-foot { height: 10px; width: 34%; margin: 8px auto 0; border-radius: 0 0 10px 10px; background: #1c1116; }
.nv { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; padding-bottom: 4cqw; scroll-behavior: smooth; }
.nv::-webkit-scrollbar { display: none; }
.nv-hero { position: relative; height: 31cqw; overflow: hidden; display: flex; align-items: flex-end; padding: 0 3cqw 3cqw; }
.nv-bg { position: absolute; inset: 0; background: #000 center 25% / cover no-repeat; animation: kb 14s ease-out both, fade-in .9s ease both; }
.nv-bg.out { animation: fade-out .9s ease forwards; }
.nv-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,6,12,.94), rgba(8,6,12,.35) 60%, transparent), linear-gradient(transparent 45%, #0f0c14); }
@keyframes kb { from { transform: scale(1.12); } to { transform: scale(1); } }
@keyframes fade-in { from { opacity: 0; } }
@keyframes fade-out { to { opacity: 0; } }
.nv-info { position: relative; z-index: 1; max-width: 62%; display: grid; gap: .9cqw; justify-items: start; animation: rise .5s ease both; }
.nv-info b { font: 400 5.4cqw/.95 var(--display); letter-spacing: .02em; color: #fff; }
.nv-info span { font: 600 1.8cqw/1.3 var(--body); color: #d9d4e6; }
.nv-info p { margin: 0; font: 400 1.7cqw/1.4 var(--body); color: #bdb6cc; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.nv-btns { display: flex; gap: 1cqw; }
.nv-btns i { font: normal 800 1.6cqw var(--body); background: rgba(255,255,255,.18); color: #fff; padding: .7cqw 1.7cqw; border-radius: .7cqw; }
.nv-btns i:first-child { background: #fff; color: #111; }
.nv-dots { position: absolute; right: 3cqw; bottom: 3.4cqw; z-index: 1; display: flex; gap: .7cqw; }
.nv-dots i { width: 1cqw; height: 1cqw; border-radius: 1cqw; background: rgba(255,255,255,.3); transition: width .4s ease, background .4s ease; }
.nv-dots i.on { width: 3cqw; background: #fff; }
.nv-label { margin: 2cqw 3cqw .2cqw; font: 700 2.2cqw/1.2 var(--body); color: #e8e2ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nv-row, .nv-coll { animation: rise .45s ease both; }
.nv-track { position: relative; display: flex; gap: 1.4cqw; overflow-x: auto; scrollbar-width: none; padding: 1.3cqw 3cqw; scroll-behavior: smooth; }
.nv-track::-webkit-scrollbar { display: none; }
.nv-track { cursor: grab; }
.nv-track.drag, .nv.drag { cursor: grabbing; scroll-behavior: auto; user-select: none; }
.nv-track.drag .nv-card, .nv-track.drag .nv-tile { cursor: grabbing; }
.nv-card, .nv-tile { flex: none; position: relative; padding: 0; border: 0; cursor: pointer; overflow: hidden; color: #fff; border-radius: 1.2cqw;
  background: var(--ph) center / cover no-repeat; transition: transform .25s cubic-bezier(.3,1.4,.5,1), box-shadow .25s ease; }
.nv-card { width: 12cqw; aspect-ratio: 2 / 3; }
.nv.paysage .nv-card { width: 24cqw; aspect-ratio: 16 / 9; }
.nv-tile { width: 18cqw; aspect-ratio: 16 / 9; display: grid; place-items: center; padding: .5cqw; text-align: center; font: 400 2cqw/1.05 var(--display); letter-spacing: .04em; }
.nv-tile.img { color: transparent; background-color: #fff; }
.nv-card:hover, .nv-card:focus-visible, .nv-tile:hover, .nv-tile:focus-visible { transform: scale(1.08); z-index: 1; outline: none; box-shadow: 0 0 0 .45cqw #fff, 0 1.5cqw 3cqw rgba(0,0,0,.6); }
.nv-card.img { animation: fade-in .45s ease both; }
.nv-t { position: absolute; left: 0; right: 0; bottom: 0; display: none; padding: 3cqw 1.2cqw 1cqw; text-align: left; font: 400 2.3cqw/1 var(--display); letter-spacing: .03em; background: linear-gradient(transparent, rgba(0,0,0,.88)); }
.nv.paysage .nv-card.img .nv-t { display: block; }
.nv.pp .nv-card .nv-t { display: none !important; }
.pp-key { display: grid; gap: 8px; margin-top: 12px; padding: 14px; border-radius: 12px; border: 1px dashed rgba(255,207,107,.45); background: rgba(255,207,107,.05); }
.pp-key label { display: grid; gap: 6px; font-weight: 700; font-size: .88rem; }
.pp-key .row { display: flex; gap: 8px; }
.pp-key input { flex: 1; min-width: 0; font: 600 .95rem var(--type); padding: 9px 11px; border-radius: 8px; border: 1px solid var(--seat); background: var(--velvet); color: var(--cream); }
.pp-key small { color: var(--dim); font-size: .8rem; line-height: 1.4; }
.pp-key .err { color: #ff9c95; }
.pp-key .paste { justify-self: start; border-color: rgba(255,207,107,.5); color: var(--bulb); }
/* Une seule animation par rangée (pas une par carte) : 5 rangées en attente = 5 animations, pas 70. */
.nv-row.loading .nv-track { animation: shimmer 1.2s ease-in-out infinite; }
@keyframes shimmer { 50% { opacity: .55; } }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } }
.nv-empty { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; color: #8d86a0; font-size: 2.8cqw; }
/* Comme dans Nuvio : l'accueil et la bibliothèque sont deux écrans séparés. */
.nv-onglets { position: absolute; top: 2.4cqw; right: 2.4cqw; z-index: 2; display: flex; gap: .8cqw; padding: .6cqw; border-radius: 99px; background: rgba(10,8,14,.6); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.nv-onglets button { font: 800 max(1.7cqw, 10px) var(--body); padding: .7cqw 1.8cqw; border: 0; border-radius: 99px; background: transparent; color: #cfc8dc; cursor: pointer; }
.nv-onglets button[aria-pressed="true"] { background: #fff; color: #111; }
.nv-biblio { position: absolute; inset: 0; z-index: 1; overflow-y: auto; scrollbar-width: none; padding: 9cqw 3cqw 4cqw; background: linear-gradient(180deg, #13101a, #0b0910); animation: fade-in .3s ease both; }
.nv-biblio::-webkit-scrollbar { display: none; }
.nv-biblio h3 { margin: 0 0 2cqw; font: 400 5cqw/1 var(--display); letter-spacing: .02em; color: #fff; }
.nv-biblio .grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(12cqw, 1fr)); gap: 1.6cqw; }
.nv-biblio .nv-card { width: auto; }
.nv-biblio .vide { margin: 6cqw auto 0; max-width: 46ch; text-align: center; color: #8d86a0; font-size: max(2.2cqw, 11px); line-height: 1.5; }
/* La fiche d'un film, ouverte par-dessus l'accueil */
.fiche { position: absolute; inset: 0; z-index: 2; overflow: hidden; background: #0b0910; animation: fiche-in .35s cubic-bezier(.2,.9,.3,1) both; }
.fiche.closing { animation: fiche-out .24s ease forwards; }
@keyframes fiche-in { from { opacity: 0; transform: scale(1.04); } }
@keyframes fiche-out { to { opacity: 0; transform: scale(1.03); } }
.f-bg { position: absolute; inset: 0; background: center 20% / cover no-repeat; animation: kb 16s ease-out both; }
.f-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,6,12,.96) 30%, rgba(8,6,12,.55) 65%, rgba(8,6,12,.2)), linear-gradient(transparent 60%, #0b0910); }
.f-body { position: relative; height: 100%; display: grid; grid-template-columns: 22cqw minmax(0, 1fr); gap: 3.5cqw; align-items: center; padding: 4cqw 7cqw 4cqw 5cqw; }
.f-poster { aspect-ratio: 2 / 3; border-radius: 1.2cqw; background: #221a2b center / cover no-repeat; box-shadow: 0 2cqw 4cqw rgba(0,0,0,.6); animation: rise .5s .1s ease both; }
.fiche.tile .f-body { grid-template-columns: 34cqw minmax(0, 1fr); }
.fiche.tile .f-poster { aspect-ratio: 16 / 9; background-color: #fff; }
.f-info { display: grid; gap: 1.3cqw; justify-items: start; animation: rise .5s .16s ease both; }
.f-info b { font: 400 6cqw/.95 var(--display); letter-spacing: .02em; color: #fff; }
.f-meta { font: 700 1.8cqw/1.3 var(--body); color: #e0d9ee; }
.nv-info p, .f-desc { white-space: pre-line; }
.nv-info p.a-dispo { -webkit-line-clamp: 3; }
.a-dispo::first-line { color: #f3c969; font-weight: 700; }
.f-desc { margin: 0; font: 400 1.9cqw/1.45 var(--body); color: #c9c1d6; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }
.f-btns { display: flex; gap: 1.2cqw; flex-wrap: wrap; }
.f-btns i { font: normal 800 max(1.8cqw, 11px) var(--body); padding: .9cqw 2cqw; border-radius: .8cqw; background: rgba(255,255,255,.16); color: #fff; }
.f-btns i:first-child { background: #fff; color: #111; }
.f-close { position: absolute; top: 2.5cqw; right: 2.5cqw; z-index: 1; width: max(5cqw, 28px); height: max(5cqw, 28px); border-radius: 50%; border: 0; cursor: pointer;
  background: rgba(255,255,255,.15); color: #fff; font: 700 max(2.8cqw, 15px)/1 var(--body); }
.f-close:hover, .f-close:focus-visible { background: #fff; color: #111; outline: none; }
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
/* Boutons qui marchent vraiment dans la fiche (bande-annonce, autre idée…) */
.f-act { font: 800 max(1.8cqw, 11px) var(--body); padding: .9cqw 2cqw; border-radius: .8cqw; border: 0; cursor: pointer; background: rgba(255,255,255,.16); color: #fff; transition: background .2s ease, transform .2s ease; }
.f-act:hover, .f-act:focus-visible { background: #fff; color: #111; outline: none; transform: scale(1.05); }
.f-act:disabled { opacity: .5; cursor: default; transform: none; background: rgba(255,255,255,.1); color: #fff; }
.f-video { position: absolute; inset: 0; z-index: 3; background: #000; animation: fade-in .3s ease both; }
/* Amorce de film (5, 4, 3, 2, 1) avant chaque bande-annonce */
.amorce { position: absolute; inset: 0; z-index: 4; display: grid; place-items: center; background: radial-gradient(ellipse at 50% 50%, #2a2622, #0d0b0a 70%); animation: fade-in .2s ease both; }
.a-cercle { position: relative; isolation: isolate; width: 30cqw; aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center;
  background: radial-gradient(circle, transparent 0 62%, #d8cfbf 63% 64.5%, transparent 65.5% 76%, rgba(216,207,191,.6) 77% 78%, transparent 79%),
    linear-gradient(#d8cfbf, #d8cfbf) center / max(.3cqw, 1px) 100% no-repeat, linear-gradient(#d8cfbf, #d8cfbf) center / 100% max(.3cqw, 1px) no-repeat; }
.a-cercle::before { content: ""; position: absolute; inset: 0; z-index: -1; border-radius: 50%; background: conic-gradient(rgba(216,207,191,.35) var(--sweep), transparent 0); }
.a-cercle.tourne::before { animation: amorce-sweep .45s linear; }
@keyframes amorce-sweep { from { --sweep: 0deg; } to { --sweep: 360deg; } }
.a-cercle b { font: 400 16cqw/1 var(--display); color: #f2ead8; }
.f-video iframe, .nv-video iframe { width: 100%; height: 100%; border: 0; display: block; }
.f-video .f-close { z-index: 4; }
/* La une joue la bande-annonce en sourdine (grand écran) */
.nv-video { position: absolute; left: 0; right: 0; top: 50%; height: 56.25cqw; transform: translateY(-50%); opacity: 0; transition: opacity 1.2s ease; pointer-events: none; }
.nv-video.on { opacity: 1; }
/* La colonne collante crée sa propre pile d'affichage : on la passe devant tout quand l'écran est en grand. */
.ecran-grand aside { z-index: 66; }
/* L'écran en grand, par-dessus la page */
.stage.big { position: fixed; inset: 0; z-index: 65; display: grid; place-content: center; justify-items: center; padding: 24px; background: rgba(5,3,4,.92); }
.stage.big .tv { width: min(1100px, calc(100vw - 48px), calc((100vh - 230px) * 1.45)); max-width: none; }
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

${STAGE_CSS}
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
  .nv-onglets button { font-size: 12px; padding: 7px 12px; }
  .rename input, .pp-key input, .field input[type=text].plain, select, input[type=number] { font-size: 16px; }
  .act { scroll-margin-top: 76px; }
}
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
        <a href="#s-plateformes">Plateformes</a><a href="#s-filtres">Filtres</a><a href="#s-decouvrir">Découvrir</a><a href="#s-collections">Collections</a><a href="#s-mode">Installer</a>
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
      </section>

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
        <div class="tv"><div class="screen" id="screen" role="region" aria-label="Aperçu interactif de ton accueil Nuvio">
          <div class="nv" id="nv"></div>
          <div class="nv-biblio" id="nv-biblio" hidden><h3>Bibliothèque</h3><div class="grille" id="nv-biblio-grille"></div><p class="vide" id="nv-biblio-vide">Ta bibliothèque est vide. Ouvre la fiche d'un film et choisis « Ajouter à la bibliothèque ».</p></div>
          <div class="nv-onglets" role="group" aria-label="Écran de Nuvio"><button type="button" data-vue="accueil" aria-pressed="true">Accueil</button><button type="button" data-vue="biblio" aria-pressed="false">Bibliothèque</button></div>
          <div class="fiche" id="fiche" role="dialog" hidden></div>
        </div></div>
        <div class="tv-foot"></div>
        <div class="screen-tools">
          <div class="seg" id="fmt" role="group" aria-label="Format des affiches"></div>
          <button type="button" class="mini" id="pp-btn" aria-pressed="false">Affiches PostersPlus</button>
        </div>
        <form class="pp-key" id="pp-key" hidden>
          <label for="pp-input">Ta clé TMDB, pour les affiches PostersPlus
            <span class="row"><input id="pp-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="32 lettres et chiffres"><button type="submit" class="mini ok">Valider</button></span>
          </label>
          <button type="button" class="mini paste" id="pp-paste" hidden>Coller ma clé</button>
          <small id="pp-note">Elle reste sur ton appareil : elle sert seulement à demander les affiches à PostersPlus. C'est la même que dans le guide : pas encore de clé ? <a href="${origin}/guide#comptes" target="_blank" rel="noopener">l'étape 5 explique comment l'avoir</a> (gratuit).</small>
        </form>
        <div class="screen-fun">
          <button type="button" class="mini" id="zoom" aria-pressed="false">Agrandir l'écran</button>
        </div>
        <button type="button" class="btn big-close" id="big-close">Fermer le grand écran</button>
      </div>
      </div>
      <p class="caption"><span class="souris">Clique sur une affiche pour ouvrir sa fiche, ou navigue avec les flèches comme à la télécommande.</span><span class="doigt">Touche une affiche pour ouvrir sa fiche, fais glisser les rangées du doigt.</span></p>

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

<script>
const D = ${json};
const PP = ${JSON.stringify(PP_URL)};
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

// ---------- aperçu ----------
// Collections dans l'ordre du fichier (l'ordre de D.collections sert aux positions dans le lien).
const byPos = (list) => [...list].sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99));
function hue(str) { let h = 0; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
// Aperçu réel : on interroge l'addon lui-même (même adresse, mêmes réglages) pour
// afficher les vraies affiches. Résultats gardés en mémoire pour ne rien redemander.
const metaCache = new Map();
function fetchRow(url) {
  if (!metaCache.has(url)) metaCache.set(url, fetch(url).then(r => r.ok ? r.json() : { metas: [] }).then(d => d.metas || []).catch(() => []));
  return metaCache.get(url);
}
let currentBase = D.origin, screenTimer = 0, screenToken = 0, lastZap = 0;
let configureUrl = D.origin + "/configure"; // adresse de cette page avec les réglages en cours
// L'écran grésille à chaque changement (pas plus de deux fois par seconde).
function zap(sc) {
  const now = Date.now(); if (now - lastZap < 450) return; lastZap = now;
  sc.classList.remove("zap"); void sc.offsetWidth; sc.classList.add("zap");
}
function rowType(id) {
  if (id.startsWith("perso-")) { const x = state.x[Number(id.slice(6))]; return x && x.t === 1 ? "series" : "movie"; }
  const r = D.rows.find(r => r.id === id); return r ? r.type : "movie";
}
// Format des affiches de l'aperçu (le réglage « Affiches paysage » de Nuvio). Les collections restent en paysage.
let fmt = "p";
try { fmt = localStorage.getItem("apercu-format") === "l" ? "l" : "p"; } catch (e) {}
let heroList = [], heroIdx = 0, heroTimer = 0, heroHold = 0, hoverT = 0, ficheFrom = null;
const calmMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
// Fonds envoyés en w1920 (ou original, w1280 selon la version de l'addon) : on demande la taille utile.
const imgW = (u, w) => (u || "").replace(/[/](original|w1920|w1280)[/]/, "/" + w + "/");
const cssUrl = (u) => "url('" + u.replace(/'/g, "%27") + "')";
// Film pas encore regardable : l'addon met « 📅 Dispo le… » en tête du résumé ; comme sur la TV,
// la ligne du dessous ne garde alors que l'année.
const aDispo = (m) => String(m.description || "").indexOf("📅") === 0;
const metaLine = (m) => [aDispo(m) ? String(m.releaseInfo || "").split(" · ")[0] : m.releaseInfo, (m.genres || []).slice(0, 2).join(", "), m.imdbRating ? "★ " + m.imdbRating : ""].filter(Boolean).join("  ·  ");

// Bandes-annonces (YouTube, via l'addon : en français si elle existe, sinon en VO).
const trailerCache = new Map();
function trailerKey(m) {
  if (!m || !m.id) return Promise.resolve(null);
  const url = D.origin + "/trailer/" + (m.type === "series" ? "series" : "movie") + "/" + encodeURIComponent(m.id) + ".json";
  if (!trailerCache.has(url)) trailerCache.set(url, fetch(url).then(r => r.ok ? r.json() : {}).then(d => (d && /^[A-Za-z0-9_-]{6,20}$/.test(d.key || "")) ? d.key : null).catch(() => null));
  return trailerCache.get(url);
}
function ytFrame(key, muted) {
  const q = "autoplay=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3" + (muted ? "&mute=1&controls=0&loop=1&disablekb=1&playlist=" + key : "");
  return el("iframe", { src: "https://www.youtube-nocookie.com/embed/" + key + "?" + q, title: "Bande-annonce", allow: "autoplay; encrypted-media; picture-in-picture", allowfullscreen: "", tabindex: muted ? "-1" : null });
}
let heroVideoT = 0;
// En grand écran, la une lance la bande-annonce en sourdine si on reste dessus.
function heroVideo(hero, m) {
  clearTimeout(heroVideoT);
  hero.querySelectorAll(".nv-video").forEach((v) => v.remove());
  if (!document.getElementById("stage").classList.contains("big") || calmMotion()) return;
  heroVideoT = setTimeout(() => trailerKey(m).then((key) => {
    if (!key || !hero.isConnected || hero._m !== m) return;
    const v = el("div", { class: "nv-video" }, ytFrame(key, true));
    hero.insertBefore(v, hero.querySelector(".nv-shade"));
    v.querySelector("iframe").addEventListener("load", () => setTimeout(() => v.classList.add("on"), 1200));
    heroHold = Date.now() + 60000;
  }), 2500);
}

function setHero(m, fromUser) {
  const hero = $("nv").querySelector(".nv-hero"); if (!hero || !m) return;
  const src = imgW(m.background || m.poster, "w780");
  const olds = [...hero.querySelectorAll(".nv-bg:not(.out)")];
  if (!olds.length || olds[olds.length - 1].dataset.src !== src) {
    const bg = el("div", { class: "nv-bg", "data-src": src });
    if (src) bg.style.backgroundImage = cssUrl(src);
    hero.insertBefore(bg, hero.querySelector(".nv-shade"));
    olds.forEach((b) => { b.classList.add("out"); setTimeout(() => b.remove(), 950); });
    $("glow").style.backgroundImage = src ? cssUrl(src) : "";
  }
  const info = el("div", { class: "nv-info" }, el("b", { text: m.name }), el("span", { text: metaLine(m) }), el("p", { class: aDispo(m) ? "a-dispo" : "", text: m.description || "" }),
    el("div", { class: "nv-btns" }, el("i", { text: "▶ Lecture" }), el("i", { text: "Plus d'infos" })));
  hero.querySelector(".nv-info").replaceWith(info);
  hero.querySelectorAll(".nv-dots i").forEach((d, k) => d.classList.toggle("on", heroList[k] === m));
  if (fromUser) heroHold = Date.now() + 9000;
  if (hero._m !== m) { hero._m = m; heroVideo(hero, m); }
}
// La une défile toute seule, sauf quand on regarde une affiche.
function startHero() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    if (heroList.length < 2 || Date.now() < heroHold || document.hidden || !$("fiche").hidden || calmMotion()) return;
    heroIdx = (heroIdx + 1) % heroList.length; setHero(heroList[heroIdx]);
  }, 6000);
}
// Affiches PostersPlus (avec badges) : demandent la clé TMDB de la personne.
let ppOn = false;
try { ppOn = localStorage.getItem("apercu-pp") === "1"; } catch (e) {}
const tmdbKey = () => { try { return (localStorage.getItem("tmdb-key") || "").trim(); } catch (e) { return ""; } };
function ppSrc(m, shape) {
  const key = tmdbKey(); if (!ppOn || !key || !m || !m.id) return "";
  const id = String(m.id);
  const vals = { "{tmdb_id?}": id.startsWith("tmdb:") ? id.slice(5) : "", "{imdb_id?}": m.imdb_id || (id.startsWith("tt") ? id : ""), "{id}": id, "{type}": m.type || "movie", "{shape}": shape };
  let u = PP.replace("TA_CLE_TMDB", encodeURIComponent(key));
  for (const [k, v] of Object.entries(vals)) u = u.split(k).join(encodeURIComponent(v));
  return u;
}
function paintCard(b) {
  const m = b._m; if (!m) return;
  const plain = fmt === "l" ? imgW(m.background || m.poster, "w300") : m.poster;
  const pp = ppSrc(m, fmt === "l" ? "landscape" : "poster");
  b.classList.remove("img"); b.style.backgroundImage = "";
  const show = (src, fallback) => {
    if (!src) return;
    const im = new Image();
    im.onload = () => { if (b.isConnected && b._m === m) { b.style.backgroundImage = cssUrl(src); b.classList.add("img"); } };
    if (fallback) im.onerror = () => show(fallback);
    im.src = src;
  };
  show(pp || plain, pp ? plain : null);
}
function fillCard(b, m) {
  b._m = m; b.setAttribute("aria-label", m.name);
  b.append(el("span", { class: "nv-t", text: m.name }));
  paintCard(b);
}
function renderScreen() {
  const sc = $("screen"), nv = $("nv"); zap(sc);
  const keep = nv.scrollTop;
  nv.textContent = ""; nv.classList.toggle("paysage", fmt === "l"); closeFiche(true);
  const token = ++screenToken; heroList = []; heroIdx = 0;
  const hero = el("div", { class: "nv-hero" }, el("div", { class: "nv-shade" }), el("div", { class: "nv-info" }, el("b", { text: "…" })), el("div", { class: "nv-dots" }));
  nv.append(hero);
  // Comme dans Nuvio : Plateformes (épinglée) en haut, puis les rangées, puis les autres collections.
  const drawCollection = (c) => {
    const hidden = new Set(state.t[c.id] || []);
    let items = c.folders.map((f) => ({ f, i: f.i })).filter(({ i }) => !hidden.has(i));
    if (c.id === "plateformes-streaming") items = items.filter(({ f }) => { const p = D.providers.find(p => p.name === f.title); return !p || state.p.includes(p.id); });
    if (!items.length) return;
    const box = el("div", { class: "nv-track" });
    items.forEach(({ f }, k) => {
      const t = el("button", { type: "button", class: "nv-tile", tabindex: "-1", "aria-label": f.title, text: f.title });
      t._tile = { title: f.title, cover: f.cover, coll: c.name };
      t.style.setProperty("--ph", "linear-gradient(135deg, hsl(" + ((hue(c.id) + k * 28) % 360) + " 45% 34%), hsl(" + ((hue(c.id) + k * 28 + 50) % 360) + " 55% 16%))");
      if (f.cover) { const img = new Image(); img.onload = () => { if (token !== screenToken) return; t.style.backgroundImage = cssUrl(f.cover); t.classList.add("img"); }; img.src = f.cover; }
      box.append(t);
    });
    nv.append(el("section", { class: "nv-coll", "aria-label": c.name }, el("div", { class: "nv-label", text: c.name }), box));
  };
  const chosen = byPos(D.collections).filter(c => state.c.includes(c.id));
  chosen.filter(c => c.id === "plateformes-streaming").forEach(drawCollection);
  const visible = state.r.filter(id => id !== "accueil-nouveautes-plateformes" || state.p.length);
  const rowEls = [];
  visible.forEach((id, i) => {
    const r = rowInfo(id); if (!r) return;
    const label = state.o[id] || r.now || r.name;
    const row = el("section", { class: "nv-row loading", "aria-label": label });
    row.style.animationDelay = (i * 40) + "ms";
    const tr = el("div", { class: "nv-track" });
    const h = hue(id + (state.o[id] || ""));
    for (let k = 0; k < 14; k++) {
      const b = el("button", { type: "button", class: "nv-card", tabindex: "-1", "aria-label": "Chargement" });
      b.style.setProperty("--ph", "linear-gradient(160deg, hsl(" + ((h + k * 23) % 360) + " 30% 26%), hsl(" + ((h + k * 23 + 40) % 360) + " 35% 12%))");
      tr.append(b);
    }
    row.append(el("div", { class: "nv-label", text: label }), tr); nv.append(row);
    rowEls.push({ id, row, tr, first: !rowEls.length });
  });
  chosen.filter(c => c.id !== "plateformes-streaming").forEach(drawCollection);
  if (!visible.length) { hero.remove(); nv.append(el("p", { class: "nv-empty", text: "Écran noir : coche au moins une rangée." })); return; }
  const firstFocus = nv.querySelector(".nv-card, .nv-tile"); if (firstFocus) firstFocus.tabIndex = 0;
  nv.style.scrollBehavior = "auto"; nv.scrollTop = keep; nv.style.scrollBehavior = "";
  // Remplissage au fil du défilement (après une courte pause, pour ne pas interroger l'addon à chaque clic).
  const load = ({ id, row, tr, first }) => fetchRow(currentBase + "/catalog/" + rowType(id) + "/" + id + ".json").then(metas => {
    if (token !== screenToken) return;
    row.classList.remove("loading");
    if (!metas.length) return;
    [...tr.children].forEach((b, k) => { if (metas[k]) fillCard(b, metas[k]); else b.remove(); });
    if (first) {
      heroList = metas.filter(m => m.background).slice(0, 5);
      if (!heroList.length) heroList = metas.slice(0, 1);
      hero.querySelector(".nv-dots").replaceChildren(...heroList.map(() => el("i")));
      setHero(heroList[0]); startHero();
    }
  });
  clearTimeout(screenTimer);
  screenTimer = setTimeout(() => {
    if (token !== screenToken) return;
    const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); load(e.target._r); } }), { root: nv, rootMargin: "150px 0px" });
    rowEls.forEach((r) => { r.row._r = r; if (r.first) load(r); else io.observe(r.row); });
  }, 350);
}

// ---------- La bibliothèque : les films ajoutés depuis les fiches (gardés sur l'appareil) ----------
let maListe = [];
try { maListe = JSON.parse(localStorage.getItem("ma-liste") || "[]"); } catch (e) {}
const dansListe = (m) => maListe.some((x) => x.id === m.id);
function drawMaListe() {
  const grille = $("nv-biblio-grille"); grille.textContent = "";
  $("nv-biblio-vide").hidden = maListe.length > 0;
  maListe.forEach((m) => {
    const b = el("button", { type: "button", class: "nv-card" });
    b.style.setProperty("--ph", "linear-gradient(160deg, #3a2430, #1a0f16)");
    grille.append(b); fillCard(b, m);
  });
}
// Onglets Accueil / Bibliothèque de l'écran
function montrerVue(vue) {
  document.querySelectorAll(".nv-onglets button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vue === vue)));
  $("nv-biblio").hidden = vue !== "biblio";
  if (vue === "biblio") drawMaListe();
}
document.querySelectorAll(".nv-onglets button").forEach((b) => b.addEventListener("click", () => { montrerVue(b.dataset.vue); if (window.sfx) sfx.click(); }));
$("nv-biblio").addEventListener("click", (e) => { const b = e.target.closest(".nv-card"); if (b) openFiche(b); });
drawMaListe();
// Bibliothèque modifiée ailleurs (fiche d'un billet de collection) : on relit et on redessine.
addEventListener("ma-liste", () => { try { maListe = JSON.parse(localStorage.getItem("ma-liste") || "[]"); } catch (e) {} drawMaListe(); });
function toggleListe(m) {
  if (dansListe(m)) maListe = maListe.filter((x) => x.id !== m.id);
  else maListe.unshift({ id: m.id, type: m.type, name: m.name, poster: m.poster, background: m.background, description: m.description, releaseInfo: m.releaseInfo, genres: m.genres, imdbRating: m.imdbRating, imdb_id: m.imdb_id });
  maListe = maListe.slice(0, 50);
  try { localStorage.setItem("ma-liste", JSON.stringify(maListe)); } catch (e) {}
  drawMaListe();
}

// ---------- la fiche ----------
function openFiche(b, extra) {
  const f = $("fiche"), m = b._m, t = b._tile;
  if (!m && !t) return;
  ficheFrom = b; f.textContent = ""; f.classList.remove("closing");
  const trailerBtn = m ? el("button", { type: "button", class: "f-act", text: "Bande-annonce" }) : null;
  if (trailerBtn) trailerBtn.addEventListener("click", () => {
    trailerBtn.disabled = true;
    const keyP = trailerKey(m);
    // L'amorce : 5, 4, 3, 2, 1 avec le secteur qui balaie le cercle, pendant qu'on cherche la vidéo.
    const cercle = el("div", { class: "a-cercle" }, el("b", { text: "5" }));
    const amorce = el("div", { class: "amorce", role: "status", "aria-label": "La bande-annonce commence" }, cercle);
    f.append(amorce);
    const lancer = (key) => {
      if (!amorce.isConnected) return;
      amorce.remove(); trailerBtn.disabled = false;
      if (!key) { trailerBtn.textContent = "Pas de bande-annonce"; trailerBtn.disabled = true; trailerBtn.focus({ preventScroll: true }); return; }
      const back = el("button", { type: "button", class: "f-close", "aria-label": "Revenir à la fiche", text: "×" });
      const v = el("div", { class: "f-video" }, ytFrame(key, false), back);
      back.addEventListener("click", () => { v.remove(); trailerBtn.focus({ preventScroll: true }); });
      f.append(v); back.focus({ preventScroll: true });
    };
    let n = 5;
    const top = () => { cercle.querySelector("b").textContent = String(n); cercle.classList.remove("tourne"); void cercle.offsetWidth; cercle.classList.add("tourne"); if (window.sfx) sfx.tick(); };
    top();
    const iv = setInterval(() => {
      if (!amorce.isConnected) { clearInterval(iv); return; }
      n--; if (n > 0) top(); else { clearInterval(iv); keyP.then(lancer); }
    }, calmMotion() ? 100 : 480);
  });
  const listeBtn = m ? el("button", { type: "button", class: "f-act", text: dansListe(m) ? "Retirer de la bibliothèque" : "+ Ajouter à la bibliothèque" }) : null;
  if (listeBtn) listeBtn.addEventListener("click", () => {
    toggleListe(m);
    const dedans = dansListe(m);
    listeBtn.textContent = dedans ? "Retirer de la bibliothèque" : "+ Ajouter à la bibliothèque";
    if (window.sfx) sfx.click();
    if (dedans) { popcorn(listeBtn); toast("Ajouté à la bibliothèque : retrouve-le dans l'onglet « Bibliothèque » de l'écran."); }
    else toast("Retiré de la bibliothèque.");
  });
  f.classList.toggle("tile", !m);
  const bg = el("div", { class: "f-bg" });
  const bgSrc = m ? imgW(m.background || m.poster, "w780") : "";
  if (bgSrc) bg.style.backgroundImage = cssUrl(bgSrc);
  const poster = el("div", { class: "f-poster" });
  const ps = m ? (ppSrc(m, "poster") || m.poster) : t.cover;
  if (ps) poster.style.backgroundImage = cssUrl(ps);
  const info = m
    ? [el("b", { text: m.name }), el("span", { class: "f-meta", text: metaLine(m) }), el("p", { class: aDispo(m) ? "f-desc a-dispo" : "f-desc", text: m.description || "Pas encore de résumé en français pour ce titre." }),
       el("div", { class: "f-btns" }, el("i", { text: "▶ Lecture" }), trailerBtn, listeBtn),
       extra && extra.length ? el("div", { class: "f-btns" }, ...extra) : null]
    : [el("b", { text: t.title }), el("span", { class: "f-meta", text: "Collection " + t.coll }), el("p", { class: "f-desc", text: "Dans Nuvio, cette tuile ouvre le catalogue « " + t.title + " » en plein écran, avec ses filtres." }),
       el("div", { class: "f-btns" }, el("i", { text: "Ouvrir" }))];
  const close = el("button", { type: "button", class: "f-close", "aria-label": "Fermer la fiche", text: "×", onclick: () => closeFiche() });
  f.append(bg, el("div", { class: "f-shade" }), close, el("div", { class: "f-body" }, poster, el("div", { class: "f-info" }, ...info.filter(Boolean))));
  f.setAttribute("aria-label", m ? m.name : t.title);
  f.hidden = false; close.focus({ preventScroll: true });
  if (window.sfx) sfx.click();
}
function closeFiche(now) {
  const f = $("fiche"); if (f.hidden) return;
  const done = () => { f.hidden = true; f.classList.remove("closing"); };
  if (now || calmMotion()) done(); else { f.classList.add("closing"); setTimeout(done, 230); }
  if (!now && ficheFrom && ficheFrom.isConnected) ficheFrom.focus({ preventScroll: true });
}
$("fiche").addEventListener("keydown", (e) => {
  if (e.key === "Escape" || e.key === "Backspace") {
    e.preventDefault(); e.stopPropagation();
    const v = $("fiche").querySelector(".f-video");
    if (v) v.querySelector(".f-close").click(); else closeFiche();
  }
  // La touche Tab reste dans la fiche (ou dans la vidéo si elle est ouverte).
  if (e.key === "Tab") {
    const scope = $("fiche").querySelector(".f-video") || $("fiche");
    const items = [...scope.querySelectorAll("button:not(:disabled)")].filter((x) => scope === $("fiche") ? !x.closest(".f-video") : true);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    e.preventDefault(); items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
  }
});

// ---------- navigation dans l'écran : souris, clavier (flèches), toucher ----------
const nvEl = $("nv");
function reveal(b) {
  const tr = b.parentElement, pad = tr.clientWidth * .03;
  if (b.offsetLeft - pad < tr.scrollLeft) tr.scrollTo({ left: b.offsetLeft - pad });
  else if (b.offsetLeft + b.offsetWidth + pad > tr.scrollLeft + tr.clientWidth) tr.scrollTo({ left: b.offsetLeft + b.offsetWidth + pad - tr.clientWidth });
  const sect = tr.parentElement, tracks = nvEl.querySelectorAll(".nv-track");
  nvEl.scrollTo({ top: tracks[0] === tr ? 0 : Math.max(0, sect.offsetTop - nvEl.clientHeight * .28) });
}
nvEl.addEventListener("click", (e) => { const b = e.target.closest(".nv-card, .nv-tile"); if (b) openFiche(b); });
const heroSoon = (b) => { clearTimeout(hoverT); if (b._m) hoverT = setTimeout(() => setHero(b._m, true), 220); };
nvEl.addEventListener("pointerover", (e) => { const b = e.target.closest(".nv-card"); if (b) heroSoon(b); });
nvEl.addEventListener("focusin", (e) => {
  const b = e.target.closest(".nv-card, .nv-tile"); if (!b) return;
  nvEl.querySelectorAll('[tabindex="0"]').forEach((x) => { if (x !== b) x.tabIndex = -1; });
  b.tabIndex = 0; heroSoon(b);
});
nvEl.addEventListener("keydown", (e) => {
  const b = e.target.closest(".nv-card, .nv-tile"); if (!b) return;
  let next = null;
  if (e.key === "ArrowRight") next = b.nextElementSibling;
  else if (e.key === "ArrowLeft") next = b.previousElementSibling;
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const tracks = [...nvEl.querySelectorAll(".nv-track")].filter((x) => x.children.length && x.offsetParent);
    const t = tracks[tracks.indexOf(b.parentElement) + (e.key === "ArrowDown" ? 1 : -1)];
    if (t && t.children.length) {
      const x = b.getBoundingClientRect().left;
      next = [...t.children].reduce((best, c) => Math.abs(c.getBoundingClientRect().left - x) < Math.abs(best.getBoundingClientRect().left - x) ? c : best);
    }
  } else return;
  e.preventDefault();
  if (next) { next.focus({ preventScroll: true }); reveal(next); }
});

// Glisser à la souris (clic droit ou gauche maintenu) : la rangée suit la main, l'écran défile
// aussi en hauteur, et la rangée continue un peu sur sa lancée quand on lâche.
{
  let drag = null, glide = 0;
  const swallowClick = (e) => { e.stopPropagation(); e.preventDefault(); };
  nvEl.addEventListener("contextmenu", (e) => { if (e.target.closest(".nv-track")) e.preventDefault(); });
  nvEl.addEventListener("pointerdown", (e) => {
    const tr = e.target.closest(".nv-track");
    if (!tr || e.pointerType !== "mouse" || (e.button !== 0 && e.button !== 2)) return;
    cancelAnimationFrame(glide);
    drag = { tr, x: e.clientX, y: e.clientY, left: tr.scrollLeft, top: nvEl.scrollTop, moved: false, v: 0, lastX: e.clientX, lastT: performance.now(), id: e.pointerId };
    if (e.button === 2) e.preventDefault();
  });
  addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
    if (!drag.moved) { drag.moved = true; drag.tr.classList.add("drag"); nvEl.classList.add("drag"); try { drag.tr.setPointerCapture(e.pointerId); } catch (err) {} }
    drag.tr.scrollLeft = drag.left - dx;
    nvEl.scrollTop = drag.top - dy;
    const now = performance.now();
    drag.v = (drag.lastX - e.clientX) / Math.max(1, now - drag.lastT) * 16; drag.lastX = e.clientX; drag.lastT = now;
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.moved) return;
    d.tr.classList.remove("drag"); nvEl.classList.remove("drag");
    // Le clic qui suit un glissé n'ouvre pas de fiche.
    addEventListener("click", swallowClick, { capture: true, once: true });
    setTimeout(() => removeEventListener("click", swallowClick, { capture: true }), 50);
    let v = d.v;
    if (calmMotion()) return;
    const step = () => { if (Math.abs(v) < .4) return; d.tr.scrollLeft += v; v *= .92; glide = requestAnimationFrame(step); };
    glide = requestAnimationFrame(step);
  };
  addEventListener("pointerup", end);
  addEventListener("pointercancel", end);
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

// ---------- outils : format des affiches, grand écran ----------
// Interrupteur PostersPlus (la clé est demandée une seule fois).
function drawPP() {
  $("pp-btn").setAttribute("aria-pressed", String(ppOn));
  nvEl.classList.toggle("pp", ppOn && !!tmdbKey());
}
function setPP(on) {
  ppOn = on;
  try { localStorage.setItem("apercu-pp", on ? "1" : "0"); } catch (e) {}
  drawPP(); nvEl.querySelectorAll(".nv-card").forEach(paintCard);
  if (window.sfx) sfx.click();
}
$("pp-btn").addEventListener("click", () => {
  if (ppOn) { setPP(false); return; }
  if (tmdbKey()) { setPP(true); return; }
  // Sur téléphone, on montre le champ sans lui donner le focus : le clavier ne s'ouvre que si on touche le champ.
  $("pp-key").hidden = false;
  if (tactile) $("pp-key").scrollIntoView({ block: "center", behavior: "smooth" }); else $("pp-input").focus();
});
// « Coller ma clé » : lit le presse-papiers et valide d'un coup, sans passer par le clavier.
if (navigator.clipboard && navigator.clipboard.readText) {
  $("pp-paste").hidden = false;
  $("pp-paste").addEventListener("click", async () => {
    try { $("pp-input").value = (await navigator.clipboard.readText()).trim(); } catch (err) { $("pp-note").textContent = "Le collage automatique est bloqué : touche le champ et colle ta clé."; $("pp-note").className = "err"; return; }
    $("pp-key").requestSubmit();
  });
}
$("pp-key").addEventListener("submit", (e) => {
  e.preventDefault();
  const k = $("pp-input").value.trim().replace(/[^A-Za-z0-9]/g, "");
  if (!/^[A-Fa-f0-9]{32}$/.test(k)) { $("pp-note").textContent = "Ça ne ressemble pas à une clé TMDB : elle fait 32 caractères (chiffres et lettres de a à f)."; $("pp-note").className = "err"; return; }
  try { localStorage.setItem("tmdb-key", k); } catch (err) {}
  $("pp-key").hidden = true; $("pp-input").value = "";
  setPP(true);
});
drawPP();

function drawFmt() {
  seg($("fmt"), ["Affiches verticales", "Paysage"], fmt === "l" ? 1 : 0, (i) => {
    fmt = i ? "l" : "p";
    try { localStorage.setItem("apercu-format", fmt); } catch (e) {}
    drawFmt(); nvEl.classList.toggle("paysage", fmt === "l");
    nvEl.querySelectorAll(".nv-card").forEach(paintCard);
    if (window.sfx) sfx.click();
  });
}
drawFmt();
const stageEl = $("stage");
function setBig(on) {
  stageEl.classList.toggle("big", on);
  document.body.classList.toggle("ecran-grand", on);
  const hero = nvEl.querySelector(".nv-hero");
  if (hero && hero._m) heroVideo(hero, hero._m);
  $("zoom").setAttribute("aria-pressed", String(on));
  document.body.style.overflow = on ? "hidden" : "";
  if (on) { const f = nvEl.querySelector('[tabindex="0"]'); if (f) f.focus({ preventScroll: true }); }
  else $("zoom").focus({ preventScroll: true });
  if (window.sfx) sfx.click();
}
$("zoom").addEventListener("click", () => setBig(!stageEl.classList.contains("big")));
$("big-close").addEventListener("click", () => setBig(false));
stageEl.addEventListener("click", (e) => { if (e.target === stageEl) setBig(false); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && stageEl.classList.contains("big") && $("fiche").hidden) setBig(false); });

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
  try { if (location.protocol.startsWith("http") && location.href !== configureUrl) history.replaceState(null, "", configureUrl); } catch (e) {}
  try { sessionStorage.setItem("programmation", configureUrl); } catch (e) {}
  if (!$("qr").hidden) drawQr();
  $("u-manifest").textContent = manifest;
  $("u-collections").textContent = base + "/collections.json";
  $("open-app").href = manifest.replace(/^https:/, "stremio:");
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
  resetOrder(); renderRows();
  seg($("regions"), D.regions.map(r => r.name), D.regions.findIndex(r => r.id === state.g), (i) => { state.g = D.regions[i].id; renderAll(); });
  ["providers", "disc-movie", "disc-series", "seasons", "excl"].forEach(id => { $(id).textContent = ""; });
  D.providers.forEach(p => chip($("providers"), "prov-" + p.id, p.name, state.p.includes(p.id), on => toggle("p", p.id, on, D.providers.map(x => x.id)), p.color));
  D.discover.forEach(d => chip($(d.type === "series" ? "disc-series" : "disc-movie"), "disc-" + d.id, d.name, state.d.includes(d.id), on => toggle("d", d.id, on, D.discover.map(x => x.id))));
  D.seasons.forEach(([k, label]) => chip($("seasons"), "season-" + k, label, state.h.includes(k), on => toggle("h", k, on, D.seasons.map(s => s[0]))));
  D.genres.forEach(([name]) => chip($("excl"), "excl-" + name, name, state.e.includes(name), on => toggle("e", name, on, D.genres.map(g => g[0]))));
  $("g-vote").value = state.m; $("g-vote-out").textContent = fmtVote(state.m); paintRange($("g-vote"));
  $("g-year").value = String(state.a); $("g-family").checked = state.f;
  renderCollections();
  update();
}

// listes déroulantes fixes
D.languages.forEach(([code, label]) => $("b-lang").append(el("option", { value: code, text: label })));
[0, 1960, 1970, 1980, 1990, 2000, 2010, 2015, 2020].forEach(y => $("g-year").append(el("option", { value: String(y), text: y ? String(y) : "Aucune limite" })));
$("g-vote").addEventListener("input", () => { state.m = Number($("g-vote").value); $("g-vote-out").textContent = fmtVote(state.m); update(); });
$("g-year").addEventListener("change", () => { state.a = Number($("g-year").value); update(); });
$("g-family").addEventListener("change", () => { state.f = $("g-family").checked; update(); });

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
    sc.onload = () => ok(window.qrcode); sc.onerror = () => { qrLib = null; ko(); };
    document.head.append(sc);
  });
  return qrLib;
}
function drawQr() {
  const box = $("qr-code");
  loadQr().then((qrcode) => {
    const q = qrcode(0, "M"); q.addData(configureUrl); q.make();
    const n = q.getModuleCount(), w = n + 4; let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + c + " " + r + "h1v1h-1z";
    box.className = "";
    box.innerHTML = '<svg viewBox="-2 -2 ' + w + " " + w + '" role="img" aria-label="QR code de ta programmation" shape-rendering="crispEdges"><rect x="-2" y="-2" width="' + w + '" height="' + w + '" fill="#fff"/><path d="' + d + '" fill="#2a1a14"/></svg>';
  }, () => { box.className = "qr-wait"; box.textContent = "QR code indisponible : vérifie ta connexion."; });
}
$("qr-btn").addEventListener("click", () => {
  const open = $("qr").hidden;
  $("qr").hidden = !open; $("qr-btn").setAttribute("aria-expanded", String(open));
  if (open) drawQr();
  sfx.click();
});
$("share-btn").addEventListener("click", async (e) => {
  const btn = e.currentTarget, label = btn.textContent;
  const data = { title: state.n + ", ma programmation Nuvio", text: "Ouvre ce lien pour avoir les mêmes rangées que moi dans Nuvio.", url: configureUrl };
  if (navigator.share) { try { await navigator.share(data); popcorn(btn); } catch (err) {} return; }
  try { await navigator.clipboard.writeText(configureUrl); btn.textContent = "Lien copié ✓"; popcorn(btn); } catch (err) { btn.textContent = "Copie impossible"; }
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
    try { const qrcode = await loadQr(); qr = qrcode(0, "M"); qr.addData(configureUrl); qr.make(); } catch (err) { qr = null; }
    const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1350;
    drawTicket(cv.getContext("2d"), qr);
    const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
    const file = new File([blob], "billet-nuvio.png", { type: "image/png" });
    if (matchMedia("(pointer: coarse)").matches && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: state.n });
    else { const a = el("a", { href: URL.createObjectURL(blob), download: "billet-nuvio.png" }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
    btn.textContent = "Billet imprimé ✓"; popcorn(btn); if (window.sfx) sfx.punch();
  } catch (err) { btn.textContent = "Impression impossible"; }
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
  let cur = 0;
  sections.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= line) cur = i; });
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = sections.length - 1;
  if (!navLinks[cur].classList.contains("on")) lightNav(navLinks[cur]);
}
addEventListener("scroll", () => { if (!navTick) { navTick = true; requestAnimationFrame(spyNav); } }, { passive: true });
spyNav();
{ const i = navLinks.findIndex((a) => a.getAttribute("href") === hashDepart); if (i >= 0) setTimeout(() => navLinks[i].click(), 500); }
</script>
<script>${STAGE_JS}</script>
</body>
</html>`;
}
