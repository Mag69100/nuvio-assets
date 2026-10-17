/**
 * Guide « de A à Z » (salle 1, servi sur /guide ; la racine « / » est le hall) : installer Nuvio et toute la configuration
 * conseillée, dans l'ordre, pour quelqu'un qui part de zéro.
 * Même univers visuel que la page de personnalisation (salle de cinéma).
 */

// Adresses de configuration des addons. Laisser vide ce qui n'est pas encore connu :
// l'étape affiche alors une consigne générale.
const LINKS = {
  // Version testée avec ce guide (bêta). /tv sur le site redirige ici : plus court à taper.
  nuvioTvVersion: "1.1.0-beta.7",
  // Code Downloader (raccourcisseur AFTVnews) → https://nuvio-assets.xnzxflix.workers.dev/tv
  downloaderCode: "5486412",
  nuvioTv: "https://github.com/NuvioMedia/NuvioTV/releases/tag/1.1.0-beta.7",
  // Fichier « universal » : marche sur toutes les TV et tous les Fire TV (32 et 64 bits).
  nuvioTvApk: "https://github.com/NuvioMedia/NuvioTV/releases/download/1.1.0-beta.7/app-full-universal-release.apk",
  nuvioDesktop: "https://github.com/NuvioMedia/NuvioDesktop/releases/latest",
  // Téléphones et tablettes : Play Store (Android), APK sur GitHub, ou AltStore / SideStore (iPhone, iPad).
  nuvioMobile: "https://github.com/NuvioMedia/NuvioMobile/releases/latest",
  nuvioPlay: "https://play.google.com/store/apps/details?id=com.nuvio.app",
  nuvioIosSource: "https://raw.githubusercontent.com/NuvioMedia/NuvioMobile/cmp-rewrite/store.json",
  altstore: "https://altstore.io/",
  sidestore: "https://sidestore.io/",
  downloader: "https://www.amazon.fr/s?k=downloader+aftvnews",
  tmdbSignup: "https://www.themoviedb.org/signup",
  tmdbApi: "https://www.themoviedb.org/settings/api",
  lumio: "https://mylumio.tv/configure",
  streamFusion: "https://streamfusion.stremio-epsilon.ca/configure",
  torrentio: "https://torrentio.strem.fun/configure",
  wastream: "https://wastream.noplay.fr/configure",
  opensubtitles: "https://opensubtitles-v3.strem.io/manifest.json",
  allDebrid: "https://alldebrid.com/",
  allDebridOffer: "https://alldebrid.com/offer/",
  allDebridKeys: "https://alldebrid.com/apikeys/",
  realDebrid: "https://real-debrid.com/",
  torbox: "https://torbox.app/",
};

// Réglage d'affiches conseillé (PostersPlus), SANS clé : « TA_CLE_TMDB » est remplacé
// dans la page par la clé que la personne tape (rien n'est envoyé nulle part).
export const POSTER_URL = "https://postersplus.stremio.ru/poster?tmdb_id={tmdb_id?}&imdb_id={imdb_id?}&stremio_id={id}&type={type}&shape={shape}&pc=stremio_tv_nuvio&tmdb_key=TA_CLE_TMDB&tg=low&bgr=low&vpcb=1&sm=notch&_bgr=low&_sm=sash&bp=top_left&_ip=bottom_right&_soo10=1&_rs=bullet_star&_gs=1&_bst=gold&_rb=1&_rbl=imdb&_cl=off&fti=1&irs=dataset&trs=direct&rdm=2&nsyo=0.93&soo10=1&rb=imdb&rbs=normalized&mw=lb:.01,tk:.01,im:.97,tm:.01&tw=tk:.01,im:.97,tm:.02&ll=fr-fr&fbs=photoreal&lba=1&cgsia=1&rsco=1&hur=1&mo=genre,year,rating&_mo=&ol=fr&stc=FFFFFF&sbs=gold&sbsw=1.40&sbsh=1.20&sbpo=auto_hug&bdm=7&bg1=tr:4:res&bms=3&_bdm=7&_bg1=chip:4:res:30&qad=1&wfq=1&gnq=1";

import { STAGE_HEAD, STAGE_CSS, stageTop, secretsHTML, BEAM_HTML, SEATS_HTML, CREDITS_HTML, STAGE_JS } from "./stage.js";
import { APERCU_CSS, apercuJS } from "./apercu.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const link = (href, text) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>`;
const copyBox = (id, value) => `<div class="copy"><code id="${id}">${esc(value)}</code><button type="button" data-copy="${id}">Copier</button></div>`;

export const NUVIO_TV_APK = LINKS.nuvioTvApk;

export function guidePage({ origin, season }) {
  const short = origin.replace(/^https?:\/\//, "") + "/tv";
  const LOGO = origin + "/logo.png";
  const manifest = `${origin}/manifest.json`;
  const sf = LINKS.streamFusion
    ? `<li>Ouvre ${link(LINKS.streamFusion, "la page de StreamFusion Reborn")}.</li>`
    : `<li>Ouvre la page de configuration de StreamFusion Reborn (demande l'adresse à la personne qui t'a envoyé ce guide).</li>`;
  const wa = LINKS.wastream
    ? `<li>Ouvre ${link(LINKS.wastream, "la page de WAStream")}.</li>`
    : `<li>Ouvre la page de configuration de WAStream (demande l'adresse à la personne qui t'a envoyé ce guide).</li>`;

  return `<!doctype html>
<html lang="fr" data-saison="${esc(season || "")}">
<head>
<meta charset="utf-8">
${STAGE_HEAD}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Guide Nuvio FR · de A à Z</title>
<meta name="description" content="Installer Nuvio et une configuration complète en français, étape par étape.">
<meta property="og:title" content="Nuvio en français, de A à Z">
<meta property="og:image" content="${LOGO}">
<link rel="icon" href="${LOGO}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@400;500;700;800&family=Courier+Prime:wght@400;700&family=Instrument+Serif:ital@0;1&family=Limelight&family=Pacifico&family=Orbitron:wght@500;700&display=swap">
<style>
/* Le programme de la séance : une colonne de lecture, chaque étape est un « acte » numéroté. */
:root {
  --foyer-w: 1180px;
  --velvet: #170c12; --velvet-2: #22121b; --seat: #3d2230; --cream: #f5ead8; --dim: #b9a59c;
  --bulb: #ffcf6b; --red: #e5413a; --ink: #2a1a14; --green: #5fd39a;
  --display: "Bebas Neue", Impact, "Arial Narrow", sans-serif;
  --body: "Figtree", "Segoe UI", system-ui, sans-serif;
  --type: "Courier Prime", "Courier New", ui-monospace, monospace;
  --serif: "Instrument Serif", Georgia, serif;
  color-scheme: dark;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { overflow-x: clip; }
html, body { margin: 0; }
body {
  position: relative; color: var(--cream); font: 16px/1.6 var(--body);
  background: radial-gradient(ellipse 80% 40% at 50% -5%, rgba(229,65,58,.22), transparent 70%), repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 2px, transparent 2px 46px), var(--velvet);
  padding: max(104px, calc(env(safe-area-inset-top) + 92px)) max(16px, env(safe-area-inset-right)) calc(48px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
}
body::after { content: ""; position: fixed; inset: -50%; pointer-events: none; z-index: 50; opacity: .07; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  animation: grain 1.2s steps(6) infinite; }
@keyframes grain { 0%{transform:translate(0,0)} 25%{transform:translate(-3%,2%)} 50%{transform:translate(2%,-3%)} 75%{transform:translate(3%,3%)} 100%{transform:translate(0,0)} }
.valance { position: absolute; inset: 0 0 auto; height: 74px; pointer-events: none;
  background: radial-gradient(ellipse 34px 30px at 34px 0, #6d1420 0 28px, transparent 29px) 0 46px / 68px 32px repeat-x, repeating-linear-gradient(90deg, rgba(0,0,0,.28) 0 3px, transparent 3px 22px, rgba(255,255,255,.04) 22px 24px, transparent 24px 34px), linear-gradient(#4a0c15, #7a1824 70%, #5a0f1a);
  -webkit-mask: linear-gradient(#000, #000) top / 100% 48px no-repeat, radial-gradient(ellipse 34px 30px at 34px 0, #000 28px, transparent 29px) 0 46px / 68px 32px repeat-x;
          mask: linear-gradient(#000, #000) top / 100% 48px no-repeat, radial-gradient(ellipse 34px 30px at 34px 0, #000 28px, transparent 29px) 0 46px / 68px 32px repeat-x;
  filter: drop-shadow(0 8px 10px rgba(0,0,0,.5)); }
.valance::after { content: ""; position: absolute; left: 0; right: 0; top: 40px; height: 6px; background: repeating-linear-gradient(90deg, #d9a441 0 6px, #8a5f1a 6px 9px); }
a { color: var(--bulb); font-weight: 700; text-underline-offset: 3px; }
:focus-visible { outline: 3px solid var(--bulb); outline-offset: 3px; border-radius: 6px; }

.wrap { max-width: 860px; margin: 0 auto; display: grid; gap: 26px; }
.hero { position: relative; text-align: center; display: grid; gap: 14px; justify-items: center; }
.hero .marquee { margin-bottom: 4px; }
.hero h1 { font-size: clamp(2.6rem, 9vw, 5rem); text-wrap: balance; }
.hero .tagline { margin: 0; font: italic 400 1.45rem/1.25 var(--serif); color: var(--bulb); }
.hero p { margin: 0; max-width: 60ch; color: var(--dim); }
.facts { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.facts span { font: 700 .82rem var(--body); padding: 7px 12px; border-radius: 99px; border: 1px solid var(--seat); background: var(--velvet-2); color: var(--cream); }

.toc { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 6px 18px; background: var(--velvet-2); border: 1px solid var(--seat); border-radius: 16px; padding: 18px 20px; counter-reset: toc; }
.toc a { color: var(--cream); font-weight: 600; text-decoration: none; display: flex; gap: 10px; align-items: baseline; padding: 3px 0; }
.toc a::before { counter-increment: toc; content: counter(toc, decimal-leading-zero); font: 400 1.1rem var(--display); color: var(--bulb); min-width: 2ch; }
.toc a:hover { color: var(--bulb); }

.act { position: relative; background: var(--velvet-2); border: 1px solid var(--seat); border-radius: 18px; padding: 24px; display: grid; gap: 14px; scroll-margin-top: 20px; overflow: hidden; }
.act::before { content: ""; position: absolute; inset: 0 0 auto; height: 2px; background: linear-gradient(90deg, transparent, rgba(255,207,107,.5), transparent); }
.act > header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 4px 16px; align-items: end; }
/* L'étiquette et le titre restent toujours dans la colonne du milieu, l'un sous l'autre. */
.act > header .label { grid-column: 2; grid-row: 1; } .act > header h2 { grid-column: 2; grid-row: 2; }
.act .num { grid-row: span 2; position: relative; isolation: isolate; width: 84px; height: 84px; display: grid; place-items: center; border-radius: 50%;
  font: 400 2.9rem/1 var(--display); padding-top: 4px; color: var(--bulb); text-shadow: 0 0 20px rgba(255,207,107,.35);
  background:
    radial-gradient(circle, transparent 0 57%, rgba(255,207,107,.55) 58% 60%, transparent 61% 68%, rgba(255,207,107,.22) 69% 70%, transparent 71%),
    linear-gradient(rgba(255,207,107,.16), rgba(255,207,107,.16)) center / 1px 100% no-repeat,
    linear-gradient(rgba(255,207,107,.16), rgba(255,207,107,.16)) center / 100% 1px no-repeat,
    var(--velvet); }
/* Amorce de film : le secteur balaie le cercle une fois, à l'arrivée sur l'étape. */
.act .num::before { content: ""; position: absolute; inset: 0; border-radius: 50%; z-index: -1; background: conic-gradient(rgba(255,207,107,.32) var(--sweep), transparent 0); }
.act.rolling .num::before { animation: leader .9s linear; }
.act.rolling .num { animation: leader-num .9s steps(1); }
@keyframes leader { from { --sweep: 0deg; } to { --sweep: 360deg; } }
@keyframes leader-num { 0% { opacity: .35; } 100% { opacity: 1; } }
.act .label { font: 700 .74rem var(--type); letter-spacing: .14em; text-transform: uppercase; color: #fff; background: var(--red); padding: 3px 8px 2px; border-radius: 3px; justify-self: start; transform: rotate(-2deg); }
.act h2 { margin: 0; font: 400 2.2rem/1 var(--display); letter-spacing: .03em; text-wrap: balance; }
.act .lead { margin: 0; font: 400 1.15rem/1.45 var(--serif); color: #d6c3b8; }
.act p { margin: 0; }
.sub-h { margin: 6px 0 0; font: 800 .8rem var(--body); letter-spacing: .18em; text-transform: uppercase; color: var(--bulb); }
.act ol, .act ul { margin: 0; padding-left: 1.3em; display: grid; gap: 7px; }
.act li::marker { color: var(--bulb); font-weight: 800; }
.path { font-weight: 800; color: #fff; background: rgba(255,255,255,.06); border-radius: 5px; padding: 0 5px; }
.opt { font: 800 .66rem var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--ink); background: var(--bulb); border-radius: 4px; padding: 2px 6px; vertical-align: 4px; }

/* Choix de l'appareil : une carte par appareil, avec son icône. */
.appareils { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 8px; }
.appareils button { position: relative; display: grid; justify-items: center; gap: 2px; padding: 14px 8px 12px; border-radius: 12px; cursor: pointer; text-align: center;
  border: 1px solid var(--seat); background: var(--velvet); color: var(--cream); transition: border-color .2s ease, background .2s ease, transform .2s ease; }
.appareils button:hover { border-color: rgba(255,207,107,.5); transform: translateY(-2px); }
.appareils svg { width: 30px; height: 30px; margin-bottom: 4px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; color: var(--bulb); }
.appareils b { font: 800 .9rem/1.2 var(--body); }
.appareils small { font-size: .74rem; color: var(--dim); }
.appareils .claude-dispo { position: absolute; top: 6px; right: 6px; font: normal 800 .58rem var(--body); letter-spacing: .04em; padding: 2px 5px; border-radius: 99px; background: rgba(255,207,107,.14); color: var(--bulb); }
.appareils button[aria-selected="true"] { background: var(--cream); border-color: var(--cream); color: var(--ink); box-shadow: 0 0 0 3px rgba(255,207,107,.35); }
.appareils button[aria-selected="true"] svg { color: var(--red); }
.appareils button[aria-selected="true"] small { color: #7a5a4c; }
.appareils button[aria-selected="true"] .claude-dispo { background: var(--ink); color: var(--cream); }
/* À la main ou avec Claude */
.modes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 5px; border-radius: 12px; background: rgba(0,0,0,.28); border: 1px solid var(--seat); }
.modes button { display: grid; gap: 1px; padding: 9px 10px; border: 0; border-radius: 9px; background: transparent; color: var(--dim); cursor: pointer; text-align: center; }
.modes button b { font: 800 .92rem var(--body); }
.modes button small { font-size: .74rem; }
.modes button[aria-pressed="true"] { background: var(--bulb); color: var(--ink); }
.mode-pane { display: grid; gap: 10px; }
@media (max-width: 520px) { .appareils { grid-template-columns: repeat(2, 1fr); } }
.panel { display: grid; gap: 10px; }

.addons { display: grid; gap: 12px; counter-reset: ad; }
.addon { border: 1px solid var(--seat); border-radius: 14px; background: var(--velvet); padding: 16px 18px; display: grid; gap: 10px; }
.addon > header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.addon > header::before { counter-increment: ad; content: counter(ad); font: 400 1.6rem/1 var(--display); color: var(--ink); background: var(--bulb); width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; flex: none; padding-top: 3px; }
.addon h3 { margin: 0; font: 800 1.12rem var(--body); }
.addon .role { font: 700 .72rem var(--body); letter-spacing: .14em; text-transform: uppercase; color: var(--dim); }
.addon .role.need { color: var(--bulb); }

.copy { display: grid; grid-template-columns: minmax(0, 1fr) auto; background: #0f080c; border: 1px solid var(--seat); border-radius: 10px; overflow: hidden; }
.copy code { font: 400 .82rem/1.45 var(--type); padding: 11px 13px; overflow-x: auto; white-space: nowrap; min-width: 0; user-select: all; color: #f0e2cf; }
.copy button { font: 800 .85rem var(--body); border: 0; background: var(--cream); color: var(--ink); padding: 0 16px; cursor: pointer; min-width: 92px; }
.copy button:hover { background: var(--bulb); }
.copy.long code { white-space: normal; word-break: break-all; max-height: 7.5em; overflow-y: auto; }
/* Blocs de commandes : une commande par ligne. */
.copy.long code.lignes { white-space: pre-wrap; max-height: none; }
/* Du PC au téléphone : un QR code à côté de chaque lien, et le lien reçu sur le téléphone. */
.copy .qr-btn { display: none; min-width: 0; padding: 0 12px; background: #2a1520; color: var(--bulb); border-left: 1px solid var(--seat); }
.copy .qr-btn:hover { background: #3a1d2b; }
.copy .qr-btn svg { width: 20px; height: 20px; display: block; }
.vers-tel { display: none; font: 800 .86rem var(--body); padding: 8px 14px; border-radius: 99px; border: 1px solid rgba(255,207,107,.45); background: transparent; color: var(--bulb); cursor: pointer; }
@media (hover: hover) and (pointer: fine) and (min-width: 700px) {
  .copy { grid-template-columns: minmax(0, 1fr) auto auto; }
  .copy .qr-btn { display: block; }
  .vers-tel { display: inline-flex; align-items: center; gap: 8px; }
}
.qr-modal, .lien-recu { position: fixed; inset: 0; z-index: 88; display: grid; place-items: center; padding: 16px; background: rgba(5,3,4,.84); animation: rise .25s ease both; }
.qr-modal .boite, .lien-recu .boite { position: relative; display: grid; gap: 12px; justify-items: center; text-align: center; width: min(420px, 100%); padding: 24px; border-radius: 18px; background: var(--velvet-2); border: 1px solid rgba(255,207,107,.35); box-shadow: 0 30px 80px rgba(0,0,0,.7); }
.qr-modal h2, .lien-recu h2 { margin: 0; font: 400 1.8rem/1 var(--display); letter-spacing: .03em; color: var(--bulb); }
.qr-modal .code-qr { width: 270px; height: 270px; padding: 12px; border-radius: 12px; background: #fff; }
.qr-modal .code-qr svg { width: 100%; height: 100%; display: block; }
.qr-modal p, .lien-recu p { margin: 0; color: #e6d6c8; font-size: .95rem; }
.qr-modal small { color: var(--dim); max-width: 34ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 400 .78rem var(--type); }
.qr-modal .fermer, .lien-recu .fermer { position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; border-radius: 50%; border: 0; background: rgba(255,255,255,.08); color: var(--cream); font: 800 1.1rem/1 var(--body); cursor: pointer; }
.lien-recu code { display: block; width: 100%; max-height: 7.5em; overflow: auto; padding: 10px 12px; border-radius: 10px; background: #0f080c; border: 1px solid var(--seat); font: 400 .8rem/1.45 var(--type); word-break: break-all; text-align: left; color: #f0e2cf; }
.lien-recu .copier { width: 100%; font: 800 1.05rem var(--body); padding: 14px; border-radius: 12px; border: 0; background: var(--bulb); color: var(--ink); cursor: pointer; }


.compat { overflow-x: auto; border: 1px solid var(--seat); border-radius: 12px; }
.compat table { width: 100%; border-collapse: collapse; font-size: .9rem; min-width: 520px; }
.compat th { text-align: left; font: 700 .7rem var(--body); letter-spacing: .16em; text-transform: uppercase; color: var(--dim); padding: 10px 12px; background: rgba(255,255,255,.03); }
.compat td { padding: 10px 12px; border-top: 1px solid var(--seat); vertical-align: top; color: #e6d6c8; }
.compat td:first-child { font-weight: 800; color: var(--cream); }
.compat td:nth-child(2) { font: 700 .9rem var(--type); color: var(--bulb); white-space: nowrap; }
.tips { display: grid; gap: 8px; }
.first-run { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px 22px; align-items: center; padding: 18px 20px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(229,65,58,.14), rgba(229,65,58,.04)); border: 1px solid rgba(229,65,58,.4); color: #eadacd; }
.first-run p { margin: 0; line-height: 1.55; }
.first-run .pick { font-weight: 800; color: var(--ink); background: var(--bulb); padding: 1px 8px; border-radius: 5px; white-space: nowrap; }
.first-run small { grid-column: 1 / -1; display: block; padding-top: 12px; border-top: 1px dashed rgba(255,207,107,.25); color: var(--dim); font-size: .88rem; line-height: 1.6; }
/* La boîte de dialogue de Nuvio, en miniature : « Avancé » a le focus de la télécommande. */
.choix { display: grid; gap: 8px; padding: 12px; border-radius: 12px; background: #0f0b14; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); min-width: 170px; }
.choix span { display: block; padding: 9px 14px; border-radius: 9px; font: 700 .9rem var(--body); color: #8f88a2; background: rgba(255,255,255,.04); }
.choix span.focus { position: relative; color: #111; background: #fff; box-shadow: 0 0 0 3px var(--bulb), 0 0 6px rgba(255,207,107,.2); }
.choix span.focus::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; box-shadow: 0 0 22px rgba(255,207,107,.45); animation: halo 2.4s ease-in-out infinite; }
.choix small { border: 0; padding: 0; grid-column: auto; font: 600 .7rem var(--body); color: #6f6884; text-align: center; }
@keyframes halo { 50% { opacity: 0; } }
@media (max-width: 600px) { .first-run { grid-template-columns: 1fr; } .choix { justify-self: start; } }
.compat-box { border: 1px solid var(--bulb); border-radius: 14px; padding: 16px 18px; display: grid; gap: 12px; background: linear-gradient(180deg, rgba(255,207,107,.08), rgba(255,207,107,.02)); scroll-margin-top: 20px; }
.compat-box h3 { margin: 0; font: 400 1.5rem/1 var(--display); letter-spacing: .03em; color: var(--bulb); }
.compat-box p { margin: 0; color: #e6d6c8; }
.compat tr.adapt td { background: rgba(255,207,107,.06); }
.compat tr.adapt td:first-child { box-shadow: inset 3px 0 0 var(--bulb); }
.compat td:nth-child(3) b { color: var(--bulb); }
#reglages .compat td:nth-child(2) { white-space: normal; font-size: .82rem; }
.tag-adapt { font: 800 .66rem var(--body); letter-spacing: .12em; text-transform: uppercase; color: var(--ink); background: var(--bulb); border-radius: 4px; padding: 2px 6px; white-space: nowrap; }
.legend { font-size: .85rem; color: var(--dim); }
.tips li { color: #e6d6c8; }
.code { justify-self: start; display: grid; gap: 2px; padding: 12px 22px 10px; border-radius: 12px; background: var(--cream); color: var(--ink); box-shadow: 0 0 0 3px var(--bulb), 0 10px 30px rgba(0,0,0,.4); }
.code span { font: 700 .7rem var(--body); letter-spacing: .2em; text-transform: uppercase; color: #7a5a4c; }
.code b { font: 400 3rem/1 var(--display); letter-spacing: .12em; }
.small { font-size: .88rem; color: var(--dim); }
#u-adb { white-space: pre; }
.panel ul { margin-top: 6px; }
.manual summary { cursor: pointer; color: var(--bulb); font-weight: 700; }
.manual p { margin: 8px 0 0; color: #d9c8be; }
.note { border-left: 3px solid var(--bulb); background: rgba(255,207,107,.07); padding: 10px 14px; border-radius: 0 10px 10px 0; color: #e6d6c8; font-size: .95rem; }
.note.warn { border-color: var(--red); background: rgba(229,65,58,.09); }
.keyfield { display: grid; gap: 6px; }
.keyfield span { font: 700 .72rem var(--body); letter-spacing: .2em; text-transform: uppercase; color: var(--dim); }
.keyfield input { font: 600 1rem var(--type); padding: 11px 13px; border-radius: 10px; border: 1px dashed var(--bulb); background: #0f080c; color: var(--cream); }

.faq details { border-bottom: 1px solid var(--seat); padding: 12px 0; }
.faq summary { cursor: pointer; font-weight: 800; }
.faq details p { margin: 8px 0 0; color: #d9c8be; }
.cta { display: flex; flex-wrap: wrap; gap: 10px; }
.btn { display: inline-block; font: 800 .95rem var(--body); text-decoration: none; padding: 12px 18px; border-radius: 10px; background: var(--bulb); color: var(--ink); }
.btn.ghost { background: transparent; color: var(--cream); border: 1px solid var(--seat); }
footer { text-align: center; color: var(--dim); font: italic 400 1.05rem var(--serif); }
/* La bobine : avance au fil de la lecture, et sert de sommaire. */
.reel-nav { position: fixed; right: max(16px, env(safe-area-inset-right)); bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 40;
  display: grid; justify-items: end; gap: 10px; transition: opacity .3s ease, transform .3s ease; }
.reel-nav.away { opacity: 0; transform: translateY(14px); pointer-events: none; }
.reel-btn { display: flex; align-items: center; gap: 10px; padding: 6px 16px 6px 6px; border-radius: 99px; cursor: pointer; text-align: left;
  border: 1px solid rgba(255,207,107,.3); background: rgba(28,14,21,.9); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  color: var(--cream); font: 700 .85rem/1.2 var(--body); box-shadow: 0 12px 30px rgba(0,0,0,.5); }
.reel-btn:hover { border-color: var(--bulb); }
.reel-btn svg { width: 42px; height: 42px; flex: none; }
.reel-btn .disc { fill: #4a2a36; stroke: var(--bulb); stroke-width: 1.5; }
.reel-btn .hole { fill: var(--velvet); }
.reel-btn .hub { fill: var(--bulb); }
.reel-btn .spin { transform-origin: 21px 21px; }
.reel-btn b { font: 400 1.4rem/1 var(--display); color: var(--bulb); letter-spacing: .04em; }
.reel-btn small { display: block; color: var(--dim); font-weight: 600; max-width: 24ch; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.reel-menu { display: grid; gap: 2px; padding: 8px; min-width: 260px; max-height: min(62vh, 520px); overflow: auto; border-radius: 16px;
  border: 1px solid rgba(255,207,107,.25); background: rgba(28,14,21,.96); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  box-shadow: 0 20px 50px rgba(0,0,0,.6); transform-origin: 100% 100%; animation: unspool .22s cubic-bezier(.3,1.3,.5,1); counter-reset: rm; }
@keyframes unspool { from { opacity: 0; transform: scale(.9) translateY(8px); } }
.reel-menu a { display: flex; gap: 10px; align-items: baseline; padding: 8px 12px; border-radius: 10px; color: var(--cream); text-decoration: none; font-weight: 600; }
.reel-menu a::before { counter-increment: rm; content: counter(rm, decimal-leading-zero); font: 400 1.05rem var(--display); color: var(--bulb); min-width: 2ch; }
.reel-menu a:hover { background: rgba(255,255,255,.06); }
.reel-menu a.on { background: var(--bulb); color: var(--ink); }
.reel-menu a.on::before { color: var(--ink); }
.copy button { transition: background .15s ease, transform .15s ease; }
.copy button:active { transform: scale(.94); }
/* Étape faite : un talon de billet qu'on composte. */
.composte { grid-column: 3; grid-row: 1 / span 2; align-self: center; position: relative; padding: 9px 14px 9px 22px; border: 0; border-radius: 8px; cursor: pointer;
  font: 800 .82rem var(--body); color: var(--dim); background: rgba(255,255,255,.05); box-shadow: inset 0 0 0 1px var(--seat); white-space: nowrap; transition: background .2s ease, color .2s ease; }
.composte::before { content: ""; position: absolute; left: 8px; top: 50%; width: 8px; height: 8px; margin-top: -4px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px currentColor; }
.composte:hover { color: var(--cream); }
.composte[aria-pressed="true"] { color: #0e2a1c; background: var(--green); box-shadow: none; animation: punch .35s cubic-bezier(.3,1.6,.5,1); }
.composte[aria-pressed="true"]::before { background: var(--velvet-2); box-shadow: none; }
@keyframes punch { 40% { transform: scale(.9) rotate(-3deg); } }
.act.fait .num { color: var(--green); text-shadow: 0 0 20px rgba(95,211,154,.35); }
.toc a.fait::after, .reel-menu a.fait::after { content: "✓"; margin-left: auto; color: var(--green); font-weight: 800; }
.reel-menu a.on.fait::after { color: var(--ink); }
.reel-btn .ring { fill: none; stroke: var(--green); stroke-width: 2.2; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 21px 21px; transition: stroke-dasharray .5s ease; }
.reel-menu .home { border-bottom: 1px dashed rgba(255,207,107,.25); border-radius: 10px 10px 0 0; margin-bottom: 4px; color: var(--bulb); }
.reel-menu .home::before { content: "↩"; counter-increment: none; }
.reel-menu .astuce { margin: 6px 12px 4px; font-size: .78rem; color: var(--dim); }
kbd { font: 700 .75rem var(--type); padding: 1px 6px; border-radius: 4px; background: rgba(255,255,255,.08); box-shadow: inset 0 -1px 0 rgba(0,0,0,.4); color: var(--cream); }

/* Entracte, à mi-parcours */
.entracte { display: flex; align-items: center; gap: 22px; padding: 22px 8px; border-top: 2px dashed rgba(255,207,107,.25); border-bottom: 2px dashed rgba(255,207,107,.25); }
.entracte p { margin: 0; color: var(--dim); max-width: 46ch; }
.entracte .titre { font: italic 400 2.6rem/1 var(--serif); color: var(--bulb); text-shadow: 0 0 18px rgba(255,207,107,.45); margin-bottom: 4px; }
.cornet { position: relative; flex: none; width: 54px; height: 64px; margin-top: 14px; }
.cornet::before { content: ""; position: absolute; inset: 10px 0 0; background: repeating-linear-gradient(90deg, #e5413a 0 9px, #f5ead8 9px 18px); clip-path: polygon(0 0, 100% 0, 86% 100%, 14% 100%); border-radius: 3px; }
.cornet::after { content: ""; position: absolute; left: -2px; right: -2px; top: -2px; height: 22px;
  background: radial-gradient(circle at 15% 70%, #fff6e2 0 7px, transparent 7.5px), radial-gradient(circle at 40% 40%, #ffeec6 0 8px, transparent 8.5px), radial-gradient(circle at 65% 65%, #fff8ea 0 7px, transparent 7.5px), radial-gradient(circle at 86% 45%, #ffe7b0 0 7px, transparent 7.5px); }
.cornet i { position: absolute; left: 50%; top: 0; width: 13px; height: 11px; z-index: 1; animation: saute 2.6s cubic-bezier(.3,.6,.4,1) infinite;
  background: radial-gradient(circle at 30% 38%, #fffaf0 0 3px, transparent 3.6px), radial-gradient(circle at 68% 32%, #fff3dc 0 3.4px, transparent 4px), radial-gradient(circle at 52% 70%, #ffe8b4 0 3.8px, transparent 4.3px); }
.cornet i:nth-child(2) { animation-delay: .9s; --dx: -22px; }
.cornet i:nth-child(3) { animation-delay: 1.7s; --dx: 18px; }
@keyframes saute { 0%, 55% { transform: translate(-50%, 6px) scale(.6); opacity: 0; } 60% { opacity: 1; } 78% { transform: translate(calc(-50% + var(--dx, 6px) * .6), -26px) rotate(160deg); } 100% { transform: translate(calc(-50% + var(--dx, 6px)), 4px) rotate(320deg); opacity: 0; } }

/* Le panneau de sortie de secours : direction la salle 2 (ta programmation) */
.sortie-wrap { display: flex; justify-content: center; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 8px; }
.sortie { display: inline-flex; align-items: center; gap: 12px; padding: 10px 18px 10px 12px; border-radius: 8px; text-decoration: none; color: #eafff2;
  background: linear-gradient(#1f9d5c, #13804a); position: relative; box-shadow: 0 0 0 3px #0c3d25, 0 0 14px rgba(60,220,140,.25), inset 0 1px 0 rgba(255,255,255,.25); }
.sortie::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; box-shadow: 0 0 26px rgba(60,220,140,.45); animation: halo 4s ease-in-out infinite; }
.sortie svg { width: 30px; height: 30px; flex: none; }
.sortie b { display: block; font: 400 1.6rem/1 var(--display); letter-spacing: .12em; }
.sortie span { display: block; font: 700 .8rem var(--body); opacity: .9; }
.sortie:hover { box-shadow: 0 0 0 3px #0c3d25, 0 0 40px rgba(60,220,140,.7), inset 0 1px 0 rgba(255,255,255,.25); }

/* Le raccourci vers la salle 2, pour qui a déjà Nuvio */
.raccourci { display: inline-block; font: 800 .92rem var(--body); text-decoration: none; color: var(--ink); background: var(--bulb); padding: 9px 16px; border-radius: 99px; box-shadow: 0 0 22px rgba(255,207,107,.35); }
.raccourci:hover { background: #fff1c9; }

${APERCU_CSS}
/* Réclames d'avant-séance : de fausses pubs d'époque pour les fonctions du site. */
.reclames { position: relative; display: grid; }
.reclame { grid-area: 1 / 1; position: relative; display: grid; gap: 8px; justify-items: start; padding: 26px 30px 24px; border-radius: 6px; color: #2a1a14; overflow: hidden;
  background: radial-gradient(circle, rgba(42,26,20,.09) 1px, transparent 1.5px) 0 0 / 6px 6px, linear-gradient(160deg, #f6ead2, #ead8b6);
  box-shadow: inset 0 0 0 6px #ead8b6, inset 0 0 0 8px #2a1a14, 0 18px 40px rgba(0,0,0,.45);
  opacity: 0; visibility: hidden; transform: scale(.98); transition: opacity .5s ease, transform .5s ease, visibility .5s; }
.reclame.on { opacity: 1; visibility: visible; transform: none; }
.reclame .r-sur { margin: 0; font: 800 .74rem var(--body); letter-spacing: .22em; text-transform: uppercase; color: #8f2420; }
.reclame h3 { margin: 0; font: italic 400 clamp(2.2rem, 6vw, 3.2rem)/1 var(--serif); }
.reclame .r-slogan { margin: 0; max-width: 46ch; font-size: 1.02rem; line-height: 1.5; }
.reclame .r-cta { margin-top: 4px; font: 400 1.25rem/1 var(--display); letter-spacing: .06em; color: #f5ead8; background: #8f2420; padding: 9px 16px 7px; border-radius: 4px; text-decoration: none; }
.reclame .r-cta:hover { background: #2a1a14; }
.reclame .r-tampon { position: absolute; right: 18px; bottom: 16px; font: 400 1rem/1 var(--display); letter-spacing: .2em; color: rgba(143,36,32,.5); border: 2px solid rgba(143,36,32,.45); border-radius: 4px; padding: 4px 8px 2px; transform: rotate(-8deg); }
.reclame .r-etoile { position: absolute; top: 14px; right: 18px; width: 92px; height: 92px; display: grid; place-items: center; text-align: center; transform: rotate(12deg);
  font: 400 1.05rem/1 var(--display); letter-spacing: .04em; color: #fff6e6; background: #e5413a;
  clip-path: polygon(50% 0, 61% 18%, 82% 10%, 80% 32%, 100% 40%, 85% 56%, 96% 76%, 74% 78%, 68% 100%, 50% 86%, 32% 100%, 26% 78%, 4% 76%, 15% 56%, 0 40%, 20% 32%, 18% 10%, 39% 18%); }
.r-dots { display: flex; justify-content: center; gap: 8px; margin-top: 10px; }
.r-dots button { width: 10px; height: 10px; padding: 0; border-radius: 50%; border: 0; background: var(--seat); }
.r-dots button[aria-pressed="true"] { background: var(--bulb); }
@media (max-width: 600px) { .reclame { padding: 22px 20px 52px; } .reclame .r-etoile { width: 70px; height: 70px; font-size: .85rem; top: 10px; right: 10px; } .reclame h3 { padding-right: 64px; } }

/* La vendeuse d'esquimaux passe dans l'allée de l'entracte. */
.entracte { position: relative; padding-bottom: 96px; overflow: hidden; }
.vendeuse { position: absolute; left: 0; bottom: 6px; width: 48px; height: 72px; padding: 0; border: 0; background: none; transform: translateX(-80px); }
.entracte.vue .vendeuse { animation: passe 14s linear both; }
.entracte .vendeuse.pause { animation-play-state: paused; }
@keyframes passe { from { transform: translateX(-80px); } to { transform: translateX(var(--allee, 800px)); } }
/* La vendeuse : petit chapeau rond, carré court, uniforme rouge à boutons dorés, plateau d'esquimaux. */
.vendeuse svg, .ouvreuse svg { display: block; width: 100%; height: 100%; overflow: visible; }
.vendeuse svg *, .ouvreuse svg * { transform-box: view-box; }
.v-haut { transform-origin: 24px 52px; }
.v-jambe-g, .o-jambe-g { transform-origin: 22px 52px; }
.v-jambe-d, .o-jambe-d { transform-origin: 27px 52px; }
.entracte.vue .vendeuse:not(.pause) .v-haut { animation: dandine .45s ease-in-out infinite alternate; }
.entracte.vue .vendeuse:not(.pause) .v-jambe-g { animation: pas .45s ease-in-out infinite alternate; }
.entracte.vue .vendeuse:not(.pause) .v-jambe-d { animation: pas .45s ease-in-out infinite alternate-reverse; }
@keyframes dandine { to { transform: translateY(-1.5px) rotate(1.2deg); } }
@keyframes pas { from { transform: rotate(14deg); } to { transform: rotate(-14deg); } }
/* Les yeux clignent ; à l'arrêt, on respire. */
.o-haut circle[fill="#2a1a14"], .v-haut circle[fill="#2a1a14"] { transform-box: fill-box; transform-origin: center; }
.cligne .o-haut circle[fill="#2a1a14"], .cligne .v-haut circle[fill="#2a1a14"] { animation: cligne .3s; }
.v-haut circle[fill="#2a1a14"] { animation-delay: -2.1s; }
@keyframes cligne { 40% { transform: scaleY(.1); } }
.ouvreuse:not(.marche) svg { animation: souffle-o 3.4s ease-in-out infinite alternate; }
@keyframes souffle-o { to { translate: 0 -.7px; } }
.entracte .vendeuse.pause .v-haut { animation: crie .5s ease-in-out 2 alternate; }
@keyframes crie { to { transform: translateY(-2px) rotate(-3deg); } }
.v-bulle { position: absolute; left: 50%; bottom: calc(100% + 6px); padding: 3px 9px; border-radius: 8px; white-space: nowrap; background: var(--cream); color: var(--ink); font: 800 .72rem var(--body); opacity: 0; transform: translateX(-50%); pointer-events: none; }
.vendeuse.parle .v-bulle { animation: bulle 2.4s ease forwards; }

/* Le pot de pop-corn : il se vide pendant qu'on lit, on le remplit en cliquant. */
.pot { position: fixed; left: max(16px, env(safe-area-inset-left)); bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 40; width: 56px; height: 70px; padding: 0; border: 0; background: none; overflow: hidden; transition: opacity .3s ease, transform .3s ease; }
.pot.away { opacity: 0; transform: translateY(14px); pointer-events: none; }
/* Le pop-corn ne dépasse jamais du pot : au-dessus du bord, il reste dans la largeur de l'ouverture ;
   en dessous, il suit les flancs du pot (même trapèze que le seau). */
.p-interieur { position: absolute; inset: 0; clip-path: polygon(5px 0, 51px 0, 51px 31px, 45px 70px, 11px 70px, 5px 31px); }
.p-mais { position: absolute; left: 6px; right: 6px; top: 7px; height: 28px; transition: transform .5s ease; transform: translateY(calc((1 - var(--niveau, 1)) * 34px));
  background: radial-gradient(circle at 15% 70%, #fff6e2 0 8px, transparent 8.5px), radial-gradient(circle at 40% 40%, #ffeec6 0 9px, transparent 9.5px), radial-gradient(circle at 65% 65%, #fff8ea 0 8px, transparent 8.5px), radial-gradient(circle at 86% 45%, #ffe7b0 0 8px, transparent 8.5px), radial-gradient(circle at 50% 85%, #fff3dc 0 9px, transparent 9.5px); }
.p-seau { position: absolute; left: 4px; right: 4px; bottom: 0; height: 40px; z-index: 1; border-radius: 3px; background: repeating-linear-gradient(90deg, #e5413a 0 8px, #f5ead8 8px 16px); clip-path: polygon(0 0, 100% 0, 86% 100%, 14% 100%); box-shadow: inset 0 3px 0 rgba(0,0,0,.15); }
.pot.vide .p-seau { animation: secoue .5s ease 2; }
@keyframes secoue { 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
@media (max-width: 520px) { .pot { transform: scale(.82); transform-origin: 0 100%; } }

/* Le diplôme de projectionniste, quand toutes les étapes sont faites. */
.diplome-box { display: grid; gap: 10px; justify-items: center; text-align: center; padding: 26px; border-radius: 18px; border: 1px solid rgba(255,207,107,.5); background: radial-gradient(ellipse at 50% 0, rgba(255,207,107,.16), transparent 70%), var(--velvet-2); animation: rise .5s ease both; }
.diplome-box .titre { margin: 0; font: italic 400 2.2rem/1.1 var(--serif); color: var(--bulb); }
.diplome-box p { margin: 0; color: #e6d6c8; }
.diplome-box .row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 6px; }
.diplome-box input { font: 600 1rem var(--body); padding: 11px 13px; border-radius: 10px; border: 1px dashed var(--bulb); background: #0f080c; color: var(--cream); min-width: 0; width: 220px; }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } }

/* L'ouvreuse : elle suit la lecture et éclaire l'étape en cours avec sa lampe. */
.ouvreuse { position: fixed; top: 0; left: calc(50% - 430px - 104px); z-index: 30; width: 50px; height: 86px; cursor: pointer; will-change: transform; }
.o-haut { transform-origin: 24px 56px; }
.o-jambe-g { transform-origin: 22px 58px; } .o-jambe-d { transform-origin: 27px 58px; }
.ouvreuse.marche .o-haut { animation: dandine .3s ease-in-out infinite alternate; }
.ouvreuse.marche .o-jambe-g { animation: pas .3s ease-in-out infinite alternate; }
.ouvreuse.marche .o-jambe-d { animation: pas .3s ease-in-out infinite alternate-reverse; }
.o-lampe { position: absolute; right: -1px; top: 37.5px; width: 3px; height: 5px; border-radius: 2px; background: #fff3cf; box-shadow: 0 0 10px 4px rgba(255,220,150,.75); }
.o-bulle { position: absolute; left: 50%; bottom: calc(100% + 6px); padding: 3px 9px; border-radius: 8px; white-space: nowrap; background: var(--cream); color: var(--ink); font: 800 .72rem var(--body); opacity: 0; transform: translateX(-50%); pointer-events: none; }
.ouvreuse.parle .o-bulle { animation: bulle 2.4s ease forwards; }
.o-faisceau { position: fixed; left: 0; top: 0; z-index: 1; height: 150px; margin-top: -75px; pointer-events: none; transform-origin: 0 50%; opacity: 0; transition: opacity .4s ease; mix-blend-mode: screen;
  background: linear-gradient(90deg, rgba(255,230,170,.32), rgba(255,230,170,.04)); clip-path: polygon(0 47%, 100% 0, 100% 100%, 0 53%); }
.o-faisceau.on { opacity: 1; }
@media (max-width: 1179px) { .ouvreuse, .o-faisceau { display: none; } }
@media (prefers-reduced-motion: reduce) { .entracte.vue .vendeuse, .vendeuse svg *, .ouvreuse svg *, .pot.vide .p-seau { animation: none !important; } .vendeuse { display: none; } }
${STAGE_CSS}
@media (max-width: 520px) { .act > header { grid-template-columns: auto minmax(0, 1fr); } .composte { grid-column: 1 / -1; grid-row: 3; justify-self: start; margin-top: 8px; } .entracte { gap: 14px; } .entracte .titre { font-size: 2.1rem; } }
@media (max-width: 520px) { .act { padding: 18px; } .act .num { width: 64px; height: 64px; font-size: 2.2rem; } .act h2 { font-size: 1.8rem; } body { padding-bottom: calc(96px + env(safe-area-inset-bottom)); } .reel-btn small { max-width: 16ch; } }
@media (prefers-reduced-motion: reduce) { body::after, .act .num, .act .num::before, .reel-menu, .choix span.focus::after, .cornet i, .sortie::after, .composte { animation: none !important; } }
/* Doigt plutôt que souris : des cibles d'au moins 44 px (les points de la réclame gardent leur taille, seule la zone à toucher grandit). */
@media (hover: none), (pointer: coarse) {
  .composte { min-height: 44px; }
  .faq details { padding: 3px 0; }
  .faq summary, .manual summary { padding-block: 10px; }
  .reel-menu a { padding: 12px; }
  .r-dots { gap: 0; }
  .r-dots button { box-sizing: border-box; width: 30px; height: 30px; padding: 10px; background-clip: content-box; }
}
</style>
</head>
<body>
<div class="valance" aria-hidden="true"></div>
${stageTop({ here: "guide", origin })}
${secretsHTML("guide")}
<div class="wrap">
  <header class="hero">
    ${BEAM_HTML}
    <div class="marquee"><small>Guide de A à Z</small><h1>Nuvio en français</h1></div>
    <p class="tagline">De l'appli vide à l'accueil complet, en une séance.</p>
    <a class="raccourci" href="${esc(origin)}/configure" data-programmation>Tu as déjà Nuvio ? Passe direct à la salle 2 →</a>
    <button type="button" class="voir-resultat" data-resultat><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="3.5" width="16" height="10.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 17h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8.5 6.6v4.4l3.8-2.2z" fill="currentColor"/></svg>Voir l'accueil que tu auras à la fin</button>
    <button type="button" class="vers-tel" id="vers-tel">Ouvrir ce guide sur mon téléphone (QR code)</button>
    <p>Ce guide installe Nuvio puis toute la configuration conseillée, dans le bon ordre : catalogue en français, recherche, sources, sous-titres, collections et affiches.</p>
    <div class="facts"><span>≈ 25 minutes</span><span>TV, téléphone, tablette ou ordinateur</span><span>Sur TV : un téléphone à côté</span></div>
  </header>

  <nav class="toc" aria-label="Étapes">
    <a href="#avant">Avant de commencer</a><a href="#installer">Installer Nuvio</a><a href="#francais">Premier lancement (Avancé, français)</a>
    <a href="#telephone">Piloter depuis le téléphone</a><a href="#comptes">Créer tes clés (TMDB, AllDebrid)</a><a href="#addons">Ajouter les addons</a>
    <a href="#collections">Importer les collections</a><a href="#affiches">Les affiches perso</a><a href="#reglages">Les réglages conseillés</a><a href="#ranger">Ranger l'accueil</a>
    <a href="#tester">Lancer un premier film</a><a href="#depannage">En cas de souci</a>
  </nav>

  <section class="reclames" id="reclames" aria-roledescription="carrousel" aria-label="Réclames d'avant-séance">
    <article class="reclame on" aria-roledescription="diapositive" aria-label="Réclame 1 sur 3">
      <p class="r-sur">Nouveau en salle 2</p><h3>Le Mode Famille</h3><p class="r-slogan">Zéro frisson, cent pour cent de sourires. Toute la famille devant l'écran, garanti sans horreur !</p><a class="r-cta" href="${esc(origin)}/configure#s-filtres">Essayez-le dès ce soir</a>
      <span class="r-etoile" aria-hidden="true">Garanti !</span><span class="r-tampon" aria-hidden="true">Réclame</span>
    </article>
    <article class="reclame" aria-roledescription="diapositive" aria-label="Réclame 2 sur 3" aria-hidden="true">
      <p class="r-sur">Le chic à la française</p><h3>Les affiches PostersPlus</h3><p class="r-slogan">Notes, badges et qualité, d'un seul coup d'œil. Vos amis en seront verts de jalousie.</p><a class="r-cta" href="#affiches" tabindex="-1">Voir l'étape 8</a>
      <span class="r-etoile" aria-hidden="true">Luxe !</span><span class="r-tampon" aria-hidden="true">Réclame</span>
    </article>
    <article class="reclame" aria-roledescription="diapositive" aria-label="Réclame 3 sur 3" aria-hidden="true">
      <p class="r-sur">Pour vos amis</p><h3>Le billet en image</h3><p class="r-slogan">Offrez votre programmation ! Un joli billet, prêt à envoyer à toute la bande.</p><a class="r-cta" href="${esc(origin)}/configure" tabindex="-1">Imprimer mon billet</a>
      <span class="r-etoile" aria-hidden="true">Offert !</span><span class="r-tampon" aria-hidden="true">Réclame</span>
    </article>
  </section>
  <div class="r-dots" id="r-dots" role="group" aria-label="Choisir une réclame"></div>

  <section class="act" id="avant">
    <header><span class="num">01</span><span class="label">Avant de commencer</span><h2>Ce qu'il te faut</h2></header>
    <ul>
      <li><b>Un appareil</b> : une TV Android ou Google TV, un Fire TV, un téléphone ou une tablette (Android, iPhone, iPad), ou un ordinateur (Windows, Mac, Linux).</li>
      <li><b>Sur TV, un téléphone</b> sur le même Wi-Fi : il sert à coller les liens au lieu de les taper à la télécommande.</li>
      <li><b>Un compte TMDB</b> (gratuit) : il donne une clé pour les affiches perso de l'étape 8. On la crée à l'étape 5.</li>
      <li><b>Un compte AllDebrid premium</b> (payant, quelques euros par mois) : Lumio, StreamFusion, Torrentio et WAStream s'en servent pour fournir des sources rapides. On le crée à l'étape 5. ${link(LINKS.realDebrid, "Real-Debrid")} ou ${link(LINKS.torbox, "TorBox")} marchent aussi.</li>
    </ul>
    <p class="note">Nuvio est un lecteur : il n'héberge rien. Ce que tu regardes dépend des addons que tu ajoutes. Respecte la loi de ton pays sur les contenus.</p>
  </section>

  <section class="act" id="installer">
    <header><span class="num">02</span><span class="label">Installation</span><h2>Installer Nuvio</h2></header>
    <p class="lead">Choisis ton appareil. Sur TV, on installe la version testée avec ce guide, <b>Nuvio TV ${LINKS.nuvioTvVersion}</b>, depuis sa page officielle sur GitHub. Sur téléphone, tablette et ordinateur, c'est l'appli Nuvio de la même équipe : les étapes suivantes sont les mêmes partout.</p>
    <div class="appareils" role="tablist" aria-label="Ton appareil">
      <button type="button" role="tab" aria-selected="true" data-tab="tv"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="6" width="26" height="16" rx="2"/><path d="M11 27h10M16 22v5"/></svg><b>TV Android</b><small>Google TV, Shield…</small><i class="claude-dispo">+ Claude</i></button>
      <button type="button" role="tab" aria-selected="false" data-tab="fire"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="12" width="17" height="8" rx="2"/><path d="M22 16h3M25 13v6"/><path d="M10.5 16h6"/></svg><b>Fire TV</b><small>Stick, Cube</small><i class="claude-dispo">+ Claude</i></button>
      <button type="button" role="tab" aria-selected="false" data-tab="android"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="3" width="14" height="26" rx="3"/><path d="M14 25h4"/></svg><b>Android</b><small>téléphone, tablette</small><i class="claude-dispo">+ Claude</i></button>
      <button type="button" role="tab" aria-selected="false" data-tab="ios"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="4" width="22" height="25" rx="3"/><circle cx="16" cy="25.5" r=".9"/></svg><b>iPhone, iPad</b><small>via AltStore</small><i class="claude-dispo">+ Claude</i></button>
      <button type="button" role="tab" aria-selected="false" data-tab="pc"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="7" width="20" height="13" rx="1.5"/><path d="M3 24h26l-2-4H5z"/></svg><b>Windows, Mac</b><small>ordinateur</small><i class="claude-dispo">+ Claude</i></button>
      <button type="button" role="tab" aria-selected="false" data-tab="linux"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="6" width="24" height="20" rx="2"/><path d="M9 13l4 3-4 3M15 20h7"/></svg><b>Linux</b><small>ordinateur</small><i class="claude-dispo">+ Claude</i></button>
    </div>
    <div class="panel" data-panel="tv">
      <div class="modes" role="group" aria-label="Façon d'installer">
        <button type="button" data-mode="main" aria-pressed="true"><b>À la main</b><small>pas à pas</small></button>
        <button type="button" data-mode="claude" aria-pressed="false"><b>Avec Claude</b><small>il s'en occupe depuis l'ordi</small></button>
      </div>
      <div class="mode-pane" data-pane="main">
        <ol>
          <li>Sur la TV, installe l'appli <b>Downloader</b> depuis le Play Store.</li>
          <li>Autorise-la à installer des applis : <span class="path">Paramètres → Système (ou Appareil) → Sécurité → Sources inconnues → Downloader</span>. Le chemin varie un peu selon la marque.</li>
          <li>Dans Downloader, tape ce code dans le champ d'adresse et valide. Il télécharge directement le bon fichier, <b>app-full-universal-release.apk</b> :</li>
        </ol>
        <div class="code"><span>Code Downloader</span><b>${LINKS.downloaderCode}</b></div>
        <p class="small">Si le code ne marche pas, tape l'adresse à la place :</p>
        ${copyBox("u-tv", short)}
        <ol start="4">
          <li>Choisis <b>Installer</b>, puis ouvre Nuvio. Vérifie dans <span class="path">Paramètres → À propos</span> que la version est bien ${LINKS.nuvioTvVersion}.</li>
        </ol>
      <details class="manual"><summary>TV et Fire TV : installer à la main depuis GitHub (si le code ne marche pas)</summary>
        <p>Ouvre ${link(LINKS.nuvioTv, "la page de Nuvio TV " + LINKS.nuvioTvVersion)}, puis dans « Assets » prends <b>app-full-universal-release.apk</b>. Il marche partout. Les autres fichiers sont plus légers mais propres à un type de processeur : <b>armeabi-v7a</b> pour la plupart des Fire TV et des TV, <b>arm64-v8a</b> pour les boîtiers récents (Shield, Chromecast avec Google TV), <b>x86</b> et <b>x86_64</b> pour les émulateurs et PC.</p>
      </details>
      </div>
      <div class="mode-pane" data-pane="claude" hidden>
        <p>Tu as un ordinateur sur le même Wi-Fi que la TV et l'appli <b>Claude</b> (avec Claude Code) ? Claude installe Nuvio sur ta TV à ta place, par le réseau (ADB). Rien à télécharger sur la TV.</p>
        <p class="small">Depuis ton téléphone, l'appli Claude peut piloter Claude Code qui tourne sur ton ordinateur (Remote Control) : ça marche aussi, tant que l'ordinateur reste allumé sur le même Wi-Fi. Une session Claude Code « dans le cloud », elle, ne voit pas ta TV.</p>
        <ol>
          <li><b>Active le débogage sur la TV</b> : <span class="path">Paramètres → Système → À propos</span>, appuie 7 fois sur « Version de l'OS » (ou « Build »). Puis <span class="path">Options pour les développeurs → Débogage USB</span> (ou « Débogage sans fil »).</li>
          <li><b>Note l'adresse IP de la TV</b> : <span class="path">Paramètres → Réseau et Internet</span>, puis ton Wi-Fi. Elle ressemble à 192.168.1.42.</li>
          <li><b>Ouvre Claude Code sur l'ordinateur</b> et colle ce message en remplaçant l'adresse IP par celle de ta TV :</li>
        </ol>
        <div class="copy long"><code id="u-claude-tv">Installe Nuvio TV sur ma TV par ADB. Adresse IP de la TV : 192.168.1.42. Étapes : installe les outils ADB (Android platform-tools) s'ils manquent, télécharge le fichier APK depuis ${esc(LINKS.nuvioTvApk)}, connecte-toi à la TV avec « adb connect » sur le port 5555, puis installe l'APK avec « adb install -r ». Explique-moi chaque étape avant de la faire et dis-moi quand accepter la demande qui s'affichera sur la TV. À la fin, déconnecte-toi de la TV.</code><button type="button" data-copy="u-claude-tv">Copier</button></div>
        <ol start="4">
          <li>Quand la TV affiche <b>« Autoriser le débogage ? »</b>, coche « Toujours autoriser depuis cet ordinateur » et valide.</li>
          <li>Une fois Nuvio installé, <b>désactive le débogage</b> sur la TV (même menu). Laisser ADB ouvert permet à n'importe quel appareil du réseau de piloter ta TV.</li>
        </ol>
        <details class="manual"><summary>Sans Claude : les commandes à taper soi-même</summary>
          <p>Avec les <a href="https://developer.android.com/tools/releases/platform-tools" target="_blank" rel="noopener">outils ADB de Google</a> installés et le fichier APK téléchargé :</p>
          <div class="copy long"><code id="u-adb-tv" class="lignes">adb connect 192.168.1.42:5555
adb install -r app-full-universal-release.apk
adb disconnect</code><button type="button" data-copy="u-adb-tv">Copier</button></div>
        </details>
      </div>
    </div>
    <div class="panel" data-panel="fire" hidden>
      <div class="modes" role="group" aria-label="Façon d'installer">
        <button type="button" data-mode="main" aria-pressed="true"><b>À la main</b><small>pas à pas</small></button>
        <button type="button" data-mode="claude" aria-pressed="false"><b>Avec Claude</b><small>il s'en occupe depuis l'ordi</small></button>
      </div>
      <div class="mode-pane" data-pane="main">
        <ol>
          <li>Installe <b>Downloader</b> de <b>AFTVnews</b> depuis l'Amazon Appstore (cherche « Downloader », icône orange). Évite « Downloader for Fire, Browser… », une imitation payante.</li>
          <li>Active les options développeur : <span class="path">Paramètres → Ma Fire TV → À propos</span>, puis appuie 7 fois sur le nom de l'appareil.</li>
          <li>Autorise Downloader : <span class="path">Paramètres → Ma Fire TV → Options pour les développeurs → Applications de sources inconnues → Downloader</span>.</li>
          <li>Ouvre Downloader, va dans le champ d'adresse, tape ce code (ou dicte-le à la télécommande Alexa) et valide. Il télécharge directement le bon fichier, <b>app-full-universal-release.apk</b> :</li>
        </ol>
        <div class="code"><span>Code Downloader</span><b>${LINKS.downloaderCode}</b></div>
        <p class="small">Si le code ne marche pas, tape l'adresse à la place :</p>
        ${copyBox("u-fire", short)}
        <ol start="5">
          <li>Choisis <b>Installer</b>, puis <b>Supprimer</b> le fichier téléchargé pour libérer de la place.</li>
          <li>Ouvre Nuvio et vérifie dans <span class="path">Paramètres → À propos</span> que la version est bien ${LINKS.nuvioTvVersion}. Astuce : maintiens le bouton Accueil → Applications pour l'ajouter à tes favoris.</li>
        </ol>
      <details class="manual"><summary>TV et Fire TV : installer à la main depuis GitHub (si le code ne marche pas)</summary>
        <p>Ouvre ${link(LINKS.nuvioTv, "la page de Nuvio TV " + LINKS.nuvioTvVersion)}, puis dans « Assets » prends <b>app-full-universal-release.apk</b>. Il marche partout. Les autres fichiers sont plus légers mais propres à un type de processeur : <b>armeabi-v7a</b> pour la plupart des Fire TV et des TV, <b>arm64-v8a</b> pour les boîtiers récents (Shield, Chromecast avec Google TV), <b>x86</b> et <b>x86_64</b> pour les émulateurs et PC.</p>
      </details>
      </div>
      <div class="mode-pane" data-pane="claude" hidden>
        <p>Tu as un ordinateur sur le même Wi-Fi que le Fire TV et l'appli <b>Claude</b> (avec Claude Code) ? Claude installe Nuvio sur ton Fire TV à ta place, par le réseau (ADB). Rien à télécharger sur le Fire TV.</p>
        <p class="small">Depuis ton téléphone, l'appli Claude peut piloter Claude Code qui tourne sur ton ordinateur (Remote Control) : ça marche aussi, tant que l'ordinateur reste allumé sur le même Wi-Fi. Une session Claude Code « dans le cloud », elle, ne voit pas ton Fire TV.</p>
        <ol>
          <li><b>Active le débogage sur le Fire TV</b> : <span class="path">Paramètres → Ma Fire TV → À propos</span>, appuie 7 fois sur le nom de l'appareil. Puis <span class="path">Options pour les développeurs → Débogage ADB → Activé</span>.</li>
          <li><b>Note l'adresse IP du Fire TV</b> : <span class="path">Paramètres → Ma Fire TV → À propos → Réseau</span>. Elle ressemble à 192.168.1.42.</li>
          <li><b>Ouvre Claude Code sur l'ordinateur</b> et colle ce message en remplaçant l'adresse IP par celle de ton Fire TV :</li>
        </ol>
        <div class="copy long"><code id="u-claude-fire">Installe Nuvio TV sur mon Fire TV par ADB. Adresse IP du Fire TV : 192.168.1.42. Étapes : installe les outils ADB (Android platform-tools) s'ils manquent, télécharge le fichier APK depuis ${esc(LINKS.nuvioTvApk)}, connecte-toi au Fire TV avec « adb connect » sur le port 5555, puis installe l'APK avec « adb install -r ». Explique-moi chaque étape avant de la faire et dis-moi quand accepter la demande qui s'affichera sur le Fire TV. À la fin, déconnecte-toi du Fire TV.</code><button type="button" data-copy="u-claude-fire">Copier</button></div>
        <ol start="4">
          <li>Quand le Fire TV affiche <b>« Autoriser le débogage ? »</b>, coche « Toujours autoriser depuis cet ordinateur » et valide.</li>
          <li>Une fois Nuvio installé, <b>désactive le débogage</b> sur le Fire TV (même menu). Laisser ADB ouvert permet à n'importe quel appareil du réseau de piloter ton Fire TV.</li>
        </ol>
        <details class="manual"><summary>Sans Claude : les commandes à taper soi-même</summary>
          <p>Avec les <a href="https://developer.android.com/tools/releases/platform-tools" target="_blank" rel="noopener">outils ADB de Google</a> installés et le fichier APK téléchargé :</p>
          <div class="copy long"><code id="u-adb-fire" class="lignes">adb connect 192.168.1.42:5555
adb install -r app-full-universal-release.apk
adb disconnect</code><button type="button" data-copy="u-adb-fire">Copier</button></div>
        </details>
      </div>
    </div>
    <div class="panel" data-panel="android" hidden>
      <div class="modes" role="group" aria-label="Façon d'installer">
        <button type="button" data-mode="main" aria-pressed="true"><b>À la main</b><small>pas à pas</small></button>
        <button type="button" data-mode="claude" aria-pressed="false"><b>Avec Claude</b><small>il te guide sur ton téléphone</small></button>
      </div>
      <div class="mode-pane" data-pane="main">
        <ol>
          <li>Le plus simple : installe <b>Nuvio</b> depuis ${link(LINKS.nuvioPlay, "le Google Play Store")}. Il se met à jour tout seul.</li>
          <li>Pas de Play Store sur ton appareil ? Ouvre ${link(LINKS.nuvioMobile, "la page de Nuvio Mobile sur GitHub")} et, dans « Assets », prends <b>androidApp-full-arm64-v8a-release.apk</b> (presque tous les téléphones et tablettes récents) ou <b>armeabi-v7a</b> pour un très vieil appareil. Autorise l'installation quand Android le demande.</li>
          <li>Ouvre Nuvio. Sur téléphone et tablette, saute l'étape 4 : tu colles les liens directement dans l'appli.</li>
        </ol>
      </div>
      <div class="mode-pane" data-pane="claude" hidden>
        <p>L'appli <b>Claude</b> ne peut pas installer Nuvio à ta place sur ton téléphone ou ta tablette, mais elle peut <b>te guider pas à pas</b> : elle t'explique chaque étape, attend que tu aies fini, et comprend les captures d'écran que tu lui envoies si tu bloques.</p>
        <ol>
          <li><b>Copie ce message</b> :</li>
        </ol>
        <div class="copy long"><code id="u-guide-android">Aide-moi à installer l'appli Nuvio sur mon téléphone (ou ma tablette) Android, puis à la configurer en français. Guide-moi une seule étape à la fois et attends que je te dise « c'est fait » avant de passer à la suivante. Si je bloque, je t'enverrai une capture d'écran. Pour l'installer : le plus simple est le Google Play Store (${LINKS.nuvioPlay}) ; sans Play Store, l'APK officiel est sur ${LINKS.nuvioMobile} (fichier androidApp-full-arm64-v8a-release.apk pour un appareil récent). Ensuite, le guide complet à suivre est ici : ${origin}/guide (étapes 3 et 5 à 12 ; l'étape 4 ne sert pas sur téléphone).</code><button type="button" data-copy="u-guide-android">Copier</button></div>
        <ol start="2">
          <li><b>Ouvre l'appli Claude</b> (ou ${link("https://claude.ai/new", "claude.ai")}), colle le message et envoie-le. Réponds-lui au fur et à mesure.</li>
        </ol>
      </div>
    </div>
    <div class="panel" data-panel="ios" hidden>
      <div class="modes" role="group" aria-label="Façon d'installer">
        <button type="button" data-mode="main" aria-pressed="true"><b>À la main</b><small>pas à pas</small></button>
        <button type="button" data-mode="claude" aria-pressed="false"><b>Avec Claude</b><small>il te guide sur ton téléphone</small></button>
      </div>
      <div class="mode-pane" data-pane="main">
        <p class="note">Nuvio n'est pas sur l'App Store. Sur iPhone et iPad, on l'installe avec <b>AltStore</b> ou <b>SideStore</b>, deux applis qui installent des applis en dehors de l'App Store.</p>
        <ol>
          <li>Installe ${link(LINKS.altstore, "AltStore")} (il faut un ordinateur la première fois) ou ${link(LINKS.sidestore, "SideStore")}, en suivant les explications de leur site.</li>
          <li>Dans AltStore ou SideStore : onglet <b>Sources</b> → <b>+</b>, puis colle cette adresse :</li>
        </ol>
        ${copyBox("u-ios", LINKS.nuvioIosSource)}
        <ol start="3">
          <li>Ouvre la source <b>Nuvio</b> et appuie sur <b>Installer</b>.</li>
          <li>Avec un identifiant Apple gratuit, les applis installées ainsi doivent être renouvelées tous les 7 jours : AltStore et SideStore le font tout seuls si tu les ouvres de temps en temps.</li>
          <li>Ouvre Nuvio et saute l'étape 4 : tu colles les liens directement dans l'appli.</li>
        </ol>
      </div>
      <div class="mode-pane" data-pane="claude" hidden>
        <p>L'appli <b>Claude</b> ne peut pas installer Nuvio à ta place sur ton iPhone ou ton iPad, mais elle peut <b>te guider pas à pas</b> : elle t'explique chaque étape, attend que tu aies fini, et comprend les captures d'écran que tu lui envoies si tu bloques.</p>
        <ol>
          <li><b>Copie ce message</b> :</li>
        </ol>
        <div class="copy long"><code id="u-guide-ios">Aide-moi à installer l'appli Nuvio sur mon iPhone (ou mon iPad), puis à la configurer en français. Guide-moi une seule étape à la fois et attends que je te dise « c'est fait » avant de passer à la suivante. Si je bloque, je t'enverrai une capture d'écran. Nuvio n'est pas sur l'App Store : il s'installe avec AltStore (${LINKS.altstore}) ou SideStore (${LINKS.sidestore}), en ajoutant cette source dans l'onglet Sources : ${LINKS.nuvioIosSource}. Avec un identifiant Apple gratuit, l'appli doit être renouvelée tous les 7 jours. Ensuite, le guide complet à suivre est ici : ${origin}/guide (étapes 3 et 5 à 12 ; l'étape 4 ne sert pas sur téléphone).</code><button type="button" data-copy="u-guide-ios">Copier</button></div>
        <ol start="2">
          <li><b>Ouvre l'appli Claude</b> (ou ${link("https://claude.ai/new", "claude.ai")}), colle le message et envoie-le. Réponds-lui au fur et à mesure.</li>
        </ol>
      </div>
    </div>
    <div class="panel" data-panel="pc" hidden>
      <div class="modes" role="group" aria-label="Façon d'installer">
        <button type="button" data-mode="main" aria-pressed="true"><b>À la main</b><small>pas à pas</small></button>
        <button type="button" data-mode="claude" aria-pressed="false"><b>Avec Claude</b><small>il s'en occupe depuis l'ordi</small></button>
      </div>
      <div class="mode-pane" data-pane="main">
        <p class="note warn">Nuvio Desktop est encore en version <b>alpha</b>, réservée aux testeurs : ça marche, mais attends-toi à quelques bugs.</p>
        <ol>
          <li>Ouvre la page de Nuvio Desktop et, dans « Assets », télécharge :
            <ul>
              <li><b>Windows</b> : <b>Nuvio-Windows-x64-….msi</b></li>
              <li><b>Mac avec puce Apple</b> (M1, M2, M3, M4) : <b>Nuvio-macOS-arm64-….dmg</b></li>
              <li><b>Mac Intel</b> : <b>Nuvio-macOS-x86_64-….dmg</b>. Pour savoir lequel tu as : <span class="path">menu Pomme → À propos de ce Mac</span>.</li>
            </ul>
          </li>
        </ol>
        ${copyBox("u-pc", LINKS.nuvioDesktop)}
        <ol start="2">
          <li>Installe : double-clic sur le <b>.msi</b>, ou ouvre le <b>.dmg</b> et glisse Nuvio dans <b>Applications</b>.</li>
          <li>Si Windows affiche « Windows a protégé votre ordinateur » : <b>Informations complémentaires → Exécuter quand même</b>. Si le Mac refuse d'ouvrir l'appli : <span class="path">Réglages Système → Confidentialité et sécurité → Ouvrir quand même</span>.</li>
          <li>Ouvre Nuvio et saute l'étape 4 : tu colles les liens directement dans l'appli.</li>
        </ol>
      </div>
      <div class="mode-pane" data-pane="claude" hidden>
        <p>Tu as l'appli <b>Claude</b> (avec Claude Code) sur cet ordinateur ? Claude trouve le bon fichier pour ton système, le télécharge et l'installe à ta place.</p>
        <p class="note warn">Nuvio Desktop est encore en version <b>alpha</b>, réservée aux testeurs : attends-toi à quelques bugs.</p>
        <ol><li><b>Ouvre Claude Code</b> et colle ce message :</li></ol>
        <div class="copy long"><code id="u-claude-pc">Installe Nuvio Desktop sur cet ordinateur. Prends la dernière version sur https://github.com/NuvioMedia/NuvioDesktop/releases/latest, avec le fichier qui correspond à mon système : .msi pour Windows ; .dmg arm64 (puce Apple) ou x86_64 (Intel) pour Mac ; .deb, .rpm, .flatpak ou .AppImage selon ma distribution Linux. Télécharge-le et installe-le. Explique-moi chaque étape avant de la faire, et à la fin dis-moi comment ouvrir Nuvio.</code><button type="button" data-copy="u-claude-pc">Copier</button></div>
        <ol start="2"><li>Accepte les demandes d'autorisation de Claude (et ton mot de passe si le système le demande), puis ouvre Nuvio et saute l'étape 4 : tu colles les liens directement dans l'appli.</li></ol>
      </div>
    </div>
    <div class="panel" data-panel="linux" hidden>
      <div class="modes" role="group" aria-label="Façon d'installer">
        <button type="button" data-mode="main" aria-pressed="true"><b>À la main</b><small>pas à pas</small></button>
        <button type="button" data-mode="claude" aria-pressed="false"><b>Avec Claude</b><small>il s'en occupe depuis l'ordi</small></button>
      </div>
      <div class="mode-pane" data-pane="main">
        <p class="note warn">Nuvio Desktop est encore en version <b>alpha</b>, réservée aux testeurs : ça marche, mais attends-toi à quelques bugs. Il existe pour les PC 64 bits (x86_64).</p>
        <ol>
          <li>Ouvre la page de Nuvio Desktop et, dans « Assets », prends le format de ta distribution :
            <ul>
              <li><b>.deb</b> : Ubuntu, Debian, Linux Mint</li>
              <li><b>.rpm</b> : Fedora, openSUSE</li>
              <li><b>.flatpak</b> ou <b>.AppImage</b> : n'importe quelle distribution</li>
            </ul>
          </li>
        </ol>
        ${copyBox("u-linux", LINKS.nuvioDesktop)}
        <ol start="2"><li>Dans un terminal, depuis le dossier du téléchargement, lance la commande qui correspond à ton fichier :</li></ol>
        <p class="small"><b>.deb</b> (Ubuntu, Debian, Mint)</p>
        ${copyBox("u-lx-deb", "sudo apt install ./Nuvio-Linux-x86_64-*.deb")}
        <p class="small"><b>.rpm</b> (Fedora, openSUSE)</p>
        ${copyBox("u-lx-rpm", "sudo dnf install ./Nuvio-Linux-x86_64-*.rpm")}
        <p class="small"><b>.flatpak</b></p>
        ${copyBox("u-lx-flat", "flatpak install --user ./Nuvio-Linux-x86_64-*.flatpak")}
        <p class="small"><b>.AppImage</b> (rien à installer : on le rend exécutable et on le lance)</p>
        ${copyBox("u-lx-app", "chmod +x Nuvio-Linux-x86_64-*.AppImage && ./Nuvio-Linux-x86_64-*.AppImage")}
        <ol start="3"><li>Ouvre Nuvio depuis le menu des applis et saute l'étape 4 : tu colles les liens directement dans l'appli.</li></ol>
      </div>
      <div class="mode-pane" data-pane="claude" hidden>
        <p>Tu as l'appli <b>Claude</b> (avec Claude Code) sur cet ordinateur ? Claude trouve le bon fichier pour ton Linux, le télécharge et l'installe à ta place.</p>
        <p class="note warn">Nuvio Desktop est encore en version <b>alpha</b>, réservée aux testeurs : attends-toi à quelques bugs.</p>
        <ol><li><b>Ouvre Claude Code</b> et colle ce message :</li></ol>
        <div class="copy long"><code id="u-claude-linux">Installe Nuvio Desktop sur cet ordinateur. Prends la dernière version sur https://github.com/NuvioMedia/NuvioDesktop/releases/latest, avec le fichier qui correspond à mon système : .msi pour Windows ; .dmg arm64 (puce Apple) ou x86_64 (Intel) pour Mac ; .deb, .rpm, .flatpak ou .AppImage selon ma distribution Linux. Télécharge-le et installe-le. Explique-moi chaque étape avant de la faire, et à la fin dis-moi comment ouvrir Nuvio.</code><button type="button" data-copy="u-claude-linux">Copier</button></div>
        <ol start="2"><li>Accepte les demandes d'autorisation de Claude (et ton mot de passe si le système le demande), puis ouvre Nuvio et saute l'étape 4 : tu colles les liens directement dans l'appli.</li></ol>
      </div>
    </div>
  </section>

  <section class="act" id="francais">
    <header><span class="num">03</span><span class="label">Premier lancement</span><h2>Choisir « Avancé » et mettre en français</h2></header>
    <div class="first-run">
      <p><b>Au tout premier lancement</b>, Nuvio demande quel affichage des réglages tu veux : <b>Essentiel</b> ou <b>Avancé</b>. <span class="pick">Choisis Avancé</span> : sinon, une bonne partie des réglages de ce guide (lecteur, audio, affiches perso, bandes-annonces…) reste cachée.</p>
      <div class="choix" aria-hidden="true"><small>Affichage des réglages</small><span>Essentiel</span><span class="focus">Avancé</span></div>
      <small>Déjà choisi Essentiel ? Pas grave : <span class="path">Paramètres → Avancé → Mode d'expérience → Avancé</span>. Rien n'est perdu.</small>
    </div>
    <ol>
      <li><span class="path">Paramètres → Langue de l'application → Français</span>. Sinon, l'appli affiche « Movie » au lieu de « Film ».</li>
      <li><span class="path">Paramètres → Enrichissement TMDB</span> : <b>Langue → Français</b> (titres, résumés et logos en VF) et active <b>Bandes-annonces</b> (elles passeront en VF quand elle existe). Désactive <b>Infos</b> pour voir quand arrivent les films à venir (« 📅 Dispo le 17 nov. » en tête du résumé), et <b>Illustrations</b> pour garder les fonds en pleine définition et les logos en français du Catalogue FR.</li>
    </ol>
  </section>

  <section class="act" id="telephone">
    <header><span class="num">04</span><span class="label">Astuce</span><h2>Piloter depuis le téléphone</h2></header>
    <p class="lead">Les liens des addons sont longs : on ne les tape jamais à la télécommande.</p>
    <p class="note">Nuvio est installé sur un téléphone, une tablette ou un ordinateur ? Saute cette étape : tu colles les liens directement dans l'appli.</p>
    <ol>
      <li>Dans Nuvio sur la TV : <span class="path">Addons → Gérer depuis le téléphone</span>. Un QR code s'affiche.</li>
      <li>Scanne-le avec l'appareil photo du téléphone. Une page s'ouvre avec trois onglets : <b>Addons</b>, <b>Disposition de l'accueil</b> et <b>Collections</b>.</li>
      <li>À chaque étape de ce guide, ouvre ce guide sur le téléphone, appuie sur <b>Copier</b>, puis colle le lien dans cette page.</li>
    </ol>
  </section>

  <section class="act" id="comptes">
    <header><span class="num">05</span><span class="label">Comptes</span><h2>Créer tes clés</h2></header>
    <h3 class="sub-h" id="cle-tmdb">A · La clé TMDB (gratuite)</h3>
    <ol>
      <li>Crée un compte sur ${link(LINKS.tmdbSignup, "themoviedb.org")} et confirme ton adresse e-mail.</li>
      <li>Va dans ${link(LINKS.tmdbApi, "Paramètres → API")} et demande une clé : type <b>Développeur</b>, usage <b>personnel</b>. Remplis le formulaire simplement (nom de l'appli : « Nuvio perso »).</li>
      <li>Copie la <b>Clé d'API</b> (une suite de 32 lettres et chiffres) et garde-la dans tes notes : elle sert à l'étape 8 (affiches).</li>
    </ol>
    <h3 class="sub-h">B · AllDebrid premium et sa clé API</h3>
    <p>Les addons de sources (Lumio, StreamFusion, Torrentio, WAStream) passent par un débrideur. Le guide utilise AllDebrid.</p>
    <ol>
      <li>Crée un compte sur ${link(LINKS.allDebrid, "alldebrid.com")} et confirme ton adresse e-mail.</li>
      <li>Passe en <b>premium</b> sur ${link(LINKS.allDebridOffer, "la page des offres")} : sans premium, aucun addon ne fonctionne. L'abonnement d'un mois suffit pour essayer.</li>
      <li>Ouvre ${link(LINKS.allDebridKeys, "la page des clés API")} (<span class="path">Mon compte → Clés API</span>), crée une clé et nomme-la « Nuvio ».</li>
      <li>Copie la clé et garde-la avec ta clé TMDB : tu la colleras dans chaque addon de sources à l'étape 6.</li>
    </ol>
    <p class="note">Certains addons proposent aussi « Se connecter avec AllDebrid » : tu valides un code sur alldebrid.com au lieu de coller la clé. Les deux marchent.</p>
    <p class="note warn">Tes clés sont personnelles : ne les publie pas et ne les envoie à personne. Ne partage pas non plus tes liens d'installation d'addons, ils contiennent ta clé AllDebrid.</p>
  </section>

  <section class="act" id="addons">
    <header><span class="num">06</span><span class="label">Le cœur</span><h2>Ajouter les addons, dans cet ordre</h2></header>
    <p class="lead">L'ordre compte : Nuvio interroge les addons de haut en bas. Pour chacun : configure-le sur son site, copie le lien d'installation qu'il te donne, puis colle-le dans <span class="path">Addons → Ajouter un addon</span> (ou depuis le téléphone).</p>
    <div class="compat-box" id="compatibilite">
      <h3>Avant tout : ce que ton appareil sait lire</h3>
      <p>Valable pour <b>tous les addons de sources</b> : Lumio, StreamFusion, Torrentio et WAStream. Dans chacun, exclus les qualités et les formats que ton appareil ne gère pas. Sinon : <b>écran vert ou violet</b>, <b>image saccadée</b> ou <b>pas de son</b>.</p>
      <div class="compat">
        <table>
          <thead><tr><th>Ton appareil</th><th>Qualité max</th><th>À exclure</th></tr></thead>
          <tbody>
            <tr><td>Fire TV Stick Lite, Fire TV Stick (HD)</td><td>1080p</td><td>4K, HDR, Dolby Vision, et de préférence HEVC/H.265 et AV1</td></tr>
            <tr><td>Fire TV Stick 4K, 4K Max, Fire TV Cube</td><td>4K</td><td>AV1 sur les anciens modèles. Dolby Vision « profil 7 » des fichiers REMUX</td></tr>
            <tr><td>TV Android / Google TV</td><td>Selon la TV</td><td>Ce que la fiche technique de ta TV ne cite pas (HDR10+, Dolby Vision…)</td></tr>
            <tr><td>Ordinateur</td><td>Selon l'écran</td><td>Rien en général</td></tr>
          </tbody>
        </table>
      </div>
      <ul class="tips">
        <li><b>Écran vert ou violet</b> : la vidéo est en Dolby Vision et l'appareil ne le gère pas. Exclus Dolby Vision (ou garde seulement « DV + HDR10 »).</li>
        <li><b>Pas de son</b> : la piste est en DTS, DTS-HD ou TrueHD, que la plupart des Fire TV et des TV ne décodent pas sans ampli ou barre de son compatible. Exclus ces formats audio et garde AAC, AC3 ou E-AC3 (Dolby Digital Plus, qui inclut Atmos).</li>
        <li><b>Image qui saccade ou se coupe</b> : fichier trop lourd pour l'appareil ou la connexion. Limite la taille (ex. 15 Go pour un film) ou baisse en 1080p. Sur Wi-Fi, mieux vaut éviter les REMUX.</li>
      </ul>
    </div>
    <div class="addons">
      <article class="addon">
        <header><h3>Catalogue FR</h3><span class="role">Accueil, Découvrir, recherche, fiches</span></header>
        <p>Les rangées d'accueil en français (saison, tendances, nouveautés sur tes plateformes…), les catalogues de Découvrir, la recherche (rangées « Films » et « Séries », titres en français, les plus connus d'abord) et les fiches des films et séries (résumé avec la date de dispo des films à venir, casting, saisons, épisodes, bande-annonce en VF quand elle existe). Pas de compte nécessaire, et plus besoin de TMDB Discover Plus.</p>
        <p>Pour les réglages conseillés, colle simplement ce lien. Pour choisir tes rangées, tes plateformes et tes filtres, passe par ${link(origin + "/configure", "la page de personnalisation")}, qui te donne ton propre lien.</p>
        ${copyBox("u-cat", manifest)}
      </article>
      <article class="addon">
        <header><h3>Lumio</h3><span class="role need">Débrideur</span></header>
        <p>Sources en français, déjà indexées : les liens s'affichent vite.</p>
        <ol>
          <li>Ouvre ${link(LINKS.lumio, "la page de Lumio")} et connecte AllDebrid (clé API ou code).</li>
          <li>Règle tes préférences (qualités, formats vidéo et audio) <b>selon ce que ton appareil sait lire</b> : voir <a href="#compatibilite">l'encadré plus haut</a>.</li>
          <li>Copie le lien d'installation (bouton en bas à droite) et ajoute-le dans Nuvio.</li>
        </ol>
      </article>
      <article class="addon">
        <header><h3>StreamFusion Reborn</h3><span class="role need">Débrideur</span></header>
        <p>Sources françaises complémentaires.</p>
        <ol>${sf}<li>Choisis AllDebrid, colle ta clé API et mets la langue sur Français.</li><li>Exclus les qualités et formats que ton appareil ne gère pas (<a href="#compatibilite">encadré plus haut</a>), puis copie le lien d'installation.</li></ol>
      </article>
      <article class="addon">
        <header><h3>Torrentio</h3><span class="role need">Débrideur</span></header>
        <p>Le grand classique, très complet, en complément des sources françaises.</p>
        <ol>
          <li>Ouvre ${link(LINKS.torrentio, "la page de Torrentio")}.</li>
          <li><b>Priority foreign language</b> : French. <b>Debrid provider</b> : AllDebrid, puis colle ta clé API.</li>
          <li>Juste en dessous, dans les options du débrideur, <b>coche « Don't show debrid catalog »</b>. Sinon, Torrentio ajoute sur ton accueil un catalogue avec le contenu de ton compte AllDebrid.</li>
          <li><b>Exclude qualities</b> et <b>Max size</b> : selon ton appareil (<a href="#compatibilite">encadré plus haut</a>). Par exemple, sur un Fire TV Stick HD : exclure 4K, HDR, DV et limiter à 15 Go.</li>
          <li>Clique <b>Install</b>, puis <b>Copy link</b>, et colle le lien dans Nuvio.</li>
        </ol>
      </article>
      <article class="addon">
        <header><h3>WAStream <span class="opt">Facultatif</span></h3><span class="role need">Débrideur</span></header>
        <p>Des sources en téléchargement direct converties par ton débrideur, utiles quand les autres ne trouvent rien.</p>
        <ol>${wa}<li>Choisis AllDebrid et colle ta clé API.</li><li>Exclus les qualités et formats que ton appareil ne gère pas (<a href="#compatibilite">encadré plus haut</a>), puis copie le lien d'installation.</li></ol>
      </article>
      <article class="addon">
        <header><h3>OpenSubtitles v3</h3><span class="role">Sous-titres</span></header>
        <p>Les sous-titres français pour tout le reste. Pas de compte nécessaire : colle ce lien.</p>
        ${copyBox("u-os", LINKS.opensubtitles)}
        <p>Puis dans le lecteur : <span class="path">Paramètres → Sous-titres → Langue préférée → Français</span>.</p>
      </article>
    </div>
    <p class="note"><b>Plusieurs profils dans Nuvio ?</b> Installe les addons sur le profil principal. Pour chacun des autres : <span class="path">Paramètres → Profils → Gérer les profils</span>, choisis le profil, <b>Modifier</b>, puis active <b>Utiliser les addons principaux</b>. Ils partagent alors les mêmes addons, sans rien réinstaller.</p>
    <p class="small">Plus tard, si un addon change (nouvelles rangées, nouvelle saison…), pas besoin de le réinstaller : <span class="path">Addons → Actualiser les addons</span>.</p>
  </section>

  <aside class="entracte" aria-label="Entracte">
    <button type="button" class="vendeuse" aria-label="Acheter un esquimau à la vendeuse"><svg viewBox="0 0 48 72" aria-hidden="true"><g class="v-jambe-g"><rect x="19" y="50" width="4.4" height="18" rx="2" fill="#e9c9a8"/><path d="M17.5 68h7v3h-7z" rx="1" fill="#1b0d14"/></g><g class="v-jambe-d"><rect x="24.6" y="50" width="4.4" height="18" rx="2" fill="#e9c9a8"/><path d="M23.6 68h7v3h-7z" fill="#1b0d14"/></g><g class="v-haut"><path d="M14 31q10-6 20 0l3.5 22h-27z" fill="#c2352f"/><path d="M14 31q10-6 20 0l1 6q-11-4-22 0z" fill="#a82b26"/><path d="M24 31v21" stroke="#8f2420" stroke-width="1"/><g fill="#ffcf6b"><circle cx="21.6" cy="37" r=".9"/><circle cx="21.6" cy="42" r=".9"/><circle cx="26.4" cy="37" r=".9"/><circle cx="26.4" cy="42" r=".9"/></g><path d="M21 27h6l-.5 5h-5z" fill="#d9a57a"/><path d="M19.5 30l4.5 3 4.5-3" stroke="#f5ead8" stroke-width="1.4" fill="none"/><circle cx="24" cy="20" r="7.5" fill="#e3b088"/><path d="M16 21q-1.2-11.5 8-11.5t8 11.5q-1.4-6.5-8-6.5t-8 6.5z" fill="#3a2418"/><path d="M16.4 19q-1.4 7 1.6 9.5M31.6 19q1.4 7-1.6 9.5" stroke="#3a2418" stroke-width="3.2" fill="none" stroke-linecap="round"/><rect x="18.5" y="8.4" width="11" height="4.4" rx="1.6" fill="#c2352f"/><rect x="18.5" y="11" width="11" height="1.2" fill="#ffcf6b"/><circle cx="21.3" cy="20.4" r=".95" fill="#2a1a14"/><circle cx="26.7" cy="20.4" r=".95" fill="#2a1a14"/><circle cx="19.6" cy="23" r="1.4" fill="rgba(229,65,58,.32)"/><circle cx="28.4" cy="23" r="1.4" fill="rgba(229,65,58,.32)"/><path d="M22 24q2 1.7 4 0" stroke="#8f2420" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M17.5 31.5L6 42M30.5 31.5L42 42" stroke="#f5ead8" stroke-width="1.1"/><g><rect x="6.5" y="33" width="5.5" height="8" rx="2.4" fill="#5a2e16"/><rect x="14.5" y="33" width="5.5" height="8" rx="2.4" fill="#6b3a1e"/><rect x="28" y="33" width="5.5" height="8" rx="2.4" fill="#5a2e16"/><rect x="36" y="33" width="5.5" height="8" rx="2.4" fill="#6b3a1e"/><path d="M8 35h2.5M16 35h2.5M29.5 35h2.5M37.5 35h2.5" stroke="rgba(255,255,255,.25)" stroke-width=".8"/></g><rect x="3" y="40.5" width="42" height="5.5" rx="1.6" fill="#f5ead8"/><rect x="3" y="44.2" width="42" height="1.8" fill="#cdbca5"/><circle cx="4.5" cy="42.5" r="1.9" fill="#e3b088"/><circle cx="43.5" cy="42.5" r="1.9" fill="#e3b088"/></g></svg><span class="v-bulle"></span></button>
    <div class="cornet" aria-hidden="true"><i></i><i></i><i></i></div>
    <div><p class="titre">Entracte</p><p>La moitié est faite, et c'était la plus longue. Va te chercher du pop-corn : la suite va vite.</p></div>
  </aside>

  <section class="act" id="collections">
    <header><span class="num">07</span><span class="label">Grand écran</span><h2>Importer les collections</h2></header>
    <p class="lead">Les grandes tuiles en haut de l'accueil : Plateformes, Genres, J'ai envie de…, Sagas et Studios.</p>
    <ol>
      <li>Sur le téléphone (étape 4), onglet <b>Collections → Importer → URL</b>. Sur PC : <span class="path">Collections → Importer → URL</span>.</li>
      <li>Colle ce lien et valide. Si tu as personnalisé ton catalogue, prends plutôt le lien « Collections » de ton billet.</li>
    </ol>
    ${copyBox("u-coll", origin + "/collections.json")}
  </section>

  <section class="act" id="affiches">
    <header><span class="num">08</span><span class="label">Finitions</span><h2>Les affiches perso</h2></header>
    <p class="lead">Les affiches avec badges (classement, note IMDb, qualité, genre, année) du réglage conseillé.</p>
    <label class="keyfield" for="tmdb-key"><span>Colle ta clé TMDB ici</span><input id="tmdb-key" type="text" placeholder="ta clé de 32 caractères" autocomplete="off" spellcheck="false"></label>
    <p class="note">Ta clé reste sur ton appareil : elle est seulement insérée dans le lien ci-dessous, rien n'est envoyé.</p>
    <div class="copy long"><code id="u-poster">${esc(POSTER_URL)}</code><button type="button" data-copy="u-poster">Copier</button></div>
    <ol>
      <li>Dans Nuvio : <span class="path">Paramètres → Disposition → Custom Poster Source</span>. Le plus simple : <b>Configure via Phone</b>, puis colle le lien depuis ton téléphone.</li>
      <li>En dessous, dans « Apply to », laisse tout activé (Home, Collections, Library, Search, Details Screen…). Les affiches se mettent à jour au fil de la navigation.</li>
    </ol>
  </section>


  <section class="act" id="reglages">
    <header><span class="num">09</span><span class="label">Réglages fins</span><h2>Les réglages conseillés</h2></header>
    <p class="lead">Le reste des paramètres, écran par écran, tels qu'ils sont réglés sur le Fire TV de test. Les lignes surlignées dépendent de ton matériel ou de tes goûts : lis la colonne de droite avant de copier.</p>
    <div class="legend"><span class="tag-adapt">À adapter</span> dépend de ta TV, de ta barre de son ou de tes goûts · le reste : copie tel quel</div>
    <h3 class="sub-h">Apparence</h3>
    <div class="compat"><table><thead><tr><th>Réglage</th><th>Conseillé</th><th>Pourquoi / quand changer</th></tr></thead><tbody><tr class="adapt"><td>Thème de couleur</td><td>Cramoisi</td><td><b>À adapter :</b> pure question de goût.</td></tr><tr class="adapt"><td>Mode AMOLED</td><td>Au choix</td><td><b>À adapter :</b> active-le sur une TV OLED : noir pur, plus joli et moins de marquage.</td></tr><tr><td>Style des paramètres</td><td>Par défaut</td><td></td></tr><tr><td>App Icon &amp; Banner</td><td>Rose Gold</td><td>icône de Nuvio sur l’accueil du Fire TV.</td></tr><tr class="adapt"><td>Ambient Mode</td><td>Activé, après 1 minute</td><td><b>À adapter :</b> économiseur d’écran avec les images des films. Sur une TV OLED, garde-le pour éviter le marquage.</td></tr><tr><td>Catalogs (Ambient)</td><td>Same as hero</td><td></td></tr><tr><td>Police de l’application</td><td>Inter</td><td></td></tr><tr><td>Langue de l’application</td><td>Français</td><td>« Par défaut (système) » suffit si ton appareil est en français. Si le tien est en anglais, choisis Français.</td></tr></tbody></table></div>
    <h3 class="sub-h">Disposition</h3>
    <div class="compat"><table><thead><tr><th>Réglage</th><th>Conseillé</th><th>Pourquoi / quand changer</th></tr></thead><tbody><tr><td>Disposition de l’accueil</td><td>Vue moderne</td><td>grand carrousel en haut, rangées en dessous.</td></tr><tr><td>Arrière-plan en plein écran</td><td>Désactivé</td><td></td></tr><tr><td>Afficher le type de catalogue</td><td>Désactivé</td><td>les rangées de recherche s’appellent simplement « Films » et « Séries ».</td></tr><tr><td>Masquer le contenu non sorti</td><td>Désactivé</td><td></td></tr><tr><td>Overall Ratings</td><td>Activé</td><td></td></tr><tr><td>Barre latérale moderne</td><td>Activée</td><td></td></tr><tr><td>Hide Floating Pill</td><td>Activé</td><td></td></tr><tr><td>Afficher Découvrir dans la recherche</td><td>Activé</td><td></td></tr><tr><td>Emplacement de Découvrir</td><td>Dans le panneau latéral</td><td></td></tr><tr><td>Continuer à regarder</td><td>Affiché, style Card</td><td>miniatures d’épisodes, épisodes non vus floutés (anti-spoiler), épisode suivant à partir du plus avancé, épisodes à venir : tout activé. Ordre de tri : par défaut.</td></tr><tr><td>Affiche sélectionnée</td><td>Étendre en arrière-plan : activé, délai 3 s</td><td>la carte s’agrandit après 3 s sur la même affiche.</td></tr><tr class="adapt"><td>Lecture auto de la bande-annonce</td><td>Activée, avec le son, en « Média hero »</td><td><b>À adapter :</b> active « Lire en sourdine » si tu ne veux pas de son en naviguant.</td></tr><tr><td>Carte d’affiche</td><td>Largeur Équilibré, coins Pilule</td><td></td></tr><tr class="adapt"><td>Affiches paysage</td><td>Désactivé</td><td><b>À adapter :</b> active-le si tu préfères des cartes horizontales (16:9) au lieu des affiches verticales. <b>Laisse « Always Backdrop with Logo » désactivé</b> : avec les affiches perso de l’étape 8, il casse l’affichage des cartes.</td></tr><tr><td>Card Depth Effect</td><td>Activé, Edge glow Balanced, Top sheen Off</td><td>léger liseré lumineux sur les cartes.</td></tr><tr><td>Custom Poster Source</td><td>Lien de l’étape 8, appliqué partout</td><td></td></tr><tr><td>Page de détail</td><td>Épisodes non vus floutés, notes d’épisodes affichées, bande-annonce auto après 5 s</td><td>« Play in Background » désactivé.</td></tr><tr class="adapt"><td>4K Trailers</td><td>Activé</td><td><b>À adapter :</b> désactive-le sur un Fire TV Stick Lite ou HD, ou un appareil avec 2 Go de mémoire ou moins : bandes-annonces qui rament.</td></tr><tr><td>Préférer les métadonnées de l’addon externe</td><td>Activé</td><td>les fiches du Catalogue FR (en français, avec la date de dispo) passent avant celles de TMDB.</td></tr><tr><td>Afficher la date de sortie complète</td><td>Activé</td><td>pour un film pas encore regardable, le carrousel affiche la date où il arrive chez toi (sortie numérique, ou une estimation), pas sa sortie au cinéma.</td></tr><tr><td>Flux : badges de taille</td><td>Activés, en bas</td><td>taille du fichier à côté de chaque source.</td></tr><tr><td>Logo de l’addon</td><td>Activé</td><td>logo de l’addon à côté de chaque source.</td></tr></tbody></table></div>
    <h3 class="sub-h">Lecture</h3>
    <div class="compat"><table><thead><tr><th>Réglage</th><th>Conseillé</th><th>Pourquoi / quand changer</th></tr></thead><tbody><tr><td>Moteur interne</td><td>ExoPlayer</td><td></td></tr><tr><td>Changement auto du moteur en cas d’erreur</td><td>Désactivé</td><td></td></tr><tr><td>Sélection automatique du flux</td><td>Manuel (choisir le flux)</td><td>tu choisis toi-même la source (VF, qualité). Délai d’attente des addons : 3 s.</td></tr><tr><td>Réutiliser le dernier lien</td><td>Désactivé</td><td></td></tr><tr class="adapt"><td>Lecture auto de l’épisode suivant</td><td>Désactivé</td><td><b>À adapter :</b> active-le si tu enchaînes les épisodes. Seuil : 99 %.</td></tr><tr><td>Préférer le groupe Binge</td><td>Activé</td><td>l’épisode suivant reprend la même source.</td></tr><tr><td>Post-play Recommendations</td><td>Activé, à 96 %</td><td></td></tr><tr><td>Passer l’intro</td><td>Activé (bouton)</td><td>les sauts automatiques (intro, résumé, générique) sont désactivés : un bouton apparaît, tu choisis.</td></tr><tr><td>Interface du lecteur</td><td>Écran de chargement, état de chargement, superposition en pause, horloge, avertissements : activés</td><td></td></tr><tr><td>Langue audio préférée</td><td>Langue de l’appareil</td><td>donc le français si ton Fire TV est en français. Sinon, choisis Français.</td></tr><tr><td>Mémoriser le délai audio par appareil</td><td>Activé</td><td></td></tr><tr><td>Priorité du décodeur</td><td>Préférer les décodeurs de l’appareil</td><td></td></tr><tr class="adapt"><td>Lecture tunnelisée</td><td>Activée</td><td><b>À adapter :</b> si l’image saccade ou si le son se décale, désactive-la.</td></tr><tr class="adapt"><td>Forcer le transcodage AC-3 (optique/SPDIF)</td><td>Activé</td><td><b>À adapter :</b> <b>seulement si ta barre de son ou ton ampli est branché en optique</b> (câble Toslink) ou ne décode pas DTS/TrueHD : sans ça, pas de son sur ces fichiers. En HDMI eARC avec une barre récente, ou avec les haut-parleurs de la TV, laisse-le désactivé.</td></tr><tr><td>Sous-titres : langue</td><td>Par défaut (système)</td><td>Français si ton appareil n’est pas en français.</td></tr><tr><td>Utiliser les sous-titres forcés</td><td>Activé</td><td>affiche seulement les passages traduits (langue étrangère dans un film en VF).</td></tr><tr><td>Style des sous-titres</td><td>Taille 100 %, décalage 5 %, texte blanc, contour noir</td><td></td></tr><tr><td>Utiliser libass (ASS/SSA)</td><td>Activé, superposition OpenGL</td><td>sous-titres stylés des animés.</td></tr><tr class="adapt"><td>Frame Rate Matching</td><td>Désactivé</td><td><b>À adapter :</b> active-le si ta TV gère le changement de fréquence (mouvements plus fluides en 24 i/s). Sur certaines TV, l’écran devient noir une seconde au lancement.</td></tr><tr class="adapt"><td>Options Dolby Vision et HDR10+</td><td>Tout désactivé</td><td><b>À adapter :</b> ne touche à rien sauf en cas d’écran vert ou violet : voir l’encadré de l’étape 6.</td></tr><tr><td>Streaming P2P</td><td>Activé, profil Balanced, cache 2 Go, statistiques masquées</td><td>nécessaire pour certaines sources Torrentio.</td></tr></tbody></table></div>
    <h3 class="sub-h">Intégrations → Enrichissement TMDB</h3>
    <div class="compat"><table><thead><tr><th>Réglage</th><th>Conseillé</th><th>Pourquoi / quand changer</th></tr></thead><tbody><tr><td>Activer l’enrichissement TMDB</td><td>Activé, aussi sur l’accueil moderne et Continuer à regarder</td><td></td></tr><tr><td>Langue</td><td>Français</td><td></td></tr><tr><td>Infos</td><td>Désactivé</td><td>pour voir quand arrivent les films à venir : « 📅 Dispo le 17 nov. » en tête du résumé. Activé, Nuvio remplace le résumé par celui de TMDB et la date disparaît.</td></tr><tr><td>Illustrations</td><td>Désactivé</td><td>le Catalogue FR fournit déjà les fonds en pleine définition et les logos en français ; avec « Illustrations » activé, Nuvio les remplace par des images TMDB plus petites (fonds flous dans le grand carrousel et le mode ambiant).</td></tr><tr><td>Détails, crédits, productions, chaînes, épisodes, bandes-annonces, similaires, collections</td><td>Tout activé</td><td></td></tr></tbody></table></div>
    <h3 class="sub-h">Avancé</h3>
    <div class="compat"><table><thead><tr><th>Réglage</th><th>Conseillé</th><th>Pourquoi / quand changer</th></tr></thead><tbody><tr><td>Mode d’expérience</td><td>Avancé</td><td>affiche tous les réglages de ce guide.</td></tr><tr><td>Navigation horizontale rapide, défilement Nuvio</td><td>Activés</td><td></td></tr><tr class="adapt"><td>RGB565 image decoding</td><td>Activé</td><td><b>À adapter :</b> économise la mémoire, mais fait des dégradés en escalier (ciels, fonds sombres) dans le grand carrousel. Garde-le sur Fire TV Stick Lite ou HD ; désactive-le sur un Fire TV Stick 4K / 4K Max, un Cube ou une TV récente.</td></tr><tr><td>Startup Splash, Full exit on close</td><td>Activés</td><td></td></tr><tr><td>Rapports de plantage, rapports de lecture</td><td>Activés</td><td></td></tr></tbody></table></div>
    <p class="note">Un réglage n'apparaît pas ? Passe en mode <b>Avancé</b> (Paramètres → Avancé → Mode d'expérience). Les noms à moitié en anglais sont normaux : la traduction de Nuvio n'est pas complète.</p>
  </section>

  <section class="act" id="ranger">
    <header><span class="num">10</span><span class="label">Mise en scène</span><h2>Ranger l'accueil</h2></header>
    <p><button type="button" class="voir-resultat" data-resultat>Voir à quoi ressemble l'accueil terminé</button></p>
    <p><span class="path">Paramètres → Réorganiser les catalogues de l'accueil</span> → active <b>Suivre l'ordre des addons</b>.</p>
    <p class="note">C'est tout : le reste est déjà dans le bon ordre. Plateformes est épinglée tout en haut, puis viennent les rangées du Catalogue FR, puis Genres, J'ai envie de…, Sagas et Studios. Une collection n'est pas à sa place (importée avec une ancienne version) ? Déplace-la dans ce même écran, ou depuis le téléphone, onglet « Disposition de l'accueil ».</p>
    <p class="note">Tu as réinstallé le Catalogue FR et ses rangées sont passées tout en bas, sous les collections ? C'est normal : Nuvio range l'accueil addon par addon, et pour lui c'est un nouvel addon. Dans ce même écran, fais descendre d'un cran <b>Studios</b>, puis <b>Sagas</b>, puis <b>J'ai envie de…</b>, puis <b>Genres</b> : chacune saute sous les rangées du Catalogue FR, et l'ordre est rétabli.</p>
  </section>

  <section class="act" id="tester">
    <header><span class="num">11</span><span class="label">Moteur !</span><h2>Lancer un premier film</h2></header>
    <ol>
      <li>Ouvre un film depuis l'accueil, puis <b>Regarder</b> : la liste des sources s'affiche.</li>
      <li>Choisis une source marquée <b>FR</b>, <b>VFF</b>, <b>MULTI</b> ou <b>TRUEFRENCH</b> pour la VF. Les sources « en cache » chez ton débrideur démarrent tout de suite.</li>
      <li>Pendant la lecture, l'icône sous-titres permet de choisir des sous-titres français.</li>
    </ol>
  </section>

  <section class="act faq" id="depannage">
    <header><span class="num">12</span><span class="label">Coulisses</span><h2>En cas de souci</h2></header>
    <details><summary>« Aucun addon installé ne fournit de métadonnées pour… » en ouvrant un film</summary><p>Les fiches viennent du Catalogue FR : retire-le et rajoute-le (étape 6) pour que Nuvio voie qu'il fournit maintenant les fiches. Si tu avais un autre addon de fiches (TMDB Discover Plus, Cinemeta), tu peux le garder ou le supprimer.</p></details>
    <details><summary>« Aucun catalogue de recherche trouvé dans les addons installés »</summary><p>La recherche vient du Catalogue FR (addon n° 1 de l'étape 6) : vérifie qu'il est bien installé. Si tu viens de le mettre à jour, retire-le et rajoute-le pour que Nuvio voie ses catalogues de recherche.</p></details>
    <details><summary>Aucune source quand je clique sur Regarder</summary><p>Vérifie que ton abonnement AllDebrid premium est actif (étape 5) et que ta clé API est bien renseignée dans Lumio, StreamFusion, Torrentio et WAStream. S'il n'y a rien seulement sur certains films, tes exclusions sont peut-être trop strictes : relis l'encadré « Ce que ton appareil sait lire » de l'étape 6.</p></details>
    <details><summary>C'est écrit « Movie » au lieu de « Film »</summary><p>La langue de l'appli est en anglais : <span class="path">Paramètres → Langue de l'application → Français</span> (étape 3).</p></details>
    <details><summary>Les bandes-annonces sont en anglais</summary><p>Dans <span class="path">Paramètres → Enrichissement TMDB</span>, mets la langue en français et active <b>Bandes-annonces</b> (étape 3), puis ferme et relance Nuvio. Si un film n'a pas de bande-annonce en français, Nuvio montre la version originale.</p></details>
    <details><summary>Une rangée ou une modification n'apparaît pas</summary><p>Nuvio garde la liste des rangées d'un addon pendant 6 h. Pas besoin de réinstaller : dans <span class="path">Addons</span>, appuie sur <b>Actualiser les addons</b>, qui récupère tout de suite leurs dernières modifications.</p><p>Si tu as changé tes réglages en salle 2, ton lien d'addon a changé : là, il faut bien remplacer l'ancien Catalogue FR par le nouveau lien de ton billet.</p></details>
    <details><summary>La recherche affiche « TMDB Search » ou des résultats en double</summary><p>Ton installation date d’avant le passage de la recherche dans le Catalogue FR. <b>1.</b> Retire le Catalogue FR et remets-le (lien de l’étape 6) pour que Nuvio voie sa recherche et ses fiches. <b>2.</b> Dans Addons, supprime <b>TMDB Discover Plus</b> : il ne sert plus, le Catalogue FR fait maintenant la recherche et les fiches. <b>3.</b> Vérifie que « Afficher le type de catalogue » est désactivé (étape 9).</p></details>
    <details><summary>Un film à venir n’affiche pas sa date de dispo</summary><p>Pour un film pas encore regardable, l’addon envoie la date où il arrive chez toi (sortie numérique, ou une estimation) : c’est elle que le grand carrousel affiche, pas la sortie au cinéma. Le rappel « 📅 Dispo le 17 nov. » en tête du résumé n’apparaît que si <span class="path">Paramètres → Intégrations → Enrichissement TMDB → Infos</span> est désactivé (étape 3) : sinon, Nuvio remplace le résumé par celui de TMDB. Nuvio garde l’ancienne version environ 5 minutes : si rien ne change, ferme et relance l’appli.</p></details>
    <details><summary>Un autre profil n'a pas les addons</summary><p>Chaque profil Nuvio a sa propre liste d'addons. Ouvre <span class="path">Paramètres → Profils → Gérer les profils</span>, choisis le profil, puis <b>Modifier</b>, et active <b>Utiliser les addons principaux</b> : il reprend alors exactement les addons du profil principal, et suivra chacune de tes modifications.</p></details>
    <details><summary>Une collection est tout en bas de l'accueil</summary><p>C'est normal : seule Plateformes est épinglée tout en haut. Genres, J'ai envie de…, Sagas et Studios viennent après les rangées du Catalogue FR. Pour en remonter une : <span class="path">Paramètres → Réorganiser les catalogues de l'accueil</span> (étape 10).</p></details>
  </section>

  <section class="diplome-box" id="diplome" aria-label="Diplôme de projectionniste" hidden>
    <p class="titre">Bravo, la séance peut commencer !</p>
    <p>Tu as fait toutes les étapes : tu mérites ton diplôme de projectionniste.</p>
    <div class="row"><input id="dip-nom" type="text" maxlength="30" placeholder="Ton prénom" autocomplete="given-name" aria-label="Ton prénom, écrit sur le diplôme"><button type="button" class="btn" id="dip-btn">Télécharger mon diplôme</button></div>
  </section>

  <div class="sortie-wrap">
    <a class="sortie" href="${esc(origin)}/configure" data-programmation>
      <svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="17" cy="5" r="3" fill="currentColor"/><path d="M15 9l-5 4 1 5 3-3 2 5-4 7h3l3-6 3 2v5h3v-7l-4-3 1-4 3 3h4v-3h-3l-4-5z" fill="currentColor"/></svg>
      <span><b>Sortie</b><span>Retour à ta programmation</span></span>
    </a>
    <a class="btn ghost" href="#avant">Revenir au début</a>
  </div>
</div>
${SEATS_HTML}
${CREDITS_HTML}

<button type="button" class="pot away" id="pot" aria-label="Pot de pop-corn plein : clique pour le remplir"><i class="p-interieur"><i class="p-mais"></i></i><i class="p-seau"></i></button>
<div class="ouvreuse" id="ouvreuse" aria-hidden="true"><svg viewBox="0 0 50 86" aria-hidden="true"><g class="o-jambe-g"><rect x="19.5" y="58" width="4.4" height="24" rx="2" fill="#2a1a14"/><path d="M18 82h7.5v3H18z" fill="#12070b"/></g><g class="o-jambe-d"><rect x="25" y="58" width="4.4" height="24" rx="2" fill="#2a1a14"/><path d="M24 82h7.5v3H24z" fill="#12070b"/></g><g class="o-haut"><path d="M13.5 33q10.5-6 21 0l3 27h-27z" fill="#6d1420"/><path d="M13.5 33q10.5-6 21 0l1 7q-11.5-4.5-23 0z" fill="#5a0f1b"/><path d="M10.5 56h27l1 4h-29z" fill="#4a0c15"/><g fill="#ffcf6b"><circle cx="22" cy="39" r=".95"/><circle cx="22" cy="44" r=".95"/><circle cx="22" cy="49" r=".95"/><circle cx="26.5" cy="39" r=".95"/><circle cx="26.5" cy="44" r=".95"/><circle cx="26.5" cy="49" r=".95"/></g><path d="M17 34.5l-2.5 3M31.5 34.5l2.5 3" stroke="#ffcf6b" stroke-width="1.6" stroke-linecap="round"/><path d="M21.3 29h6l-.5 5.5h-5z" fill="#d9a57a"/><circle cx="24.3" cy="21" r="7.6" fill="#e3b088"/><path d="M16.3 22q-1.2-11.8 8-11.8t8 11.8q-1.4-6.6-8-6.6t-8 6.6z" fill="#24100f"/><path d="M16.7 20q-1.4 7.4 1.6 10M31.9 20q1.2 6-.6 8" stroke="#24100f" stroke-width="3.2" fill="none" stroke-linecap="round"/><rect x="19" y="9.2" width="11" height="4.4" rx="1.6" fill="#6d1420"/><rect x="19" y="11.8" width="11" height="1.2" fill="#ffcf6b"/><circle cx="23" cy="21.5" r=".95" fill="#2a1a14"/><circle cx="28.2" cy="21.5" r=".95" fill="#2a1a14"/><circle cx="30" cy="24" r="1.4" fill="rgba(229,65,58,.3)"/><path d="M24.4 25.2q2 1.5 3.9 0" stroke="#8f2420" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M32 37q8 1.5 13 3" stroke="#6d1420" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="45" cy="40.2" r="2.2" fill="#e3b088"/><rect x="42.5" y="37.6" width="7" height="4.6" rx="1.2" fill="#3a2418"/><rect x="48.6" y="37.2" width="1.6" height="5.4" rx=".6" fill="#fff3cf"/></g></svg><i class="o-lampe"></i><span class="o-bulle"></span></div>
<div class="o-faisceau" id="o-faisceau" aria-hidden="true"></div>
<div class="reel-nav away" id="reel-nav">
  <nav class="reel-menu" id="reel-menu" aria-label="Aller à une étape" hidden></nav>
  <button type="button" class="reel-btn" id="reel-btn" aria-expanded="false" aria-controls="reel-menu">
    <svg viewBox="0 0 42 42" aria-hidden="true"><circle class="ring" id="reel-ring" cx="21" cy="21" r="20" pathLength="100" stroke-dasharray="0 100"/><g class="spin" id="reel-spin"><circle class="disc" cx="21" cy="21" r="17.6"/><circle class="hole" cx="21" cy="10.5" r="4.6"/><circle class="hole" cx="31" cy="17.8" r="4.6"/><circle class="hole" cx="27.2" cy="29.5" r="4.6"/><circle class="hole" cx="14.8" cy="29.5" r="4.6"/><circle class="hole" cx="11" cy="17.8" r="4.6"/><circle class="hub" cx="21" cy="21" r="2.6"/></g></svg>
    <span><b id="reel-n">01</b> / <span id="reel-total">12</span><small id="reel-t">Ce qu'il te faut</small></span>
  </button>
</div>

<script>
// Onglets d'installation
document.querySelectorAll(".appareils button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".appareils button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
  document.querySelectorAll("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.tab; });
}));
// À la main ou avec Claude (le choix suit d'un appareil à l'autre).
const choisirMode = (mode) => document.querySelectorAll("[data-panel]").forEach((p) => {
  p.querySelectorAll(".modes button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.mode === mode)));
  p.querySelectorAll(".mode-pane").forEach((x) => { x.hidden = x.dataset.pane !== mode; });
});
document.querySelectorAll(".modes button").forEach((b) => b.addEventListener("click", () => choisirMode(b.dataset.mode)));
// On ouvre l'onglet de l'appareil sur lequel on lit le guide (Fire TV, iPhone, Android, ordinateur, Linux).
(() => {
  const ua = navigator.userAgent;
  const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const tab = /AFT|Fire ?TV/i.test(ua) ? "fire"
    : /iPhone|iPad|iPod/.test(ua) || ipad ? "ios"
    : /Android/.test(ua) && !/TV|AFT|BRAVIA|SmartTV/i.test(ua) ? "android"
    : /Windows|Macintosh/.test(ua) ? "pc"
    : /Linux|X11/.test(ua) ? "linux" : null;
  if (tab) document.querySelector('.appareils button[data-tab="' + tab + '"]').click();
})();
// Clé TMDB → lien d'affiches (reste dans le navigateur)
const TEMPLATE = ${JSON.stringify(POSTER_URL)};
const keyInput = document.getElementById("tmdb-key");
try { keyInput.value = localStorage.getItem("tmdb-key") || ""; } catch (e) {}
function drawPoster() {
  const k = keyInput.value.trim().replace(/[^A-Za-z0-9]/g, "");
  document.getElementById("u-poster").textContent = TEMPLATE.replace("TA_CLE_TMDB", k || "TA_CLE_TMDB");
  try { k ? localStorage.setItem("tmdb-key", k) : localStorage.removeItem("tmdb-key"); } catch (e) {}
}
keyInput.addEventListener("input", drawPoster); drawPoster();
// Boutons Copier
document.querySelectorAll("[data-copy]").forEach((btn) => btn.addEventListener("click", () => {
  const node = document.getElementById(btn.dataset.copy);
  const done = (t) => { btn.textContent = t; setTimeout(() => { btn.textContent = "Copier"; }, 1500); if (t !== "Sélectionné") popcorn(btn); };
  const fallback = () => { const r = document.createRange(); r.selectNodeContents(node); const s = getSelection(); s.removeAllRanges(); s.addRange(r); done("Sélectionné"); };
  try { navigator.clipboard.writeText(node.textContent).then(() => done("Copié ✓"), fallback); } catch (e) { fallback(); }
}));
</script>
<script>${STAGE_JS}</script>
<script>${apercuJS(origin, POSTER_URL)}</script>
<script>
// Amorce : le secteur balaie le cercle une fois, la première fois qu'on arrive sur l'étape.
const acts = [...document.querySelectorAll("section.act")];
const roll = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add("rolling"); roll.unobserve(e.target); }
}), { rootMargin: "0px 0px -25% 0px" });
acts.forEach((a) => roll.observe(a));

// Bobine : tourne avec le défilement, indique l'étape en cours, ouvre le sommaire.
const reelNav = document.getElementById("reel-nav"), reelBtn = document.getElementById("reel-btn"), menu = document.getElementById("reel-menu");
const home = document.createElement("a");
home.className = "home"; home.href = document.querySelector("a.sortie").href; home.setAttribute("data-programmation", ""); home.textContent = "Ta programmation (salle 2)";
menu.append(home);
document.querySelectorAll(".toc a").forEach((a) => menu.append(a.cloneNode(true)));
const astuce = document.createElement("p");
astuce.className = "astuce"; astuce.innerHTML = "Touches <kbd>T</kbd> et <kbd>G</kbd> du clavier : T pour revenir, G pour l'étape suivante.";
menu.append(astuce);
document.getElementById("reel-total").textContent = String(acts.length).padStart(2, "0");
const setMenu = (open) => { menu.hidden = !open; reelBtn.setAttribute("aria-expanded", String(open)); };
reelBtn.addEventListener("click", (e) => { e.stopPropagation(); setMenu(menu.hidden); });
menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
document.addEventListener("click", (e) => { if (!reelNav.contains(e.target)) setMenu(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { setMenu(false); reelBtn.focus(); } });
const spin = document.getElementById("reel-spin"), toc = document.querySelector(".toc");
let ticking = false, cur = -1;
const onScroll = () => {
  ticking = false;
  const max = document.documentElement.scrollHeight - innerHeight, away = toc.getBoundingClientRect().bottom > 0;
  spin.style.transform = "rotate(" + (scrollY / Math.max(max, 1) * 1440).toFixed(1) + "deg)";
  if (reelNav.classList.contains("away") !== away) { reelNav.classList.toggle("away", away); if (away) setMenu(false); }
};
addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();
const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  const i = acts.indexOf(e.target); cur = i; dispatchEvent(new Event("etape"));
  document.getElementById("reel-n").textContent = String(i + 1).padStart(2, "0");
  document.getElementById("reel-t").textContent = e.target.querySelector("h2").textContent;
  menu.querySelectorAll("a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
}), { rootMargin: "-35% 0px -60% 0px" });
acts.forEach((a) => spy.observe(a));

// Étapes faites : on composte son talon, c'est mémorisé sur l'appareil.
let faits = [];
try { faits = JSON.parse(localStorage.getItem("guide-faits") || "[]"); } catch (e) {}
const ring = document.getElementById("reel-ring");
function drawFaits(celebrate) {
  acts.forEach((a) => {
    const on = faits.includes(a.id);
    a.classList.toggle("fait", on);
    const b = a.querySelector(".composte"); b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "Fait ✓" : "À faire";
  });
  document.querySelectorAll(".toc a, .reel-menu a").forEach((l) => l.classList.toggle("fait", faits.includes((l.getAttribute("href") || "").slice(1))));
  ring.setAttribute("stroke-dasharray", (faits.length / acts.length * 100).toFixed(1) + " 100");
  document.getElementById("diplome").hidden = faits.length !== acts.length;
  if (celebrate && faits.length === acts.length) { bravo(); popcornRain(); toast("Tout est prêt. Ton diplôme t'attend en bas du guide !"); }
}
acts.forEach((a) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "composte"; b.setAttribute("aria-label", "Étape faite : " + a.querySelector("h2").textContent);
  b.addEventListener("click", () => {
    const on = !faits.includes(a.id);
    faits = on ? [...faits, a.id] : faits.filter((x) => x !== a.id);
    try { localStorage.setItem("guide-faits", JSON.stringify(faits)); } catch (e) {}
    if (on) { sfx.punch(); popcorn(b); }
    drawFaits(on);
  });
  a.querySelector("header").append(b);
});
drawFaits(false);

// Raccourcis : G étape suivante, T précédente (T est au-dessus de G sur le clavier).
addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest("input, textarea, select"))) return;
  const k = (e.key || "").toLowerCase();
  if (k !== "g" && k !== "t") return;
  const next = Math.max(0, Math.min(acts.length - 1, cur + (k === "g" ? 1 : -1)));
  acts[next].scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  cur = next;
});

// ---------- Du PC au téléphone : QR codes ----------
const ORIGINE = ${JSON.stringify(origin)};
const QR_ICONE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M2 2h7v7H2zm2 2v3h3V4zm7-2h7v7h-7zm2 2v3h3V4zM2 11h7v7H2zm2 2v3h3v-3zm8-2h2v2h-2zm2 2h2v2h-2zm2-2h2v2h-2zm-4 4h2v3h-2zm4 0h2v3h-2zm-2 2h2v1h-2z"/></svg>';
let qrLib = null;
const chargerQr = () => qrLib || (qrLib = new Promise((ok, ko) => {
  const sc = document.createElement("script");
  sc.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
  sc.onload = () => ok(window.qrcode); sc.onerror = () => { qrLib = null; ko(); };
  document.head.append(sc);
}));
function qrSvg(qrcode, texte) {
  const q = qrcode(0, texte.length > 300 ? "L" : "M"); q.addData(texte); q.make();
  const n = q.getModuleCount(), w = n + 4; let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + c + " " + r + "h1v1h-1z";
  return '<svg viewBox="-2 -2 ' + w + " " + w + '" shape-rendering="crispEdges" role="img" aria-label="QR code"><path d="' + d + '" fill="#2a1a14"/></svg>';
}
function montrerQr(titre, texte, cible, detail) {
  document.querySelectorAll(".qr-modal").forEach((x) => x.remove());
  const ov = document.createElement("div"); ov.className = "qr-modal"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", titre);
  ov.innerHTML = '<div class="boite"><button type="button" class="fermer" aria-label="Fermer">×</button><h2></h2><div class="code-qr">Impression du QR code…</div><p></p><small></small></div>';
  ov.querySelector("h2").textContent = titre;
  ov.querySelector("p").textContent = texte;
  ov.querySelector("small").textContent = detail || "";
  document.body.append(ov);
  const close = () => ov.remove();
  ov.querySelector(".fermer").addEventListener("click", close); ov.querySelector(".fermer").focus();
  ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  ov.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  chargerQr().then((qrcode) => { ov.querySelector(".code-qr").innerHTML = qrSvg(qrcode, cible); },
    () => { ov.querySelector(".code-qr").textContent = "QR code indisponible : vérifie ta connexion."; });
}
// Un bouton QR à côté de chaque « Copier » : le téléphone ouvre le guide avec ce lien prêt à copier.
document.querySelectorAll(".copy").forEach((box) => {
  const code = box.querySelector("code"); if (!code) return;
  const b = document.createElement("button"); b.type = "button"; b.className = "qr-btn"; b.innerHTML = QR_ICONE;
  b.setAttribute("aria-label", "Envoyer ce lien sur mon téléphone (QR code)"); b.title = "Envoyer sur mon téléphone";
  const nom = (box.closest(".addon") || box.closest(".act")).querySelector("h3, h2").textContent.trim();
  // Le QR code ouvre la page /lien : on y choisit de copier le lien ou le contenu du fichier.
  // (Le lien voyage après le #, il n'est jamais envoyé au serveur.)
  b.addEventListener("click", () => {
    const valeur = code.textContent.trim();
    const cible = ORIGINE + "/lien#" + new URLSearchParams({ u: valeur, nom }).toString();
    montrerQr("Sur ton téléphone", "Scanne avec l'appareil photo : tu pourras copier le lien, ou le contenu du fichier s'il s'agit d'une configuration.", cible, nom);
  });
  box.append(b);
});
document.getElementById("vers-tel").addEventListener("click", () => {
  const ici = acts[Math.max(0, cur)];
  montrerQr("Le guide sur ton téléphone", "Scanne avec l'appareil photo : le guide s'ouvre à la même étape.", ORIGINE + "/guide#" + (cur >= 0 ? ici.id : ""), "");
});
// Arrivée sur le téléphone avec un lien envoyé depuis le PC : on le montre avec un gros bouton Copier.
(() => {
  if (location.hash.indexOf("#lien=") !== 0) return;
  const p = new URLSearchParams(location.hash.slice(1)), lien = p.get("lien") || "", nom = p.get("nom") || "Ton lien";
  history.replaceState(null, "", location.pathname);
  if (!/^https?:[/][/]/.test(lien)) return;
  const ov = document.createElement("div"); ov.className = "lien-recu"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Lien reçu");
  ov.innerHTML = '<div class="boite"><button type="button" class="fermer" aria-label="Fermer">×</button><h2>Lien reçu</h2><p></p><code></code><button type="button" class="copier">Copier le lien</button><p class="aide">Puis colle-le dans la page « Gérer depuis le téléphone » de Nuvio.</p></div>';
  ov.querySelector("p").textContent = "Envoyé depuis ton ordinateur : " + nom + ".";
  ov.querySelector("code").textContent = lien;
  document.body.append(ov);
  const btn = ov.querySelector(".copier");
  btn.addEventListener("click", () => {
    const fini = (t) => { btn.textContent = t; popcorn(btn); };
    try { navigator.clipboard.writeText(lien).then(() => fini("Copié ✓"), () => { const r = document.createRange(); r.selectNodeContents(ov.querySelector("code")); getSelection().removeAllRanges(); getSelection().addRange(r); btn.textContent = "Sélectionné : copie-le"; }); }
    catch (e) { btn.textContent = "Appuie longuement sur le lien pour le copier"; }
  });
  ov.querySelector(".fermer").addEventListener("click", () => ov.remove());
})();

// ---------- Réclames d'avant-séance : une nouvelle toutes les 7 secondes ----------
(() => {
  const box = document.getElementById("reclames"), dots = document.getElementById("r-dots");
  const items = [...box.querySelectorAll(".reclame")];
  let i = 0, timer = 0;
  const show = (k) => {
    i = (k + items.length) % items.length;
    items.forEach((a, j) => {
      a.classList.toggle("on", j === i);
      if (j === i) a.removeAttribute("aria-hidden"); else a.setAttribute("aria-hidden", "true");
      a.querySelector(".r-cta").tabIndex = j === i ? 0 : -1;
    });
    dots.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
  };
  items.forEach((_, j) => {
    const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Réclame " + (j + 1));
    b.addEventListener("click", () => { show(j); restart(); }); dots.append(b);
  });
  const restart = () => { clearInterval(timer); if (!matchMedia("(prefers-reduced-motion: reduce)").matches) timer = setInterval(() => show(i + 1), 7000); };
  [box, dots].forEach((el) => {
    el.addEventListener("mouseenter", () => clearInterval(timer)); el.addEventListener("mouseleave", restart);
    el.addEventListener("focusin", () => clearInterval(timer)); el.addEventListener("focusout", restart);
  });
  show(0); restart();
})();

// ---------- La vendeuse d'esquimaux, à l'entracte ----------
(() => {
  const entracte = document.querySelector(".entracte"), v = entracte.querySelector(".vendeuse");
  const lane = () => entracte.style.setProperty("--allee", (entracte.clientWidth + 20) + "px");
  lane(); addEventListener("resize", lane);
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !entracte.classList.contains("vue")) { entracte.classList.add("vue"); }
  }, { threshold: .6 }).observe(entracte);
  // À mi-chemin, elle s'arrête et appelle les clients.
  let crieT = 0;
  const appel = () => {
    if (!entracte.classList.contains("vue") || v.classList.contains("pause")) return;
    v.classList.add("pause");
    v.querySelector(".v-bulle").textContent = "Esquimaux, chocolats glacés !";
    v.classList.remove("parle"); void v.offsetWidth; v.classList.add("parle");
    setTimeout(() => v.classList.remove("pause"), 2600);
  };
  new MutationObserver(() => { clearTimeout(crieT); if (entracte.classList.contains("vue")) crieT = setTimeout(appel, 6300); }).observe(entracte, { attributes: true, attributeFilter: ["class"] });
  v.addEventListener("animationend", (e) => { if (e.animationName === "passe") setTimeout(() => { entracte.classList.remove("vue"); }, 8000); });
  v.addEventListener("click", () => {
    v.classList.add("pause");
    v.querySelector(".v-bulle").textContent = "Esquimau, chocolat glacé !";
    v.classList.remove("parle"); void v.offsetWidth; v.classList.add("parle");
    sfx.punch(); popcorn(v); secret("esquimau");
    setTimeout(() => toast("Un esquimau, un ! Bon entracte."), 700);
    setTimeout(() => v.classList.remove("pause"), 2600);
  });
})();

// ---------- Le pot de pop-corn : il se vide pendant la lecture ----------
(() => {
  const pot = document.getElementById("pot");
  // Calculé une fois par image, et on ne touche à la page que si quelque chose a vraiment changé.
  let stock = 1, last = scrollY, prevenu = false, vu = -1, cache = null, raf = 0;
  const draw = () => {
    raf = 0;
    const pc = Math.round(stock * 50) * 2;
    if (pc !== vu) {
      vu = pc; pot.style.setProperty("--niveau", (pc / 100).toFixed(2));
      pot.setAttribute("aria-label", "Pot de pop-corn rempli à " + pc + " % : clique pour le remplir");
    }
    const away = toc.getBoundingClientRect().bottom > 0;
    if (away !== cache) { cache = away; pot.classList.toggle("away", away); }
  };
  addEventListener("scroll", () => {
    const dy = scrollY - last; last = scrollY;
    if (dy > 0) stock = Math.max(0, stock - dy / Math.max(1, (document.documentElement.scrollHeight - innerHeight) * .7));
    if (stock === 0 && !prevenu) { prevenu = true; pot.classList.add("vide"); setTimeout(() => pot.classList.remove("vide"), 1100); toast("Plus de pop-corn ! Clique sur le pot pour en reprendre."); }
    if (!raf) raf = requestAnimationFrame(draw);
  }, { passive: true });
  pot.addEventListener("click", () => {
    stock = Math.min(1, stock + .34); if (stock > .2) prevenu = false;
    popcorn(pot); draw();
  });
  draw();
})();

// ---------- Le diplôme de projectionniste (image 1600 × 1130) ----------
(() => {
  const btn = document.getElementById("dip-btn"), nom = document.getElementById("dip-nom");
  try { nom.value = localStorage.getItem("diplome-nom") || ""; } catch (e) {}
  const fit = (c, text, max) => { if (c.measureText(text).width <= max) return text; while (text.length > 1 && c.measureText(text + "…").width > max) text = text.slice(0, -1); return text + "…"; };
  btn.addEventListener("click", async () => {
    const qui = nom.value.trim() || "Un fin cinéphile";
    try { localStorage.setItem("diplome-nom", nom.value.trim()); } catch (e) {}
    const label = btn.textContent; btn.textContent = "Calligraphie en cours…"; btn.disabled = true;
    try {
      await Promise.all(['400 120px "Bebas Neue"', 'italic 400 60px "Instrument Serif"', '600 34px "Figtree"', '800 24px "Figtree"', '700 30px "Courier Prime"'].map((f) => document.fonts.load(f)));
      const W = 1600, H = 1130, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d");
      c.fillStyle = "#f3e7cf"; c.fillRect(0, 0, W, H);
      const vg = c.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 900); vg.addColorStop(0, "rgba(120,80,30,0)"); vg.addColorStop(1, "rgba(120,80,30,.28)"); c.fillStyle = vg; c.fillRect(0, 0, W, H);
      c.strokeStyle = "#8a5f1a"; c.lineWidth = 10; c.strokeRect(40, 40, W - 80, H - 80);
      c.lineWidth = 3; c.strokeRect(62, 62, W - 124, H - 124);
      [[62, 62], [W - 62, 62], [62, H - 62], [W - 62, H - 62]].forEach(([x, y]) => { c.fillStyle = "#8a5f1a"; c.beginPath(); c.arc(x, y, 14, 0, 6.283); c.fill(); c.fillStyle = "#f3e7cf"; c.beginPath(); c.arc(x, y, 7, 0, 6.283); c.fill(); });
      c.textAlign = "center";
      c.fillStyle = "#8a5f1a"; c.font = '800 24px "Figtree"'; c.fillText("NUVIO  ·  SALLE 1  ·  LE GUIDE DE A À Z", W / 2, 150);
      c.fillStyle = "#2a1a14"; c.font = '400 128px "Bebas Neue"'; c.fillText("DIPLÔME DE PROJECTIONNISTE", W / 2, 290);
      c.font = 'italic 400 46px "Instrument Serif"'; c.fillText("décerné à", W / 2, 385);
      c.fillStyle = "#7a1824"; c.font = 'italic 400 124px "Instrument Serif"'; c.fillText(fit(c, qui, 1200), W / 2, 520);
      c.strokeStyle = "rgba(42,26,20,.35)"; c.lineWidth = 2; c.beginPath(); c.moveTo(380, 555); c.lineTo(W - 380, 555); c.stroke();
      c.fillStyle = "#2a1a14"; c.font = '600 34px "Figtree"';
      c.fillText("pour avoir installé Nuvio en français, de A à Z, en douze étapes,", W / 2, 640);
      c.fillText("sans jamais parler pendant le film.", W / 2, 690);
      c.textAlign = "left"; c.font = '700 30px "Courier Prime"'; c.fillStyle = "#5a3a22";
      c.fillText("Le " + new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }), 170, 905);
      c.textAlign = "right"; c.fillStyle = "#2a1a14"; c.font = 'italic 400 60px "Instrument Serif"'; c.fillText("L'ouvreuse", W - 170, 900);
      c.strokeStyle = "#2a1a14"; c.lineWidth = 2; c.beginPath(); c.moveTo(W - 470, 920); c.bezierCurveTo(W - 380, 940, W - 260, 900, W - 160, 925); c.stroke();
      c.textAlign = "center";
      c.fillStyle = "#b8322c"; c.beginPath(); c.arc(W / 2, 890, 92, 0, 6.283); c.fill();
      c.strokeStyle = "#f3e7cf"; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, 890, 78, 0, 6.283); c.stroke();
      c.fillStyle = "#f3e7cf"; c.font = '400 64px "Bebas Neue"'; c.fillText("35 MM", W / 2, 905);
      c.font = '800 18px "Figtree"'; c.fillText("CERTIFIÉ", W / 2, 935);
      const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
      const file = new File([blob], "diplome-projectionniste.png", { type: "image/png" });
      if (matchMedia("(pointer: coarse)").matches && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: "Diplôme de projectionniste" });
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "diplome-projectionniste.png"; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
      btn.textContent = "Diplôme imprimé ✓"; popcorn(btn); sfx.punch();
    } catch (e) { btn.textContent = "Impression impossible"; }
    btn.disabled = false; setTimeout(() => { btn.textContent = label; }, 2200);
  });
})();

// ---------- L'ouvreuse : elle suit la lecture et éclaire l'étape en cours ----------
(() => {
  const o = document.getElementById("ouvreuse"), beam = document.getElementById("o-faisceau");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let y = innerHeight / 2, raf = 0, stopT = 0;
  const step = () => {
    raf = 0;
    if (!o.offsetParent && getComputedStyle(o).display === "none") return;
    // Elle vise le cercle du numéro de l'étape en cours ; s'il est hors de l'écran, elle attend à mi-hauteur.
    const act = acts[Math.max(0, cur)], h = act.querySelector(".num") || act.querySelector("h2"), r = h.getBoundingClientRect();
    const ox = o.getBoundingClientRect().right;   // la position horizontale ne dépend pas du déplacement vertical
    const dedans = r.bottom > 0 && r.top < innerHeight;
    const target = dedans ? Math.max(90, Math.min(innerHeight - 130, r.top + r.height / 2 - 39)) : innerHeight * .42;
    const dy = target - y; y = calm ? target : y + dy * .12;
    o.style.transform = "translateY(" + y.toFixed(1) + "px)";
    o.classList.toggle("marche", Math.abs(dy) > 2);
    const oy = y + 40, tx = r.left + r.width * .2, ty = r.top + r.height / 2;
    const visible = dedans && tx > ox;
    beam.classList.toggle("on", visible);
    if (visible) {
      const len = Math.hypot(tx - ox, ty - oy), ang = Math.atan2(ty - oy, tx - ox);
      beam.style.width = len.toFixed(0) + "px";
      beam.style.transform = "translate(" + ox.toFixed(0) + "px, " + oy.toFixed(0) + "px) rotate(" + ang.toFixed(3) + "rad)";
    }
    if (Math.abs(dy) > .5) raf = requestAnimationFrame(step);
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(step); };
  addEventListener("scroll", go, { passive: true }); addEventListener("resize", go); addEventListener("etape", go); go();
  // Un clignement des yeux toutes les quelques secondes (ouvreuse et vendeuse), seulement si l'onglet est visible.
  if (!calm) setInterval(() => {
    if (document.hidden) return;
    document.querySelectorAll(".ouvreuse, .vendeuse").forEach((el) => { el.classList.add("cligne"); setTimeout(() => el.classList.remove("cligne"), 320); });
  }, 4600);
  o.addEventListener("click", () => {
    o.querySelector(".o-bulle").textContent = ["Par ici, je vous prie !", "Votre place est juste là.", "Pas de flash pendant la séance !", "Suivez ma lampe."][Math.floor(Math.random() * 4)];
    o.classList.remove("parle"); void o.offsetWidth; o.classList.add("parle");
    secret("ouvreuse"); sfx.click();
  });
})();
</script>
</body>
</html>`;
}
