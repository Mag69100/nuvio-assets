/**
 * L'écran Nuvio des aperçus, recopié de Nuvio TV 1.1.0-beta.7 (la version du guide) avec les réglages
 * conseillés de l'étape 9 : Vue moderne, thème Cramoisi, police Inter, cartes « Équilibré » à coins
 * « Pilule », Card Depth Effect, barre latérale moderne cachée (Hide Floating Pill), affiches maison.
 * Partagé par l'aperçu du hall et du guide (apercu.js) et par celui de la salle 2 (page.js) : les gens
 * voient partout le même accueil, celui qu'ils auront à la fin.
 *
 * Les mesures viennent du code de Nuvio TV (écran de référence 960 × 540 dp) : 1 dp = 1/9,6 cqw.
 */
import { parametresNuvio, POSTER_URL, APERCU_V } from "./reglages.js";
import { creerLienAffiches } from "./lien-affiches.js";

export const NUVIO_CSS = `/* ---------- L'écran Nuvio (Vue moderne, thème Cramoisi) ---------- */
.nvo { position: absolute; inset: 0; overflow: hidden; background: #0D0D0D; color: #fff; font-family: Inter, "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.nvo button { font-family: inherit; }
/* Le haut de l'accueil : il montre l'affiche sélectionnée (pas de carrousel, pas de bouton). */
/* z-index 0 : le haut forme sa propre couche, ses dégradés (z-index 2) restent sous les rangées qui défilent. */
.nvo-hero { position: absolute; z-index: 0; left: 0; right: 0; top: 0; height: 30.958cqw; pointer-events: none; }
.nvo.paysage .nvo-hero { height: 32.646cqw; }
.nvo-bd { position: absolute; top: 0; bottom: 0; left: 33.833cqw; width: 72cqw; overflow: hidden; }
.nvo-bd > i { position: absolute; inset: 0; background: center / cover no-repeat; background-position: right top; opacity: 0; transition: opacity .4s ease; }
.nvo-bd > i.on { opacity: 1; }
.nvo-bd::before, .nvo-bd::after { content: ""; position: absolute; z-index: 2; pointer-events: none; }
.nvo-bd::before { left: 0; top: 0; bottom: 0; width: 45%; background: linear-gradient(90deg, #0D0D0D, rgba(13,13,13,.86) 22%, rgba(13,13,13,.56) 46%, rgba(13,13,13,.16) 76%, rgba(13,13,13,0)); }
.nvo-bd::after { left: 0; right: 0; top: 82%; bottom: 0; background: linear-gradient(rgba(13,13,13,0), rgba(13,13,13,.25) 40%, rgba(13,13,13,.65) 75%, #0D0D0D); }
.nvo-video { position: absolute; z-index: 1; left: 50%; top: 50%; width: 72cqw; height: 40.5cqw; transform: translate(-50%, -50%) scale(1.35); opacity: 0; transition: opacity .48s ease; }
.nvo-video.on { opacity: 1; }
.nvo-video iframe { width: 100%; height: 100%; border: 0; display: block; pointer-events: none; }
.nvo-info { position: absolute; z-index: 3; left: 5.4167cqw; bottom: 5.625cqw; width: 37.625cqw; display: flex; flex-direction: column; align-items: flex-start; gap: .767cqw; transition: opacity .25s ease; }
.nvo.paysage .nvo-info { bottom: 5.625cqw; }
.nvo-info.attente { opacity: 0; }
.nvo-logo { width: 22.917cqw; height: 10.417cqw; object-fit: contain; object-position: left center; display: block; }
.nvo-titre { margin: 0; font: 600 2.683cqw/3.45cqw Inter, sans-serif; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.nvo.paysage .nvo-titre { font-size: 2.917cqw; line-height: 3.75cqw; }
.nvo-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .833cqw; font: 500 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .052cqw; color: #B3B3B3; }
.nvo-meta .pt { width: .4167cqw; height: .4167cqw; border-radius: 50%; background: rgba(128,128,128,.78); }
.nvo-meta .pastille { display: inline-flex; align-items: center; gap: .833cqw; padding: .417cqw .833cqw; border-radius: .625cqw; border: max(1px, .104cqw) solid rgba(255,255,255,.55); color: #fff; font-weight: 600; }
.nvo-meta .pastille i { width: max(1px, .104cqw); height: 1.25cqw; background: rgba(255,255,255,.55); }
.nvo-meta .langue { color: #808080; }
.nvo-imdb { display: inline-flex; align-items: center; gap: .417cqw; }
.nvo-imdb svg { width: 2.5cqw; height: auto; display: block; }
.nvo-resume { margin: 0; font: 400 1.3125cqw/1.875cqw Inter, sans-serif; letter-spacing: .026cqw; white-space: pre-line; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.nvo.paysage .nvo-resume { font-size: 1.458cqw; line-height: 2.083cqw; }
/* Les rangées : une rangée pleine à la fois, qui s'arrête sous le haut de l'écran. */
/* Les rangées restent toujours alignées comme sur la TV (une rangée pleine sous le haut de l'écran) : la molette
   et le pavé tactile avancent d'une rangée à la fois, comme la télécommande (voir pilote). */
.nvo-rangees { position: absolute; z-index: 1; left: 0; right: 0; top: 27cqw; bottom: 0; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; scroll-snap-type: y mandatory; overscroll-behavior: contain; padding-bottom: 29.25cqw; }
.nvo.paysage .nvo-rangees { top: 28.6875cqw; padding-bottom: 27.5625cqw; }
.nvo-rangees::-webkit-scrollbar { display: none; }
.nvo-rangee { scroll-snap-align: start; margin-bottom: 2.5cqw; }
.nvo-rangee h4 { margin: 0 0 1.458cqw; padding: 0 5.4167cqw; font: 600 1.667cqw/2.5cqw Inter, sans-serif; letter-spacing: .016cqw; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* Marge haute et basse de 3 cqw : la lueur des tuiles (flou de 28 dp) n'est pas rognée par la rangée. */
.nvo-piste { display: flex; gap: 1.25cqw; padding: 3cqw 5.4167cqw; margin: -3cqw 0; overflow-x: auto; scrollbar-width: none; scroll-padding: 0 5.4167cqw; cursor: grab; }
.nvo-piste::-webkit-scrollbar { display: none; }
.nvo-piste.tire { cursor: grabbing; user-select: none; }
.nvo-piste .vide { margin: 0; color: #808080; font-size: max(1.4cqw, 11px); }
/* Les cartes : 114 × 171 dp (Équilibré), coins Pilule (16 dp), liseré rouge quand elles sont sélectionnées. */
.nvo-carte, .nvo-tuile { position: relative; flex: none; padding: 0; border: 0; cursor: pointer; border-radius: 1.667cqw; background: #241A1A center / cover no-repeat; outline: none; }
.nvo-carte { width: 11.907cqw; height: 17.861cqw; }
.nvo.paysage .nvo-carte, .nvo-tuile { width: 21.809cqw; height: 12.321cqw; }
.nvo-carte::before, .nvo-tuile::before { content: ""; position: absolute; inset: 0; z-index: 2; border-radius: inherit; pointer-events: none; padding: max(1px, .104cqw);
  background: linear-gradient(rgba(255,255,255,.42), rgba(255,255,255,.139) 50%, rgba(255,255,255,0));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); }
.nvo-carte::after, .nvo-tuile::after { content: ""; position: absolute; inset: -.104cqw; z-index: 4; border-radius: 1.771cqw; border: .208cqw solid #FF5252; opacity: 0; pointer-events: none; }
.nvo-carte.focus, .nvo-tuile.focus { z-index: 1; }
.nvo-carte.focus::after, .nvo-tuile.focus::after { opacity: 1; }
.nvo-carte:focus-visible::after, .nvo-tuile:focus-visible::after { opacity: 1; }
.nvo-carte.attente { background-image: none !important; overflow: hidden; }
.nvo-carte.attente > .reflet { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(90deg, transparent 0, rgba(255,255,255,.07) 40%, rgba(255,255,255,.13) 50%, rgba(255,255,255,.07) 60%, transparent 100%) no-repeat;
  background-size: 31.25cqw 100%; animation: nvo-reflet 1.6s linear infinite; }
@keyframes nvo-reflet { from { background-position: -52cqw 0; } to { background-position: 52cqw 0; } }
/* Carte paysage sans affiches maison : dégradé et logo en bas à gauche */
.nvo-carte .sur { position: absolute; inset: 0; z-index: 1; display: none; border-radius: inherit; background: linear-gradient(rgba(0,0,0,0) 58%, rgba(0,0,0,.75)); }
.nvo.paysage:not(.pp) .nvo-carte.img .sur { display: block; }
.nvo-carte .sur img { position: absolute; left: 1.042cqw; bottom: .833cqw; max-width: 62%; max-height: 34%; object-fit: contain; object-position: left bottom; }
.nvo-carte .sur b { position: absolute; left: 1.042cqw; right: 1.042cqw; bottom: 1.25cqw; font: 500 1.667cqw/1.25 Inter, sans-serif; text-align: left; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
/* Tuiles des collections : image étirée, lueur de sa couleur et GIF quand elles sont sélectionnées */
.nvo-tuile { background-size: 100% 100%; transition: box-shadow .25s ease; }
.nvo-tuile.focus { box-shadow: 0 0 2.9cqw var(--lueur, rgba(255,255,255,.35)); }
.nvo-tuile > img { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: inherit; object-fit: fill; opacity: 0; transition: opacity .2s ease; }
.nvo-tuile > img.on { opacity: 1; }
/* La barre latérale moderne : cachée au repos, elle s'ouvre avec « Retour » (ou le bord gauche de l'écran). */
.nvo-bord { position: absolute; z-index: 5; left: 0; top: 0; bottom: 0; width: 1.6cqw; }
.nvo-menu { position: absolute; z-index: 8; left: 1.458cqw; top: 1.667cqw; width: 21.667cqw; height: 53.333cqw; padding: 1.458cqw 1.25cqw; border-radius: 3.125cqw; background: rgba(22,22,24,.97);
  display: flex; flex-direction: column; align-items: center; transform-origin: top left; animation: nvo-menu .345s cubic-bezier(.2,.9,.3,1) both; }
@keyframes nvo-menu { from { opacity: 0; transform: scale(.92, .97); } }
.nvo-menu > img { width: 72%; height: 3.75cqw; margin-top: 1.25cqw; object-fit: contain; }
.nvo-menu nav { flex: 1; width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: .625cqw; margin-top: -1.25cqw; }
.nvo-menu nav button { width: 92%; display: flex; align-items: center; gap: 1.458cqw; padding: 1.042cqw 1.458cqw; border: 0; border-radius: 99px; background: transparent; color: #fff; cursor: pointer; text-align: left;
  font: 400 1.667cqw Inter, sans-serif; letter-spacing: .052cqw; white-space: nowrap; transition: transform .18s ease, background .18s ease; outline: none; }
.nvo-menu nav button span { flex: none; width: 3.542cqw; height: 3.542cqw; display: grid; place-items: center; }
.nvo-menu nav button svg { width: 2.292cqw; height: 2.292cqw; fill: currentColor; }
.nvo-menu nav button[aria-current="page"] { background: rgba(229,57,53,.15); color: #E53935; }
.nvo-menu nav button:hover, .nvo-menu nav button:focus-visible { background: rgba(255,255,255,.12); transform: scale(1.1); }
.nvo-menu nav button[aria-current="page"]:hover, .nvo-menu nav button[aria-current="page"]:focus-visible { background: rgba(229,57,53,.28); }
.nvo-menu nav button:disabled { opacity: .45; cursor: default; transform: none; background: transparent; }
/* Boutons communs : liseré rouge et léger grossissement quand ils sont sélectionnés (boutons TV Material) */
.nvo .bt { border: 0; cursor: pointer; outline: none; transition: transform .18s ease, background .18s ease; }
.nvo .bt:hover, .nvo .bt:focus-visible, .nvo .bt.focus { transform: scale(1.1); box-shadow: 0 0 0 .208cqw #FF5252; }
/* ---------- La fiche (MetaDetailsScreen) : pas d'affiche, le fond à droite, le logo et des boutons ronds ---------- */
.nvo-fiche { position: absolute; inset: 0; z-index: 6; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; background: #0D0D0D; animation: nvo-fondu .3s ease both; }
.nvo-fiche::-webkit-scrollbar { display: none; }
@keyframes nvo-fondu { from { opacity: 0; } }
.nvo-fiche .fd { position: sticky; top: 0; height: 56.25cqw; margin-bottom: -56.25cqw; background: #0D0D0D right top / cover no-repeat; transition: opacity .4s ease; }
.nvo-fiche .fd::after { content: ""; position: absolute; inset: 0; transition: opacity .4s ease;
  background: linear-gradient(90deg, #0D0D0D 0, rgba(13,13,13,.95) 7.8%, rgba(13,13,13,.84) 17.16%, rgba(13,13,13,.7) 28.08%, rgba(13,13,13,.52) 40.56%, rgba(13,13,13,.34) 51.48%, rgba(13,13,13,.18) 60.84%, rgba(13,13,13,.07) 70.2%, rgba(13,13,13,0) 78%); }
.nvo-fiche.loin .fd { opacity: .15; }
.nvo-fiche.loin .fd::after { opacity: 0; }
.nvo-fiche .fv { position: sticky; top: 0; z-index: 0; height: 56.25cqw; margin-bottom: -56.25cqw; overflow: hidden; background: #000; animation: nvo-fondu .6s ease both; }
.nvo-fiche .fv iframe { width: 100%; height: 100%; border: 0; display: block; pointer-events: none; }
.nvo-fiche .fh { position: relative; z-index: 1; height: 56.25cqw; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; padding: 0 5cqw 1.667cqw; }
.nvo-fiche .flogo { height: 10.417cqw; padding-bottom: 1.667cqw; display: flex; align-items: center; }
.nvo-fiche .flogo img { max-width: 36cqw; max-height: 8.75cqw; object-fit: contain; object-position: left center; display: block; transform-origin: left bottom; transition: transform .6s ease; }
.nvo-fiche .ftitre { margin: 0 0 .833cqw; font: 700 3.75cqw/4.583cqw Inter, sans-serif; }
.nvo-fiche .fb { display: flex; align-items: center; gap: 1.25cqw; }
.nvo-fiche .lire { display: inline-flex; align-items: center; gap: .833cqw; padding: 1.458cqw 2.5cqw; border-radius: 3.333cqw; background: #fff; color: #000; font: 500 1.458cqw/2.083cqw Inter, sans-serif; }
.nvo-fiche .lire svg { width: 1.875cqw; height: 1.875cqw; fill: currentColor; }
.nvo-fiche .rond { width: 5cqw; height: 5cqw; border-radius: 50%; display: grid; place-items: center; background: #241A1A; color: #fff; }
.nvo-fiche .rond svg { width: 2.292cqw; height: 2.292cqw; fill: currentColor; }
.nvo-fiche .rond:hover, .nvo-fiche .rond:focus-visible, .nvo-fiche .rond.focus { background: #E53935; }
.nvo-fiche .rond:disabled { opacity: .45; cursor: default; transform: none; box-shadow: none; background: #241A1A; }
.nvo-fiche .fc { width: 60%; margin: 1.667cqw 0 1.25cqw; font: 500 1.458cqw/2.083cqw Inter, sans-serif; color: #B3B3B3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nvo-fiche .fs { width: 60%; margin: 0 0 1.25cqw; font: 400 1.458cqw/2.083cqw Inter, sans-serif; white-space: pre-line; display: -webkit-box; -webkit-line-clamp: 8; -webkit-box-orient: vertical; overflow: hidden; }
.nvo-fiche .fm { display: grid; gap: .833cqw; }
.nvo-fiche .fm > div { display: flex; flex-wrap: wrap; align-items: center; gap: 1.25cqw; }
.nvo-fiche .fm1 { min-height: 3.125cqw; font: 500 1.458cqw/2.083cqw Inter, sans-serif; color: #B3B3B3; }
.nvo-fiche .fm1 .nvo-imdb svg { width: 3.125cqw; }
.nvo-fiche .fm2 { font: 500 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .052cqw; color: #fff; }
.nvo-fiche .sep { color: #808080; }
.nvo-fiche .badge { display: inline-flex; align-items: center; gap: .833cqw; padding: .417cqw .833cqw; border-radius: .625cqw; border: max(1px, .104cqw) solid rgba(179,179,179,.55); }
.nvo-fiche .astuce { font: 500 1.25cqw/1.667cqw Inter, sans-serif; color: #808080; }
.nvo-fiche.ba .fd { opacity: 0; }
/* Le logo rétrécit (boîte de 60 dp au lieu de 84 dp), sans animer la mise en page */
.nvo-fiche.ba .flogo img { transform: translateY(-.833cqw) scale(.71); }
.nvo-fiche.ba .fh > :not(.flogo):not(.astuce), .nvo-fiche.ba .fbas { opacity: 0; pointer-events: none; }
.nvo-fiche .fh > *, .nvo-fiche .fbas { transition: opacity .4s ease; }
.nvo-fiche .fbas { position: relative; z-index: 1; padding-bottom: 4cqw; background: #0D0D0D; }
/* Saisons et épisodes */
.nvo-fiche .saisons { display: flex; gap: 1.25cqw; padding: 2.5cqw 5cqw; overflow-x: auto; scrollbar-width: none; }
.nvo-fiche .saisons button { flex: none; padding: 1.042cqw 2.083cqw; border-radius: 2.083cqw; background: #241A1A; color: #B3B3B3; font: 500 1.667cqw/2.5cqw Inter, sans-serif; }
.nvo-fiche .saisons button[aria-pressed="true"] { background: #2D2D2D; color: #fff; }
.nvo-fiche .saisons button:hover, .nvo-fiche .saisons button:focus-visible { background: #E53935; color: #fff; transform: none; }
.nvo-fiche .episodes { display: flex; gap: 1.667cqw; padding: 1.667cqw 5cqw; overflow-x: auto; scrollbar-width: none; }
.nvo-fiche .episodes::-webkit-scrollbar, .nvo-fiche .saisons::-webkit-scrollbar, .nvo-fiche .ligne::-webkit-scrollbar { display: none; }
.nvo-fiche .ep { position: relative; flex: none; width: 33.333cqw; height: 21.563cqw; border-radius: 1.667cqw; overflow: hidden; background: #241A1A; }
.nvo-fiche .ep > img { position: absolute; inset: -4%; width: 108%; height: 108%; object-fit: cover; filter: blur(.6cqw); }
.nvo-fiche .ep::after { content: ""; position: absolute; inset: 0; opacity: .94; background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,.04) 20%, rgba(0,0,0,.26) 38%, rgba(0,0,0,.56) 54%, rgba(0,0,0,.76) 70%, rgba(0,0,0,.88) 86%, rgba(0,0,0,.95)); }
.nvo-fiche .ep .rond-vu { position: absolute; z-index: 1; left: 1.25cqw; top: 1.25cqw; width: 2.5cqw; height: 2.5cqw; border-radius: 50%; border: .208cqw dashed rgba(179,179,179,.9); }
.nvo-fiche .ep .tx { position: absolute; z-index: 1; left: 1.667cqw; right: 1.667cqw; bottom: 2.083cqw; display: grid; gap: .625cqw; justify-items: start; }
.nvo-fiche .ep .num { padding: .417cqw .833cqw; border-radius: .625cqw; background: rgba(0,0,0,.42); color: rgba(255,255,255,.9); font: 600 1.042cqw/1.458cqw Inter, sans-serif; letter-spacing: .094cqw; }
.nvo-fiche .ep b { font: 800 1.667cqw/2.292cqw Inter, sans-serif; text-shadow: 0 1px 1px rgba(0,0,0,.6); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.nvo-fiche .ep p { margin: 0; font: 400 1.25cqw/1.875cqw Inter, sans-serif; color: rgba(255,255,255,.9); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.nvo-fiche .ep .inf { width: 100%; display: flex; align-items: center; gap: 1.25cqw; font: 500 1.042cqw/1.458cqw Inter, sans-serif; color: #B3B3B3; }
.nvo-fiche .ep .inf .nvo-imdb { color: #F5C518; font-weight: 600; }
.nvo-fiche .ep .inf .nvo-imdb svg { width: 2.5cqw; }
.nvo-fiche .ep .inf .date { margin-left: auto; }
/* Onglets du bas : Créateur et distribution | Bande-annonce… */
.nvo-fiche .onglets { display: flex; flex-wrap: wrap; align-items: center; padding: 2.083cqw 5cqw 1.25cqw; font: 500 2.083cqw/2.917cqw Inter, sans-serif; }
.nvo-fiche .onglets button { padding: 0; border: 0; background: none; color: rgba(255,255,255,.55); font: inherit; cursor: pointer; transition: transform .18s ease; outline: none; }
.nvo-fiche .onglets button[aria-pressed="true"] { color: rgba(255,255,255,.92); }
.nvo-fiche .onglets button:hover, .nvo-fiche .onglets button:focus-visible { color: #fff; transform: scale(1.03); }
.nvo-fiche .onglets i { font-style: normal; color: rgba(255,255,255,.45); padding: 0 1.042cqw; }
.nvo-fiche .ligne { display: flex; padding: .625cqw 5cqw; overflow-x: auto; scrollbar-width: none; }
.nvo-fiche .pers { flex: none; width: 15.625cqw; margin-right: .833cqw; display: grid; justify-items: center; text-align: center; align-content: start; }
.nvo-fiche .pers i { width: 10.417cqw; height: 10.417cqw; border-radius: 50%; background: #2D2D2D center / cover no-repeat; display: grid; place-items: center; font: normal 500 2.083cqw Inter, sans-serif; color: #fff; }
.nvo-fiche .pers b { margin-top: 1.042cqw; font: 500 1.25cqw/1.667cqw Inter, sans-serif; color: #B3B3B3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.nvo-fiche .pers small { margin-top: .417cqw; font: 500 1.042cqw/1.458cqw Inter, sans-serif; color: #808080; }
.nvo-fiche .pers.trait { width: max(1px, .104cqw); height: 7.5cqw; margin: 1.5cqw 1.667cqw 0 .833cqw; background: rgba(45,45,45,.9); }
.nvo-fiche .vid { flex: none; width: 27.083cqw; margin-right: 1.25cqw; display: grid; gap: .833cqw; text-align: left; padding: 0; border: 0; background: none; color: #808080; cursor: pointer; font: 400 1.25cqw/1.667cqw Inter, sans-serif; outline: none; }
.nvo-fiche .vid i { height: 15.208cqw; border-radius: 1.667cqw; background: #241A1A center / cover no-repeat; }
.nvo-fiche .vid:hover i, .nvo-fiche .vid:focus-visible i { box-shadow: 0 0 0 .208cqw #FF5252; }
/* ---------- Recherche et Bibliothèque ---------- */
.nvo-vue { position: absolute; inset: 0; z-index: 4; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; background: #0D0D0D; padding-bottom: 4cqw; animation: nvo-fondu .25s ease both; }
.nvo-vue::-webkit-scrollbar { display: none; }
.nvo-rech .champ { display: flex; align-items: center; gap: 1.25cqw; padding: 1.667cqw 5cqw 0; }
.nvo-rech .micro { flex: none; width: 5.833cqw; height: 5.833cqw; margin: .833cqw; border-radius: 1.25cqw; display: grid; place-items: center; background: #241A1A; border: max(1px, .104cqw) solid #333; color: #fff; }
.nvo-rech .micro svg { width: 2.5cqw; height: 2.5cqw; fill: currentColor; }
.nvo-rech .micro:hover, .nvo-rech .micro:focus-visible { border-color: #FF5252; box-shadow: 0 0 0 .104cqw #FF5252; transform: none; }
.nvo-rech input { flex: 1; min-width: 0; height: 5.833cqw; padding: 0 1.667cqw; border-radius: 1.25cqw; border: max(1px, .104cqw) solid #333; background: #241A1A; color: #fff; outline: none; font: 400 max(1.667cqw, 12px) Inter, sans-serif; }
.nvo-rech input::placeholder { color: #808080; }
.nvo-rech input::-webkit-search-cancel-button { -webkit-appearance: none; display: none; }
.nvo-rech .micro { font: 400 2.083cqw Inter, sans-serif; }
.nvo-rech input:focus { border-color: #FF5252; box-shadow: 0 0 0 .104cqw #FF5252; }
.nvo-etat { height: 41.667cqw; display: grid; place-content: center; justify-items: center; text-align: center; }
.nvo-etat svg { width: 8.333cqw; height: 8.333cqw; fill: #808080; }
.nvo-etat b { margin-top: 2.5cqw; font: 400 2.5cqw/3.333cqw Roboto, "Segoe UI", system-ui, sans-serif; color: #fff; }
.nvo-etat span { margin-top: .833cqw; font: 400 1.458cqw/2.083cqw Inter, sans-serif; color: #B3B3B3; }
.nvo-res { margin-top: 1.667cqw; }
.nvo-res header { padding: 0 5cqw; margin-bottom: 1.25cqw; }
.nvo-res h4 { margin: 0; font: 600 2.5cqw/3.333cqw Inter, sans-serif; }
.nvo-res header span { display: block; margin-top: .417cqw; font: 500 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .052cqw; color: #808080; }
.nvo-res .piste { display: flex; gap: 1.667cqw; padding: .3cqw 20.833cqw .3cqw 5cqw; overflow-x: auto; scrollbar-width: none; }
.nvo-res .piste::-webkit-scrollbar { display: none; }
.nvo-res .vide { margin: 0; padding: 0 5cqw; color: #808080; font-size: max(1.4cqw, 11px); }
.nvo-item { flex: none; width: 13.125cqw; padding: 0; border: 0; background: none; color: #fff; text-align: left; cursor: pointer; outline: none; }
.nvo-item .nvo-carte { width: 13.125cqw; height: 19.6875cqw; transition: transform .18s ease; }
.nvo-item:hover .nvo-carte, .nvo-item:focus-visible .nvo-carte { transform: scale(1.02); }
.nvo-item:hover .nvo-carte::after, .nvo-item:focus-visible .nvo-carte::after { opacity: 1; }
.nvo-item b { display: block; margin-top: .833cqw; font: 500 1.667cqw/2.5cqw Inter, sans-serif; letter-spacing: .016cqw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nvo-item small { display: block; margin-top: .208cqw; font: 500 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .052cqw; color: #B3B3B3; }
/* Tuile ouverte : vignette 64 × 36 dp, titre, onglets (le sélectionné en pastille blanche), grille de 6 colonnes */
.nvo-dossier { padding-top: 2.5cqw; }
.nvo-dossier header { display: flex; align-items: center; gap: 1.25cqw; padding: .833cqw 5cqw; }
.nvo-dossier header img { flex: none; width: 6.667cqw; height: 3.75cqw; border-radius: .833cqw; object-fit: fill; }
.nvo-dossier h3 { flex: none; max-width: 31.25cqw; margin: 0; font: 600 2.5cqw/3.333cqw Inter, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nvo-dossier .ongs { flex: 1; display: flex; gap: .417cqw; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.nvo-dossier .ongs::-webkit-scrollbar { display: none; }
.nvo-dossier .ongs button { flex: none; }
.nvo-dossier .ongs button { padding: .833cqw 1.667cqw; border: 0; border-radius: 99px; background: transparent; color: #B3B3B3; cursor: pointer; outline: none; font: 500 1.458cqw/2.083cqw Inter, sans-serif; white-space: nowrap; }
.nvo-dossier .ongs button[aria-selected="true"] { background: #fff; color: #0D0D0D; }
.nvo-dossier .ongs button:focus-visible { box-shadow: 0 0 0 .208cqw #FF5252; }
.nvo-dossier .grille { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 1.667cqw; padding: 1.667cqw 5cqw 5cqw; }
.nvo.paysage .nvo-dossier .grille { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.nvo-dossier .nvo-item { width: auto; }
.nvo-dossier .nvo-item .nvo-carte { width: 100%; height: 19.6875cqw; }
.nvo.paysage .nvo-dossier .nvo-item .nvo-carte { height: auto; aspect-ratio: 16 / 9; }
.nvo-dossier .vide { grid-column: 1 / -1; margin: 4cqw 0; text-align: center; color: #B3B3B3; font-size: max(1.458cqw, 11px); }
.nvo-dossier .fin { display: block; height: 1px; }
.nvo-biblio { padding: 2.5cqw 5cqw 3.333cqw; }
.nvo-biblio header { display: flex; justify-content: space-between; align-items: baseline; }
.nvo-biblio h3 { margin: 0; font: 600 2.5cqw/3.333cqw Inter, sans-serif; }
.nvo-biblio header span { font: 500 1.458cqw Inter, sans-serif; letter-spacing: .208cqw; color: #808080; }
.nvo-biblio .modes { display: flex; gap: 1.25cqw; margin-top: 1.667cqw; }
.nvo-biblio .modes span { padding: 1.042cqw 2.083cqw; border-radius: 99px; background: #241A1A; font: 500 1.458cqw/2.083cqw Inter, sans-serif; }
.nvo-biblio .modes span:first-child { background: #3D1A1A; }
.nvo-biblio .filtres { display: grid; grid-template-columns: 1fr 1fr; gap: 1.042cqw; margin-top: 1.667cqw; }
.nvo-biblio .filtres div { display: flex; align-items: center; justify-content: space-between; padding: 1.042cqw 1.458cqw; border-radius: 1.458cqw; background: #241A1A; border: max(1px, .104cqw) solid #333; }
.nvo-biblio .filtres div.seul { grid-column: 1 / -1; justify-self: start; min-width: 30%; }
.nvo-biblio .filtres small { display: block; font: 500 1.042cqw/1.458cqw Inter, sans-serif; color: #808080; }
.nvo-biblio .filtres b { font: 500 1.667cqw/2.5cqw Inter, sans-serif; }
.nvo-biblio .filtres i { font-style: normal; color: #B3B3B3; font-size: 1.667cqw; }
.nvo-biblio .grille { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 1.667cqw 1.25cqw; margin-top: 2.5cqw; }
.nvo-biblio .nvo-etat { height: 30cqw; }
/* ---------- Découvrir (DiscoverScreen) : titre, trois listes et la ligne d'infos fixes, la grille défile dessous ---------- */
.nvo-vue.nvo-dec { display: flex; flex-direction: column; gap: 1.25cqw; padding: 1.667cqw 5cqw 0; overflow: hidden; outline: none; }
.nvo-dec h3 { flex: none; margin: 0; font: 600 2.5cqw/3.333cqw Inter, sans-serif; }
.nvo-dec .filtres { flex: none; display: flex; gap: 1.25cqw; }
.nvo-dec .choix { box-sizing: border-box; flex: 1 1 0; min-width: 0; height: 6.25cqw; padding: 1.042cqw 1.458cqw; display: flex; flex-direction: column; gap: .208cqw; border-radius: 1.458cqw; border: max(1px, .104cqw) solid #333; background: #241A1A; color: #fff; text-align: left; cursor: pointer; outline: none; }
.nvo-dec .choix small { font: 500 1.042cqw/1.458cqw Inter, sans-serif; letter-spacing: .052cqw; color: #808080; }
.nvo-dec .choix > span { display: flex; align-items: center; justify-content: space-between; gap: .833cqw; min-width: 0; }
.nvo-dec .choix b { min-width: 0; font: 500 1.667cqw/2.5cqw Inter, sans-serif; letter-spacing: .016cqw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nvo-dec .choix i { flex: none; display: flex; }
.nvo-dec .choix svg { width: 2.083cqw; height: 2.083cqw; fill: #B3B3B3; }
.nvo-dec .choix.focus { background: #3D1A1A; border-color: #FF5252; box-shadow: inset 0 0 0 max(1px, .104cqw) #FF5252; }
.nvo-dec .choix.focus svg { fill: #FF5252; }
.nvo-dec .infos { flex: none; margin: 0; font: 400 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .042cqw; color: #B3B3B3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nvo-dec .infos:empty { display: none; }
/* La grille (6 colonnes adaptatives de 126 dp, 10 dp entre les colonnes, 16 dp entre les lignes) */
.nvo-dec .defile { position: relative; flex: 1; min-height: 0; margin: 0 -5cqw; padding: 0 5cqw; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
.nvo-dec .defile::-webkit-scrollbar { display: none; }
.nvo-dec .grille { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); column-gap: 1.042cqw; row-gap: 1.667cqw; align-items: start; padding-bottom: 3.333cqw; }
.nvo.paysage .nvo-dec .grille { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.nvo-dec .nvo-item { width: 13.125cqw; padding-top: .3125cqw; }
/* Paysage : la largeur de la grille (126 dp) l'emporte sur celle des cartes paysage de l'accueil ; la carte passe en 16:9 (126 × 71 dp). */
.nvo.paysage .nvo-dec .nvo-carte { width: 13.125cqw; height: 7.383cqw; }
.nvo-dec .nvo-item b { padding: 0 .208cqw; }
.nvo-dec .nvo-item b span { display: inline; }
.nvo-dec .nvo-item:hover .nvo-carte { transform: none; }
.nvo-dec .nvo-item:hover .nvo-carte::after { opacity: 0; }
.nvo-dec .nvo-item.focus .nvo-carte { transform: scale(1.02); }
.nvo-dec .nvo-item.focus .nvo-carte::after { opacity: 1; }
/* Le titre trop long défile quand l'affiche est sélectionnée (45 dp/s, 3 passages) */
.nvo-dec .nvo-item b.defil { text-overflow: clip; }
.nvo-dec .nvo-item b.defil span { display: inline-block; padding-right: var(--g); animation: nvo-defil var(--t) linear 1.2s 3; }
@keyframes nvo-defil { to { transform: translateX(var(--x)); } }
/* « Charger plus » : une carte de la taille d'une affiche */
.nvo-dec .action { box-sizing: border-box; width: 13.125cqw; height: 19.6875cqw; margin-top: .3125cqw; padding: 0; border: 0; border-radius: 1.667cqw; display: grid; place-items: center; background: #241A1A; color: #fff; font: 500 1.667cqw/2.5cqw Inter, sans-serif; letter-spacing: .016cqw; cursor: pointer; outline: none; transition: transform .18s ease; }
.nvo.paysage .nvo-dec .action { height: 7.383cqw; }
.nvo-dec .action.focus { background: #3D1A1A; box-shadow: inset 0 0 0 .208cqw #FF5252; transform: scale(1.02); }
.nvo-dec .action:disabled { cursor: default; }
.nvo-dec .charge { grid-column: 1 / -1; display: grid; place-items: center; padding: 2.917cqw 0; }
.nvo-dec .grille > .nvo-etat { grid-column: 1 / -1; }
.nvo-spin { width: 5cqw; height: 5cqw; animation: nvo-tourne 2s linear infinite; }
.nvo-spin circle { fill: none; stroke: #E53935; stroke-width: 5.1; stroke-linecap: round; stroke-dasharray: 1 97; animation: nvo-arc 2s ease-in-out infinite; }
@keyframes nvo-tourne { to { transform: rotate(360deg); } }
@keyframes nvo-arc { 0% { stroke-dasharray: 1 97; stroke-dashoffset: 0; } 50% { stroke-dasharray: 70 97; stroke-dashoffset: -14; } 100% { stroke-dasharray: 1 97; stroke-dashoffset: -96; } }
/* La liste ouverte (DropdownMenu) : sous la case, de sa largeur, 320 dp au plus */
.nvo-liste { position: absolute; z-index: 3; box-sizing: border-box; max-height: 33.333cqw; padding: .833cqw 0; overflow-y: auto; scrollbar-width: none; border-radius: 1.458cqw; border: max(1px, .104cqw) solid #333; background: #241A1A;
  box-shadow: 0 .833cqw 2.5cqw rgba(0,0,0,.55); transform-origin: top center; animation: nvo-liste .12s ease-out both; }
.nvo-liste::-webkit-scrollbar { display: none; }
@keyframes nvo-liste { from { opacity: 0; transform: scale(.8); } }
.nvo .nvo-liste button { display: block; box-sizing: border-box; width: calc(100% - 1.25cqw); min-height: 5cqw; margin: .208cqw .625cqw; padding: 0 1.25cqw; border: 0; border-radius: 1.042cqw; background: transparent; color: #fff; text-align: left; cursor: pointer; outline: none;
  font: 400 1.458cqw/5cqw Roboto, "Segoe UI", system-ui, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nvo .nvo-liste button[aria-selected="true"] { background: #3D1A1A; }
.nvo .nvo-liste button.focus { background: #E53935; }
/* ---------- Paramètres (SettingsScreen, style « Par défaut ») : une carte de 28 dp, rubriques à gauche (220 dp), écran à droite ---------- */
.nvo-vue.nvo-par { box-sizing: border-box; padding: 2.5cqw 3.333cqw; overflow: hidden; outline: none; }
.np-surf { box-sizing: border-box; height: 100%; display: flex; gap: 1.667cqw; padding: 2.083cqw; border-radius: 2.917cqw; background: #1A1A1A; border: max(1px, .104cqw) solid #333; }
.np-surf svg { flex: none; fill: currentColor; }
.np-rail { position: relative; flex: none; width: 22.917cqw; display: flex; flex-direction: column; min-height: 0; }
.np-rliste { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: safe center; gap: 1.042cqw; overflow-y: auto; scrollbar-width: none; }
.np-rliste::-webkit-scrollbar { display: none; }
.np-sep { flex: none; height: max(1px, .104cqw); margin: 0 1.875cqw; background: #333; }
.nvo .np-ru { box-sizing: border-box; flex: none; display: flex; align-items: center; gap: 1.042cqw; min-height: 5.833cqw; margin: .208cqw 0; padding: 0 1.875cqw; border: 0; border-radius: 99px; background: #0D0D0D; color: #B3B3B3; cursor: pointer; outline: none; text-align: left;
  font: 500 1.667cqw/2.5cqw Inter, sans-serif; letter-spacing: .016cqw; }
.np-ru .np-ico { width: 1.875cqw; height: 1.875cqw; }
.np-ru span { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.np-ru .np-chev { width: 1.875cqw; height: 1.875cqw; color: #808080; }
.nvo .np-ru.sel { background: #241A1A; color: #fff; font-weight: 600; box-shadow: inset 0 0 0 max(1px, .104cqw) #FF5252; }
.nvo .np-ru.focus { background: #241A1A; color: #fff; font-weight: 600; box-shadow: inset 0 0 0 .208cqw #FF5252; }
.nvo .np-rail.actif .np-ru.sel:not(.focus) { background: #0D0D0D; box-shadow: none; }
.np-fl { position: absolute; left: 50%; width: 3.333cqw; height: 3.333cqw; margin-left: -1.667cqw; color: rgba(179,179,179,.55); opacity: 0; transition: opacity .15s; pointer-events: none; }
.np-fl svg { width: 100%; height: 100%; }
.np-fl.haut { top: .208cqw; } .np-fl.bas { bottom: .208cqw; } .np-fl.on { opacity: 1; }
/* L'écran de droite */
.np-pane { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 1.458cqw; }
.np-pane.tout { overflow-y: auto; scrollbar-width: none; }
.np-pane [tabindex] { outline: none; }
.np-pane.tout > * { flex: none; }
.np-pane::-webkit-scrollbar, .np-defile::-webkit-scrollbar, .np-swatches::-webkit-scrollbar { display: none; }
.np-tete { flex: none; display: grid; gap: .625cqw; }
.np-tete h3 { margin: 0; font: 600 2.5cqw/3.333cqw Inter, sans-serif; }
.np-tete p { margin: 0; font: 400 1.458cqw/2.083cqw Inter, sans-serif; letter-spacing: .026cqw; color: #B3B3B3; }
.np-corps { display: flex; flex-direction: column; gap: 1.458cqw; }
.np-pane:not(.tout) .np-corps { flex: 1; min-height: 0; }
.np-pane:not(.tout) .np-corps > .np-group { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; }
/* Carte de groupe : 18 dp, fond des cartes, liseré, 14 dp de marge, 10 dp entre les lignes */
.np-group { box-sizing: border-box; display: flex; flex-direction: column; gap: 1.042cqw; padding: 1.458cqw; border-radius: 1.875cqw; background: #241A1A; border: max(1px, .104cqw) solid #333; }
.np-group > *, .np-kbox > * { flex: none; }
.np-gh { margin: 0; display: grid; gap: .208cqw; }
.np-gh b { font: 500 1.667cqw/2.5cqw Inter, sans-serif; letter-spacing: .016cqw; }
.np-gh small { font: 400 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .042cqw; color: #B3B3B3; }
/* Une ligne : pilule sur le fond de l'appli, 62 dp de haut ; liseré rouge de 2 dp quand elle est sélectionnée */
.np-row { box-sizing: border-box; display: flex; align-items: center; gap: 1.25cqw; min-height: 6.458cqw; padding: 1.25cqw 1.875cqw; border-radius: 99px; background: #0D0D0D; cursor: pointer; outline: none; }
.np-row.focus, .np-url.focus { box-shadow: inset 0 0 0 .208cqw #FF5252; }
.np-row > .np-ico { width: 2.5cqw; height: 2.5cqw; margin-right: .417cqw; color: #B3B3B3; }
.np-row.focus > .np-ico { color: #fff; }
.np-row > .np-logo { width: 2.5cqw; height: 2.5cqw; margin-right: .417cqw; }
.np-row > .np-logo.grand { width: 4.167cqw; height: 4.167cqw; }
.np-row.dim { opacity: .4; cursor: default; }
.np-txt { flex: 1; min-width: 0; display: grid; gap: .208cqw; }
.np-txt b { font: 400 1.667cqw/2.5cqw Inter, sans-serif; letter-spacing: .052cqw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.np-txt small { font: 400 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .042cqw; color: #B3B3B3; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.np-val { flex: none; display: flex; align-items: center; gap: 1.042cqw; max-width: 27.083cqw; margin-left: -.208cqw; font: 500 1.458cqw/2.083cqw Inter, sans-serif; color: #B3B3B3; white-space: nowrap; }
.np-val .np-chev { width: 1.875cqw; height: 1.875cqw; color: #808080; }
/* Interrupteur : rail de 46 × 24 dp, bouton blanc de 20 dp ; activé = rail rouge à 35 % */
.np-tg { position: relative; flex: none; box-sizing: border-box; width: 4.792cqw; height: 2.5cqw; border-radius: 99px; background: #333; transition: background .15s; }
.np-tg::after { content: ""; position: absolute; top: .208cqw; left: .208cqw; width: 2.083cqw; height: 2.083cqw; border-radius: 50%; background: #fff; transition: left .15s; }
.np-tg.on { background: rgba(229,57,53,.35); }
.np-tg.on::after { left: calc(100% - 2.292cqw); }
.np-dot { flex: none; width: 2.5cqw; height: 2.5cqw; border-radius: 50%; box-shadow: 0 0 0 max(1px, .104cqw) #333; }
/* Curseur : valeur en gris clair, rail de 8 dp, boutons ronds − et + de 38 dp */
.np-row.np-slider { display: grid; gap: 1.042cqw; border-radius: 1.875cqw; }
.np-sl-top { display: flex; align-items: center; gap: 1.25cqw; }
.np-sl-top .np-val { font: 400 1.667cqw/2.5cqw Inter, sans-serif; letter-spacing: .052cqw; color: #9E9E9E; }
.np-sl { display: flex; align-items: center; gap: 1.25cqw; }
.np-sl > i { flex: none; width: 3.958cqw; height: 3.958cqw; border-radius: 50%; display: grid; place-items: center; background: #1A1A1A; }
.np-sl > i svg { width: 2.083cqw; height: 2.083cqw; }
.np-track { flex: 1; height: .833cqw; border-radius: .417cqw; background: #1A1A1A; overflow: hidden; }
.np-track span { display: block; height: 100%; border-radius: inherit; background: #9E9E9E; }
/* Sections repliables (« Fermé › » / « Ouvert ⌄ ») : le contenu dans une carte en retrait de 16 dp */
.np-sec .np-chev { transition: transform .2s; }
.np-secw.open .np-sec .np-chev { transform: rotate(90deg); }
.np-kids { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .2s ease; }
.np-secw.open .np-kids { grid-template-rows: 1fr; }
.np-kin { min-height: 0; overflow: hidden; }
.np-kbox { display: flex; flex-direction: column; gap: 1.042cqw; margin: 1.042cqw 0 .208cqw 1.667cqw; padding: 1.458cqw; border-radius: 1.875cqw; border: max(1px, .104cqw) solid #333; background: #241A1A; }
.np-h { margin: 1.25cqw 1.875cqw .208cqw; display: grid; gap: .208cqw; font: 500 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .125cqw; text-transform: uppercase; color: #808080; }
.np-h small { font: 400 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .042cqw; text-transform: none; color: #B3B3B3; }
.np-h small.warn { color: #FFB74D; }
.np-p { margin: 0; font: 400 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .042cqw; color: #B3B3B3; }
.np-note { margin: 0; padding: 0 1.25cqw; font: 400 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .042cqw; color: #808080; }
.np-url { padding: 1.042cqw 1.458cqw; border-radius: 1.25cqw; background: #0D0D0D; font: 400 1.146cqw/1.6 ui-monospace, Consolas, monospace; color: #B3B3B3; word-break: break-all; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; cursor: pointer; }
/* Bouton « Connexion par code QR » (Compte) : il grossit un peu quand il est sélectionné */
.np-row.np-bouton { min-height: 0; padding: 1.042cqw 1.458cqw; border-radius: .833cqw; background: #241A1A; transition: transform .15s; }
.np-row.np-bouton > .np-ico { width: 2.292cqw; height: 2.292cqw; }
.np-bouton .np-txt b { font: 500 1.458cqw/2.083cqw Inter, sans-serif; letter-spacing: .026cqw; }
.np-bouton .np-txt small { font-size: 1.146cqw; }
.np-row.np-bouton.focus { background: #3D1A1A; transform: scale(1.02); }
/* Puces (largeur, rayon, réglages « Apply to ») : la choisie sur fond rouge à 20 % avec un liseré */
.np-chips, .np-apply { display: grid; gap: .833cqw; padding: .208cqw 0; }
.np-chips > span:first-child { padding: 0 .833cqw; font: 400 1.667cqw/2.5cqw Inter, sans-serif; letter-spacing: .052cqw; }
.np-apply > span:first-child { padding: 0 .833cqw; font: 500 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .125cqw; color: #808080; }
.np-chip-row { display: flex; flex-wrap: wrap; gap: .833cqw; }
.np-chip-row i { font-style: normal; display: inline-flex; align-items: center; gap: .833cqw; padding: 1.042cqw 1.667cqw; border-radius: 99px; background: #0D0D0D; color: #B3B3B3; cursor: pointer; font: 500 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .052cqw; }
.np-chip-row i.sel { background: rgba(255,82,82,.2); color: #fff; box-shadow: inset 0 0 0 max(1px, .104cqw) #FF5252; }
.np-chip-row i.focus { color: #fff; box-shadow: inset 0 0 0 max(1px, .104cqw) #FF5252; }
.np-apply .np-tg { width: 3.333cqw; height: 1.875cqw; }
.np-apply .np-tg::after { width: 1.458cqw; height: 1.458cqw; }
.np-apply .np-tg.on::after { left: calc(100% - 1.667cqw); }
/* Cartes à choisir (style des paramètres, disposition de l'accueil, Continuer à regarder) */
.np-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.042cqw; }
.np-card { position: relative; display: grid; gap: .417cqw; align-content: start; padding: 1.25cqw; border-radius: 1.875cqw; background: #0D0D0D; cursor: pointer; }
.np-card b { display: flex; align-items: center; justify-content: space-between; gap: .417cqw; font: 500 1.458cqw/2.083cqw Inter, sans-serif; }
.np-card small { font: 400 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .042cqw; color: #808080; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.np-card.sel { box-shadow: inset 0 0 0 max(1px, .104cqw) #FF5252; }
.np-card.focus { box-shadow: inset 0 0 0 .208cqw #FF5252; }
.np-coche { display: none; color: #E53935; }
.np-coche svg { width: 1.667cqw; height: 1.667cqw; }
.np-card.sel .np-coche { display: inline-flex; }
.np-layout .np-card { padding: 1.042cqw; }
.np-layout .np-card.sel .np-coche { color: #FF5252; }
.np-art { display: grid; gap: .313cqw; height: 6cqw; padding: .521cqw; border-radius: 1.042cqw; background: #1A1A1A; }
.np-layout .np-art { height: 11.667cqw; }
.np-art i { border-radius: .313cqw; background: #2D2D2D; }
.np-layout .np-card:nth-child(1) .np-art { grid-template-columns: repeat(4, 1fr); grid-template-rows: 1.6fr 1fr; }
.np-layout .np-card:nth-child(1) .np-art i:first-child { grid-column: span 4; background: #3A3A3A; }
.np-layout .np-card:nth-child(2) .np-art { grid-template-columns: repeat(5, 1fr); }
.np-layout .np-card:nth-child(3) .np-art { grid-template-columns: repeat(4, 1fr); }
.np-cw .np-art { justify-items: center; align-items: center; }
.np-cw .np-card:nth-child(1) .np-art { grid-template-columns: 1.4fr 1fr; }
.np-cw .np-card:nth-child(1) .np-art i { width: 100%; height: 80%; }
.np-cw .np-card:nth-child(2) .np-art i { width: 90%; height: 70%; }
.np-cw .np-card:nth-child(3) .np-art i { width: 30%; height: 100%; }
/* Nuancier : cartes de 96 dp, rond de 40 dp avec une coche sur le thème choisi */
.np-swatches { position: relative; display: flex; gap: 1.042cqw; padding: .417cqw; overflow-x: auto; scrollbar-width: none; }
.np-sw { flex: none; box-sizing: border-box; width: 10cqw; padding: 1.25cqw .833cqw; display: grid; justify-items: center; gap: .833cqw; border-radius: 1.875cqw; background: #0D0D0D; color: #B3B3B3; cursor: pointer;
  font: 500 1.25cqw/1.667cqw Inter, sans-serif; letter-spacing: .052cqw; }
.np-sw i { width: 4.167cqw; height: 4.167cqw; border-radius: 50%; display: grid; place-items: center; }
.np-sw i svg { width: 2.083cqw; height: 2.083cqw; }
.np-sw.sel { color: #fff; }
.np-sw.focus { color: #fff; box-shadow: inset 0 0 0 .208cqw #FF5252; }
/* À propos */
.np-about { display: grid; justify-items: center; gap: 1.042cqw; padding: .417cqw 0 .208cqw; text-align: center; }
.np-about img { height: 4.167cqw; width: auto; }
.np-about b { font: 700 2.5cqw/4.167cqw Inter, sans-serif; letter-spacing: .2cqw; }
.np-about small { font: 500 1.042cqw/1.458cqw Inter, sans-serif; letter-spacing: .052cqw; color: #B3B3B3; }
@media (prefers-reduced-motion: reduce) { .nvo-menu, .nvo-liste { animation: none; } .nvo-carte.attente > .reflet { animation: none; } }
`;

// Les écrans de Paramètres (ceux du motion design de l'étape 9) pour l'aperçu : classes « np- », sans les bulles,
// et sans « < » brut (le script est écrit dans la page).
const parametresJSON = (posterUrl) => {
  const { rubriques, pages } = parametresNuvio(posterUrl);
  const net = (h) => h.replace(/ data-[an]="[^"]*"/g, "").replace(/\bnv-/g, "np-");
  return JSON.stringify({ rubriques, pages: pages.map((p) => ({ ...p, body: net(p.body) })) }).replace(/</g, "\\u003c");
};

/** La donnée du script commun propre au site qui sert la page : origin = l'adresse de l'addon. */
export const nuvioDonnees = (origin) => "const NV_ORIG = " + JSON.stringify(origin) + ";";

/** Le script commun : window.NV, avec les réglages et le lien des affiches maison (LA = creerLienAffiches, repris tel
 *  quel de lien-affiches.js) et les écrans des Paramètres. Servi à part (statique.js, gardé en cache par le
 *  navigateur), après nuvioDonnees. */
// Le code d'une fonction recopiée telle quelle (creerLienAffiches.toString()) peut contenir des appels à __name,
// que l'outil de Cloudflare ajoute en préparant le worker : dans le navigateur, __name ne fait rien.
export const NUVIO_JS = "var __name = function (f) { return f; };\nconst NV_PP = " + JSON.stringify(POSTER_URL) + ", NV_PAR = " + parametresJSON(POSTER_URL) + ";\nconst LA = (" + creerLienAffiches + ")();\n" + `window.NV = (() => {
  const mkd = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const cssUrl = (u) => "url('" + String(u).replace(/'/g, "%27") + "')";
  // Fonds envoyés en w1920 (ou original, w1280 selon la version de l'addon) : on demande la taille utile.
  const imgW = (u, w) => String(u || "").replace(/[/](original|w1920|w1280)[/]/, "/" + w + "/");
  const lit = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ecrit = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const tactile = matchMedia("(hover: none), (pointer: coarse)").matches;
  const calme = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Réglages de l'aperçu (les mêmes partout : hall, guide, salle 2) ----------
  // Affiches maison : activées d'office (c'est le réglage de l'étape 8), avec les options choisies en
  // salle 2 (« Tes affiches », gardées dans ce navigateur), demandées au worker (/affiche/…).
  const reglages = {
    get format() { return lit("apercu-format") === "l" ? "l" : "p"; },
    set format(v) { ecrit("apercu-format", v === "l" ? "l" : "p"); },
    get pp() { return lit("apercu-pp-v2") !== "0"; },
    set pp(v) { ecrit("apercu-pp-v2", v ? "1" : "0"); },
    // Réglages de la régie (worker/lien-affiches.js), gardés sous leur forme écrite (s) ; les anciens réglages
    // de « Tes affiches » (affiches-v1 : o, r) sont convertis la première fois.
    get affiches() {
      const s = lit("affiches-v2");
      if (s !== null) return LA.lireReglages(new URLSearchParams(s ? "s=1." + s : ""));
      try { const a = JSON.parse(lit("affiches-v1") || "{}"); return LA.lireReglages(new URLSearchParams({ o: a.o || "", r: a.r || "" })); }
      catch (e) { return LA.lireReglages(new URLSearchParams("")); }
    },
    set affiches(r) { ecrit("affiches-v2", LA.ecrireReglages(r)); },
    // Réglages à part du paysage (régie, onglet Paysage) ; null = les mêmes que le portrait.
    get affichesPaysage() {
      const s = lit("affiches-v2-paysage");
      return s === null ? null : LA.lireReglages(new URLSearchParams(s ? "s=1." + s : ""));
    },
    set affichesPaysage(r) {
      if (r) ecrit("affiches-v2-paysage", LA.ecrireReglages(r));
      else try { localStorage.removeItem("affiches-v2-paysage"); } catch (e) {}
    },
  };
  // L'ancienne clé TMDB (elle ne servait qu'aux affiches Posters+) n'est plus lue : on l'efface.
  try { localStorage.removeItem("tmdb-key"); } catch (e) {}
  /** Le lien d'affiches à coller dans Nuvio, avec les réglages de ce navigateur. */
  const lienPerso = () => LA.lienAffiches(reglages.affiches, reglages.affichesPaysage);
  /** Affiche maison d'un titre, demandée au worker (/affiche/…) ; r : d'autres réglages que ceux du navigateur (la régie). */
  const ppSrc = (m, forme, r) => {
    if ((!r && !reglages.pp) || !m || !m.id) return "";
    const id = String(m.id), imdb = m.imdb_id || (id.startsWith("tt") ? id : "");
    if (!/^(tt\\d+|tmdb:\\d+)$/.test(id)) return "";
    const propres = r || (forme === "landscape" && reglages.affichesPaysage) || reglages.affiches;
    const q = new URLSearchParams(), s = LA.ecrireReglages(propres);
    if (imdb && imdb !== id) q.set("imdb", imdb);
    if (s) q.set("s", "1." + s);
    q.set("v", "${APERCU_V}");   // version du dessin : un aperçu de l'ancienne version ne ressort pas du cache
    return NV_ORIG + "/affiche/" + (m.type === "series" ? "series" : "movie") + "/" + forme + "/" + encodeURIComponent(id) + (String(q) ? "?" + q : "");
  };

  // ---------- Données de l'addon (fiches, bandes-annonces), gardées en mémoire ----------
  const caches = { meta: new Map(), ba: new Map() };
  // leger : la fiche sans les lignes écrites par Gemini (survol du haut de l'accueil), pour ne pas dépenser
  // le quota de l'IA à chaque affiche survolée. La fiche ouverte, elle, est complète.
  const fiche = (m, leger) => {
    if (!m || !m.id) return Promise.resolve(null);
    const u = NV_ORIG + "/meta/" + (m.type === "series" ? "series" : "movie") + "/" + encodeURIComponent(m.id) + ".json" + (leger ? "?leger=1" : "");
    if (!caches.meta.has(u)) caches.meta.set(u, fetch(u).then((r) => r.ok ? r.json() : {}).then((d) => (d && d.meta) || null).catch(() => null));
    return caches.meta.get(u);
  };
  const baCle = (m) => {
    if (!m || !m.id) return Promise.resolve(null);
    const u = NV_ORIG + "/trailer/" + (m.type === "series" ? "series" : "movie") + "/" + encodeURIComponent(m.id) + ".json";
    if (!caches.ba.has(u)) caches.ba.set(u, fetch(u).then((r) => r.ok ? r.json() : {}).then((d) => (d && /^[A-Za-z0-9_-]{6,20}$/.test(d.key || "")) ? d.key : null).catch(() => null));
    return caches.ba.get(u);
  };
  // Lecteur YouTube normal (pas youtube-nocookie : sans la session Google, YouTube y demande souvent
  // « Connectez-vous pour confirmer que vous n'êtes pas un robot »), avec l'adresse du site (origin, referrer).
  const youtube = (key, muet) => {
    const f = document.createElement("iframe");
    f.src = "https://www.youtube.com/embed/" + key + "?autoplay=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1&origin=" + encodeURIComponent(location.origin) + (muet ? "&mute=1&controls=0&loop=1&disablekb=1&playlist=" + key : "");
    f.title = "Bande-annonce"; f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true; f.referrerPolicy = "strict-origin-when-cross-origin"; if (muet) f.tabIndex = -1;
    return f;
  };
  // quandJoue(iframe, ok) : ok() quand YouTube dit que la vidéo joue vraiment (état 1). Bloquée (robot,
  // vidéo privée…), elle ne joue jamais : on ne montre alors pas l'écran d'erreur de YouTube.
  const quandJoue = (f, ok) => {
    const id = "nvo" + Math.random().toString(36).slice(2);
    const ecoute = (e) => {
      if (e.source !== f.contentWindow || typeof e.data !== "string") return;
      let d; try { d = JSON.parse(e.data); } catch (err) { return; }
      const etat = d.event === "onStateChange" ? d.info : d.event === "infoDelivery" && d.info ? d.info.playerState : null;
      if (etat === 1) { removeEventListener("message", ecoute); ok(); }
    };
    addEventListener("message", ecoute);
    const parle = () => { if (!f.isConnected) { removeEventListener("message", ecoute); return; } try {
      f.contentWindow.postMessage(JSON.stringify({ event: "listening", id, channel: "widget" }), "*");
      f.contentWindow.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"], id, channel: "widget" }), "*");
    } catch (err) {} };
    f.addEventListener("load", () => { parle(); setTimeout(parle, 600); setTimeout(parle, 1500); setTimeout(parle, 3000); });
  };

  // ---------- Textes comme Nuvio les écrit ----------
  const IMDB = '<svg viewBox="0 0 575 290" aria-hidden="true"><path fill="#f6c700" d="M575 24.9C573.4 12.1 563.9 1.9 551.9 0C499.0 0 76.1 0 23.3 0C10.1 2.1 0 14.1 0 28.6C0 51.8 0 237.6 0 260.8C0 276.8 12.3 289.8 27.6 289.8C79.6 289.8 495.6 289.8 547.5 289.8C561.6 289.8 573.2 278.8 575 264.5C575 216.6 575 48.8 575 24.9Z"/><path d="M69.3 58.2L114.9 58.2L114.9 233.8L69.3 233.8L69.3 58.2Z M201.2 139.1C197.2 112.3 195.1 97.5 194.6 94.5C192.7 80.2 190.9 67.7 189.2 57.0C185.2 57.0 165.5 57.0 130.0 57.0L130.0 232.7L170.0 232.7L170.1 116.7L186.9 232.7L215.4 232.7L231.3 114.1L231.5 232.7L271.3 232.7L271.3 57.0L211.7 57.0L201.2 139.1Z M346.7 93.6C347.2 95.8 347.4 100.9 347.4 108.8C347.4 115.7 347.4 170.1 347.4 176.9C347.4 188.6 346.7 195.8 345.2 198.4C343.6 201.1 339.6 202.4 333.0 202.4C333.0 190.9 333.0 98.6 333.0 87.1C338.0 87.1 341.4 87.6 343.2 88.7C345.0 89.7 346.2 91.3 346.7 93.6ZM367.3 230.9C372.7 229.7 377.3 227.6 381.0 224.6C384.7 221.6 387.2 217.5 388.7 212.2C390.2 206.9 391.1 196.3 391.1 180.6C391.1 174.4 391.1 125.1 391.1 118.9C391.1 102.3 390.4 91.1 389.4 85.5C388.4 79.8 385.9 74.7 381.8 70.0C377.8 65.4 371.9 62.1 364.1 60.1C356.3 58.1 343.6 57.0 321.5 57.0C319.2 57.0 307.9 57.0 287.5 57.0L287.5 232.7L342.7 232.7C355.5 232.3 363.7 231.7 367.3 230.9Z M464.7 204.7C463.9 206.9 460.2 208.0 457.4 208.0C454.7 208.0 452.9 206.9 452.0 204.8C451.0 202.6 450.6 197.7 450.6 190C450.6 185.3 450.6 148.2 450.6 143.5C450.6 135.5 451.0 130.5 451.8 128.6C452.6 126.6 454.4 125.6 457.1 125.6C459.9 125.6 463.6 126.7 464.6 129.0C465.5 131.3 466.0 136.1 466.0 143.5C466.0 146.5 466.0 161.5 466.0 188.5C465.7 197.8 465.3 203.2 464.7 204.7ZM406.6 231.2L447.7 231.2C449.4 224.5 450.4 220.7 450.6 220.0C454.3 224.5 458.4 227.9 462.9 230.1C467.3 232.3 474.0 233.5 479.2 233.5C486.4 233.5 492.6 231.6 497.9 227.8C503.1 224.0 506.5 219.5 507.9 214.4C509.3 209.2 510.0 201.4 510.0 190.8C510.0 185.9 510.0 146.5 510.0 141.6C510.0 131 509.8 124.0 509.3 120.8C508.8 117.5 507.4 114.2 505.1 110.8C502.8 107.4 499.4 104.8 494.9 102.9C490.5 101.1 485.3 100.1 479.2 100.1C474.0 100.1 467.2 101.2 462.8 103.2C458.3 105.3 454.2 108.4 450.6 112.7C450.6 108.8 450.6 89.8 450.6 55.5L406.6 55.5L406.6 231.2Z"/></svg>';
  const typeGenre = (m) => (m.type === "series" ? "Série" : "Film") + ((m.genres || [])[0] ? " • " + m.genres[0] : "");
  const duree = (r) => {
    const n = parseInt(String(r || ""), 10); if (!n) return "";
    const h = Math.floor(n / 60), mn = n % 60;
    return h && mn ? h + "h " + mn + "m" : h ? h + "h" : mn + "m";
  };
  // « Afficher la date de sortie complète » : la date en toutes lettres pour les films (pour un film à venir,
  // l'addon y met la date où il devient regardable) ; l'année (ou « 2008–2013 ») pour les séries.
  const dateSortie = (m) => {
    if (m.type !== "series" && m.released) {
      const d = new Date(m.released);
      if (!isNaN(d)) return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    }
    return String(m.releaseInfo || "").split(" · ")[0];
  };
  const imdbEl = (note) => { const s = mkd("span", "nvo-imdb"); s.innerHTML = IMDB; s.append(note); return s; };
  // Les deux lignes d'infos du haut de l'accueil (ModernHomeHero) : « Film • Horreur · 1h 46m · 19 août 2026 · IMDb 6.0 »,
  // puis, s'il y a un statut : « SORTI · IMDb 6.0 · EN ». La note IMDb va sur la 2e ligne pour les séries et les fiches avec statut.
  const lignesInfos = (m) => {
    const pts = (items) => { const l = mkd("div", "nvo-meta"); items.filter(Boolean).forEach((x, i) => { if (i) l.append(mkd("i", "pt")); l.append(typeof x === "string" ? mkd("span", null, x) : x); }); return l; };
    const statut = m.status ? String(m.status).toUpperCase() : "";
    const imdbEn2 = m.type === "series" || !!statut;
    const imdb = m.imdbRating ? imdbEl(String(m.imdbRating)) : null;
    const l1 = pts([typeGenre(m), duree(m.runtime), dateSortie(m), imdbEn2 ? null : imdb]);
    const l2items = [statut ? mkd("span", "pastille", statut) : null, imdbEn2 ? imdb : null, m.language ? mkd("span", "langue", String(m.language).toUpperCase()) : null].filter(Boolean);
    return l2items.length ? [l1, pts(l2items)] : [l1];
  };

  // ---------- Le haut de l'accueil ----------
  // montre(m) : un film ou une série ; montre({ dossier }) : une tuile de collection (son fond et son logo).
  const hero = (ecran) => {
    const el = mkd("div", "nvo-hero"), bd = mkd("div", "nvo-bd"), info = mkd("div", "nvo-info");
    el.append(bd, info);
    let courant = null, baT = 0, jeton = 0;
    const fond = (src) => {
      const vieux = [...bd.querySelectorAll("i")];
      if (vieux.length && vieux[vieux.length - 1].dataset.src === src) return;
      const i = mkd("i"); i.dataset.src = src || "";
      bd.prepend(i);
      const fin = () => { bd.append(i); requestAnimationFrame(() => i.classList.add("on")); vieux.forEach((v) => { v.classList.remove("on"); setTimeout(() => v.remove(), 450); }); };
      if (!src) { fin(); return; }
      const im = new Image(); im.onload = () => { i.style.backgroundImage = cssUrl(src); fin(); }; im.onerror = fin; im.src = src;
    };
    const stopVideo = () => { clearTimeout(baT); bd.querySelectorAll(".nvo-video").forEach((v) => v.remove()); };
    const ecrireInfos = (m, dossier) => {
      info.textContent = "";
      const logo = dossier ? dossier.titleLogoUrl : m.logo;
      const titre = dossier ? dossier.title : m.name;
      const t = mkd("h3", "nvo-titre", titre);
      if (logo) {
        const im = mkd("img", "nvo-logo"); im.alt = titre; im.decoding = "async";
        im.onerror = () => im.replaceWith(t);
        im.src = logo; info.append(im);
      } else info.append(t);
      if (dossier) return;
      lignesInfos(m).forEach((l) => info.append(l));
      if (m.description) info.append(mkd("p", "nvo-resume", m.description));
    };
    const montre = (x) => {
      if (!x || x === courant) return;
      courant = x; const n = ++jeton; stopVideo();
      if (x.dossier) { fond(imgW(x.dossier.heroBackdropUrl || x.dossier.coverImageUrl, "w1280")); info.classList.remove("attente"); ecrireInfos(null, x.dossier); return; }
      const m = x;
      fond(imgW(m.background || m.poster, "w1280"));
      // « Préférer les métadonnées de l'addon externe » : Nuvio complète le haut avec la fiche de l'addon
      // (durée, statut, langue), et cache le texte le temps de la recevoir.
      info.classList.add("attente");
      const tard = setTimeout(() => { if (n === jeton) { ecrireInfos(m); info.classList.remove("attente"); } }, 2500);
      fiche(m, true).then((f) => {
        clearTimeout(tard); if (n !== jeton) return;
        const plein = f ? { ...m, ...f, type: m.type, id: m.id } : m;
        if (f && f.background) fond(imgW(f.background, "w1280"));
        ecrireInfos(plein); info.classList.remove("attente");
      });
    };
    // Bande-annonce dans le haut de l'écran, au bout de 3 s sur la même affiche (« Média hero »).
    // En sourdine dans l'aperçu : un navigateur bloque le son d'une vidéo qui démarre toute seule.
    const bandeAnnonce = (m) => {
      stopVideo();
      if (!m || m.dossier || calme() || tactile) return;
      baT = setTimeout(() => baCle(m).then((key) => {
        if (!key || courant !== m || !el.isConnected) return;
        const v = mkd("div", "nvo-video"), fr = youtube(key, true); v.append(fr); bd.append(v);
        quandJoue(fr, () => setTimeout(() => v.classList.add("on"), 400));
      }), 3000);
    };
    return { el, montre, bandeAnnonce, stopVideo, get courant() { return courant; } };
  };

  // ---------- Cartes et tuiles ----------
  const peint = (c) => {
    const m = c._m; if (!m) return;
    const paysage = c.closest(".nvo") ? c.closest(".nvo").classList.contains("paysage") : reglages.format === "l";
    const simple = paysage ? imgW(m.background || m.poster, "w780") : m.poster;
    const pp = ppSrc(m, paysage ? "landscape" : "poster");
    const montre = (src, repli) => {
      if (!src) { c.classList.remove("attente"); return; }
      const im = new Image();
      im.onload = () => { if (c._m !== m) return; c.style.backgroundImage = cssUrl(src); c.classList.remove("attente"); c.classList.add("img"); };
      im.onerror = () => { if (repli) montre(repli); else c.classList.remove("attente"); };
      im.src = src;
    };
    montre(pp || simple, pp ? simple : null);
  };
  const carte = (m) => {
    const c = mkd("button", "nvo-carte attente"); c.type = "button"; c.tabIndex = -1; c.append(mkd("i", "reflet"));
    if (!m) { c.setAttribute("aria-label", "Chargement"); return c; }
    remplit(c, m); return c;
  };
  const remplit = (c, m) => {
    c._m = m; c.setAttribute("aria-label", m.name || "");
    c.querySelectorAll(".sur").forEach((x) => x.remove());
    const sur = mkd("span", "sur");
    if (m.logo) { const im = mkd("img"); im.alt = ""; im.loading = "lazy"; im.src = m.logo; im.onerror = () => im.replaceWith(mkd("b", null, m.name)); sur.append(im); }
    else sur.append(mkd("b", null, m.name));
    c.append(sur); peint(c);
  };
  // Lueur d'une tuile : la couleur moyenne de son image, éclaircie si elle est sombre (CollectionCardGlow).
  const lueurs = new Map();
  const lueur = (src) => {
    if (!lueurs.has(src)) lueurs.set(src, new Promise((ok) => {
      const im = new Image(); im.crossOrigin = "anonymous";
      im.onload = () => { try {
        const cv = document.createElement("canvas"); cv.width = cv.height = 8; const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(im, 0, 0, 8, 8);
        const d = cx.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
        r /= 64; g /= 64; b /= 64;
        const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
        if (l < .45) { const k = (.45 - l) * 1.6; r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
        ok("rgba(" + Math.round(r) + "," + Math.round(g) + "," + Math.round(b) + ",.92)");
      } catch (e) { ok(""); } };
      // Miniature 8 × 8 par wsrv.nl : elle autorise la lecture des pixels (pas les images de TMDB ni de GitHub).
      im.onerror = () => ok(""); im.src = "https://wsrv.nl/?url=" + encodeURIComponent(src) + "&w=8&h=8&fit=fill&output=png";
    }));
    return lueurs.get(src);
  };
  const tuile = (f, nomCollection, idCollection) => {
    const t = mkd("button", "nvo-tuile"); t.type = "button"; t.tabIndex = -1; t.setAttribute("aria-label", f.title || "");
    t._f = f; t._coll = nomCollection; t._collId = idCollection;
    if (f.coverImageUrl) {
      const im = new Image(); im.onload = () => { t.style.backgroundImage = cssUrl(f.coverImageUrl); }; im.src = f.coverImageUrl;
      lueur(f.coverImageUrl).then((c) => { if (c) t.style.setProperty("--lueur", c); });
    }
    return t;
  };
  // GIF de la tuile sélectionnée (focusGifUrl), en fondu dès qu'il est chargé.
  const gif = (t, on) => {
    const f = t._f; if (!f || !f.focusGifUrl || f.focusGifEnabled === false) return;
    let im = t.querySelector("img");
    if (!on) { if (im) im.remove(); return; }
    if (im || calme()) return;
    im = mkd("img"); im.alt = ""; im.onload = () => im.classList.add("on"); im.src = f.focusGifUrl; t.append(im);
  };

  // ---------- La sélection (le « focus » de la télécommande) ----------
  // Une carte reste toujours sélectionnée, comme sur la TV : la souris ou les flèches la déplacent ; le haut de
  // l'écran suit au bout de 450 ms, la bande-annonce part au bout de 3 s.
  const pilote = (racine, h, opts) => {
    let sel = null, attente = 0;
    const rangees = racine.querySelector(".nvo-rangees");
    const choisit = (c, viaClavier) => {
      if (!c || c === sel) return;
      if (sel) { sel.classList.remove("focus"); gif(sel, false); }
      sel = c; c.classList.add("focus"); gif(c, true);
      clearTimeout(attente);
      const x = c._m || (c._f ? { dossier: c._f } : null);
      attente = setTimeout(() => { h.montre(x); h.bandeAnnonce(x); }, viaClavier ? 450 : 300);
      if (viaClavier) montreCarte(c);
    };
    const montreCarte = (c) => {
      const p = c.parentElement, pad = p.clientWidth * .054;
      if (c.offsetLeft - pad < p.scrollLeft) p.scrollTo({ left: c.offsetLeft - pad, behavior: "smooth" });
      else if (c.offsetLeft + c.offsetWidth + pad > p.scrollLeft + p.clientWidth) p.scrollTo({ left: c.offsetLeft + c.offsetWidth + pad - p.clientWidth, behavior: "smooth" });
      const r = c.closest(".nvo-rangee"); if (r && rangees) rangees.scrollTo({ top: r.offsetTop - parseFloat(getComputedStyle(rangees).paddingTop), behavior: calme() ? "auto" : "smooth" });
    };
    // Pendant le défilement, les cartes passent sous la souris immobile : on ne les sélectionne pas.
    let defile = 0;
    if (rangees) rangees.addEventListener("scroll", () => { defile = Date.now(); }, { passive: true });
    // Molette et pavé tactile = flèches haut/bas de la télécommande : une rangée par cran (souris) ou par geste
    // (pavé tactile, dont l'élan envoie des dizaines d'événements), et la sélection descend avec.
    const pas = (sens) => {
      const rs = [...rangees.querySelectorAll(".nvo-rangee")];
      let i = sel && sel.isConnected ? rs.indexOf(sel.closest(".nvo-rangee")) : -1;
      if (i < 0) i = rs.reduce((k, r, j) => Math.abs(r.offsetTop - rangees.scrollTop) < Math.abs(rs[k].offsetTop - rangees.scrollTop) ? j : k, 0);
      const cible = rs[i + sens]; if (!cible) return;
      const cartes = [...cible.querySelectorAll(".nvo-carte, .nvo-tuile")].filter((k) => k._m || k._f);
      if (!cartes.length) { rangees.scrollTo({ top: cible.offsetTop, behavior: calme() ? "auto" : "smooth" }); return; }
      const x = sel && sel.isConnected ? sel.getBoundingClientRect().left : cartes[0].getBoundingClientRect().left;
      choisit(cartes.reduce((a, b) => Math.abs(b.getBoundingClientRect().left - x) < Math.abs(a.getBoundingClientRect().left - x) ? b : a), true);
    };
    let cumul = 0, verrou = 0, dernier = 0;
    if (rangees) rangees.addEventListener("wheel", (e) => {
      if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // zoom, ou rangée qu'on fait glisser de côté
      e.preventDefault();
      const now = Date.now(), cran = e.deltaMode === 1 || (Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
      const enRafale = now - dernier < 200; dernier = now;
      if (now < verrou) { if (!cran && enRafale) verrou = now + 220; return; }
      cumul += e.deltaY * (e.deltaMode === 1 ? 40 : 1);
      if (Math.abs(cumul) < 30) return;
      const sens = cumul > 0 ? 1 : -1; cumul = 0; verrou = now + (cran ? 220 : 450); defile = now;
      pas(sens);
    }, { passive: false });
    // Sélection à la souris : seulement quand elle bouge vraiment. En défilant, Chrome envoie des survols
    // fictifs à la carte restée sous la souris immobile, qui ramèneraient la sélection en arrière.
    let sx = -1, sy = -1;
    racine.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || (e.screenX === sx && e.screenY === sy)) return;
      sx = e.screenX; sy = e.screenY;
      if (Date.now() - defile < 150) return;
      const c = e.target.closest(".nvo-rangees .nvo-carte, .nvo-rangees .nvo-tuile");
      if (c && c !== sel && (c._m || c._f) && !racine.querySelector(".nvo-piste.tire")) choisit(c);
    });
    racine.addEventListener("focusin", (e) => { const c = e.target.closest(".nvo-rangees .nvo-carte, .nvo-rangees .nvo-tuile"); if (c && (c._m || c._f)) choisit(c, true); });
    racine.addEventListener("keydown", (e) => {
      const c = e.target.closest(".nvo-rangees .nvo-carte, .nvo-rangees .nvo-tuile"); if (!c) return;
      let n = null;
      if (e.key === "ArrowRight") n = c.nextElementSibling;
      else if (e.key === "ArrowLeft") { n = c.previousElementSibling; if (!n && opts && opts.menu) { e.preventDefault(); opts.menu(); return; } }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const pistes = [...racine.querySelectorAll(".nvo-piste")].filter((p) => p.querySelector(".nvo-carte, .nvo-tuile") && p.offsetParent);
        const p = pistes[pistes.indexOf(c.parentElement) + (e.key === "ArrowDown" ? 1 : -1)];
        if (p) { const x = c.getBoundingClientRect().left; n = [...p.children].filter((k) => k._m || k._f).reduce((a, b) => Math.abs(b.getBoundingClientRect().left - x) < Math.abs(a.getBoundingClientRect().left - x) ? b : a); }
      } else if (e.key === "Backspace" && opts && opts.menu) { e.preventDefault(); e.stopPropagation(); opts.menu(); return; }
      else if (e.key === "Enter" || e.key === " ") return;
      else return;
      e.preventDefault();
      if (n) { racine.querySelectorAll('.nvo-carte[tabindex="0"], .nvo-tuile[tabindex="0"]').forEach((k) => { k.tabIndex = -1; }); n.tabIndex = 0; n.focus({ preventScroll: true }); }
    });
    // Au lancement, Nuvio sélectionne la première carte de la première rangée.
    const premier = () => { const c = racine.querySelector(".nvo-rangees .nvo-carte, .nvo-rangees .nvo-tuile"); if (c && (c._m || c._f) && !sel) { c.tabIndex = 0; choisit(c); } };
    return { premier, choisit, get sel() { return sel; }, reset() { sel = null; } };
  };

  // Faire glisser une rangée à la souris ; le clic qui suit un glissé n'ouvre rien.
  let aGlisse = 0;
  const glisse = (piste) => {
    let x0 = 0, l0 = 0, tire = false, id = 0;
    // Sans ça, le navigateur attrape l'image (logo, affiche) au lieu de faire défiler la rangée.
    piste.addEventListener("dragstart", (e) => e.preventDefault());
    piste.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || e.button !== 0) return; tire = true; x0 = e.clientX; l0 = piste.scrollLeft; id = e.pointerId; });
    addEventListener("pointermove", (e) => { if (!tire || e.pointerId !== id) return; if (Math.abs(e.clientX - x0) > 5) piste.classList.add("tire"); if (piste.classList.contains("tire")) piste.scrollLeft = l0 - (e.clientX - x0); });
    addEventListener("pointerup", () => { if (tire && piste.classList.contains("tire")) aGlisse = Date.now(); tire = false; piste.classList.remove("tire"); });
  };
  const vientDeGlisser = () => Date.now() - aGlisse < 300;

  // ---------- La barre latérale moderne ----------
  const ICONES = {
    accueil: '<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
    decouvrir: '<svg viewBox="0 0 24 24"><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1 1.1-.49 1.1-1.1-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"/></svg>',
    recherche: '<svg viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 9a5 5 0 1110 0A5 5 0 014 9zm5-7a7 7 0 104.2 12.6.999.999 0 00.093.107l3 3a1 1 0 001.414-1.414l-3-3a.999.999 0 00-.107-.093A7 7 0 009 2z"/></svg>',
    biblio: '<svg viewBox="0 0 24 24"><path d="M8.51 2h6.98c.23 0 .41 0 .57.02 1.1.1 2.01.77 2.4 1.67H5.54c.39-.9 1.3-1.57 2.4-1.67.16-.02.34-.02.57-.02zM6.31 4.72c-1.39 0-2.53.84-2.91 1.96l-.02.07c.4-.12.81-.2 1.23-.25 1.08-.14 2.45-.14 4.03-.14h6.89c1.59 0 2.95 0 4.03.14.42.05.83.13 1.23.25l-.02-.07c-.38-1.12-1.52-1.96-2.91-1.96H6.31z"/><path fill-rule="evenodd" d="M8.67 7.54h6.66c3.37 0 5.06 0 6.01.99.95.99.72 2.51.28 5.56l-.42 2.89c-.35 2.39-.53 3.59-1.42 4.3-.9.72-2.22.72-4.87.72H9.1c-2.65 0-3.97 0-4.87-.72-.9-.71-1.07-1.91-1.42-4.3l-.43-2.89c-.44-3.05-.67-4.57.28-5.56.95-.99 2.64-.99 6.01-.99zM8 18c0-.41.37-.75.83-.75h6.34c.46 0 .83.34.83.75s-.37.75-.83.75H8.83C8.37 18.75 8 18.41 8 18z"/></svg>',
    reglages: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M14.28 2.15C13.91 2 13.44 2 12.5 2s-1.41 0-1.78.15c-.49.2-.89.6-1.09 1.08-.09.23-.13.49-.14.87-.02.56-.31 1.07-.8 1.35-.49.28-1.08.27-1.58.01-.34-.18-.58-.28-.82-.31-.53-.07-1.07.07-1.49.4-.32.24-.55.64-1.02 1.45-.47.81-.71 1.21-.76 1.6-.07.53.07 1.06.4 1.48.15.19.36.35.68.55.48.3.78.8.78 1.36s-.3 1.06-.78 1.36c-.32.2-.53.36-.68.56-.33.42-.47.95-.4 1.48.05.39.29.79.76 1.6.47.81.7 1.21 1.02 1.45.42.32.96.47 1.49.4.24-.03.49-.13.82-.31.5-.26 1.09-.27 1.58.01.49.28.78.79.8 1.35.01.38.05.64.14.87.2.49.6.88 1.09 1.08.37.15.84.15 1.78.15s1.41 0 1.78-.15c.49-.2.89-.59 1.09-1.08.09-.23.13-.49.14-.87.02-.56.31-1.07.8-1.35.49-.28 1.08-.27 1.58-.01.34.18.58.28.82.31.53.07 1.07-.07 1.49-.4.32-.24.55-.64 1.02-1.45.47-.81.71-1.21.76-1.6.07-.53-.07-1.06-.4-1.48-.15-.19-.36-.35-.68-.55-.48-.3-.78-.8-.78-1.36s.3-1.06.78-1.36c.32-.2.53-.36.68-.56.33-.42.47-.95.4-1.48-.05-.39-.29-.79-.76-1.6-.47-.81-.7-1.21-1.02-1.45-.42-.32-.96-.47-1.49-.4-.24.03-.49.13-.82.31-.5.26-1.09.27-1.58-.01-.49-.28-.78-.79-.8-1.35-.01-.38-.05-.64-.14-.87-.2-.49-.6-.88-1.09-1.08zM12.5 15c1.67 0 3.02-1.34 3.02-3s-1.35-3-3.02-3-3.02 1.34-3.02 3 1.35 3 3.02 3z"/></svg>',
  };
  const MENU = [["accueil", "Accueil"], ["decouvrir", "Découvrir"], ["recherche", "Rechercher"], ["biblio", "Bibliothèque"], ["reglages", "Paramètres"]];
  const VERSION_TV = "1.1.0-beta.7";
  const LOGO_NUVIO = "https://raw.githubusercontent.com/NuvioMedia/NuvioTV/" + VERSION_TV + "/app/src/main/res/drawable/app_logo_wordmark.png";
  // menu(ecran, vue courante, aller(vue)) : ouvre le panneau ; « Retour » ou un clic à côté le referme.
  // auto : ouvert de lui-même à l'arrivée (pour qu'on le voie) : il ne prend pas le focus, ne fait pas de bruit,
  // et se referme dès que le focus va ailleurs dans l'écran.
  const menu = (ecran, courante, aller, possibles, auto) => {
    if (ecran.querySelector(".nvo-menu")) return;
    const p = mkd("div", "nvo-menu"); p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Menu de Nuvio");
    const logo = mkd("img"); logo.alt = "Nuvio"; logo.src = LOGO_NUVIO; logo.onerror = () => logo.replaceWith(mkd("b", null, "NUVIO"));
    const nav = mkd("nav");
    MENU.forEach(([id, nom]) => {
      const b = mkd("button"); b.type = "button"; b.innerHTML = "<span>" + ICONES[id] + "</span>"; b.append(nom);
      if (id === courante) b.setAttribute("aria-current", "page");
      if (possibles && !possibles.includes(id)) { b.disabled = true; b.title = "Pas dans l'aperçu"; }
      b.addEventListener("click", () => { ferme(); if (id !== courante) aller(id); });
      nav.append(b);
    });
    p.append(logo, nav); ecran.append(p);
    const avant = document.activeElement;
    if (!auto) (nav.querySelector('[aria-current="page"]') || nav.querySelector("button")).focus({ preventScroll: true });
    const ferme = (rendFocus = !auto) => {
      p.remove(); ecran.removeEventListener("pointerdown", dehors, true); ecran.removeEventListener("focusin", ailleurs);
      if (rendFocus && avant && avant.isConnected) avant.focus({ preventScroll: true });
    };
    const dehors = (e) => { if (!p.contains(e.target)) ferme(); };
    const ailleurs = (e) => { if (!p.contains(e.target)) ferme(false); };
    setTimeout(() => ecran.addEventListener("pointerdown", dehors, true), 0);
    if (auto) ecran.addEventListener("focusin", ailleurs);
    p.addEventListener("keydown", (e) => {
      const bs = [...nav.querySelectorAll("button:not(:disabled)")], i = bs.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length].focus(); }
      else if (e.key === "ArrowRight" || e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); e.stopPropagation(); ferme(); }
    });
    if (window.sfx && !auto) sfx.click();
  };

  // ---------- La bibliothèque (gardée sur l'appareil, la même dans tous les aperçus et les billets) ----------
  const liste = () => { try { return JSON.parse(lit("ma-liste") || "[]"); } catch (e) { return []; } };
  const dansListe = (m) => liste().some((x) => x.id === m.id);
  const basculeListe = (m) => {
    let l = liste();
    if (dansListe(m)) l = l.filter((x) => x.id !== m.id);
    else l.unshift({ id: m.id, type: m.type, name: m.name, poster: m.poster, background: m.background, logo: m.logo, description: m.description, releaseInfo: m.releaseInfo, released: m.released, genres: m.genres, imdbRating: m.imdbRating, imdb_id: m.imdb_id });
    ecrit("ma-liste", JSON.stringify(l.slice(0, 50))); dispatchEvent(new Event("ma-liste"));
    return dansListe(m);
  };

  // ---------- La fiche d'un film ou d'une série ----------
  const SVG = {
    lire: '<svg viewBox="0 0 24 24"><path d="M21.41 9.35c2.12 1.16 2.12 4.14 0 5.3L8.6 21.61C6.53 22.74 4 21.28 4 18.97V5.03c0-2.31 2.53-3.77 4.6-2.65l12.81 6.97z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M4 12h16M12 4v16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
    coche: '<svg viewBox="0 0 24 24"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
    vu: '<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>',
    ba: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M23 7.2a3 3 0 0 0-2.4-2.4C18.5 4.3 12 4.3 12 4.3s-6.5 0-8.6.5A3 3 0 0 0 1 7.2C.5 9.3.5 12 .5 12s0 2.7.5 4.8a3 3 0 0 0 2.4 2.4c2.1.5 8.6.5 8.6.5s6.5 0 8.6-.5a3 3 0 0 0 2.4-2.4c.5-2.1.5-4.8.5-4.8s0-2.7-.5-4.8zM9.7 15.3V8.7l5.8 3.3-5.8 3.3z"/></svg>',
    loupe: '<svg viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 9a5 5 0 1110 0A5 5 0 014 9zm5-7a7 7 0 104.2 12.6.999.999 0 00.093.107l3 3a1 1 0 001.414-1.414l-3-3a.999.999 0 00-.107-.093A7 7 0 009 2z"/></svg>',
    micro: '<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>',
    signet: '<svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>',
  };
  const pays = (c) => String(c || "").split(/[,\\s]+/).filter(Boolean).map((x) => { try { return new Intl.DisplayNames(["fr"], { type: "region" }).of(x.toUpperCase()); } catch (e) { return x; } }).join(", ");
  // ouvreFiche(ecran, m, { retour }) : la fiche par-dessus l'écran ; la bande-annonce part toute seule au bout de 5 s
  // sur « Regarder » (en plein écran, comme Nuvio quand « Play in Background » est désactivé).
  const ouvreFiche = (ecran, m0) => {
    ecran.querySelectorAll(".nvo-fiche").forEach((f) => f.remove());
    const f = mkd("div", "nvo-fiche"); f.setAttribute("role", "dialog"); f.setAttribute("aria-label", m0.name || "Fiche");
    const fd = mkd("div", "fd"), fh = mkd("div", "fh"), bas = mkd("div", "fbas");
    f.append(fd, fh, bas); ecran.append(f);
    let baT = 0, m = m0;
    const finBA = () => { clearTimeout(baT); f.classList.remove("ba"); f.querySelectorAll(".fv, .astuce").forEach((x) => x.remove()); };
    // Bande-annonce en plein écran. Toute seule (muet) : rien ne change tant qu'elle ne joue pas vraiment.
    // Demandée (bouton) : tout de suite, avec un lien vers YouTube si elle n'a pas démarré au bout de 5 s.
    const joueBA = (key, muet) => {
      finBA(); f.scrollTo({ top: 0 });
      const v = mkd("div", "fv"), fr = youtube(key, muet); v.append(fr);
      const astuce = mkd("p", "astuce", "Appuyez sur « Retour » pour quitter la bande-annonce");
      let joue = false;
      const montre = () => { if (!v.isConnected) return; v.style.opacity = ""; f.classList.add("ba"); if (!astuce.isConnected) fh.append(astuce); };
      quandJoue(fr, () => { joue = true; montre(); });
      if (muet) v.style.opacity = "0"; else montre();
      f.insertBefore(v, fh);
      if (!muet) setTimeout(() => {
        if (joue || !v.isConnected) return;
        const a = mkd("a", null, "Elle ne démarre pas ? Regarder sur YouTube"); a.href = "https://www.youtube.com/watch?v=" + key; a.target = "_blank"; a.rel = "noopener";
        a.style.cssText = "color:#fff;text-decoration:underline;margin-left:1.25cqw"; astuce.append(a);
      }, 5000);
    };
    const lanceBA = (muet) => {
      baCle(m).then((key) => {
        if (!key || !f.isConnected) { if (!muet) { bBA.disabled = true; bBA.title = "Pas de bande-annonce"; } return; }
        joueBA(key, muet);
      });
    };
    const dessine = () => {
      fh.textContent = ""; bas.textContent = "";
      const src = imgW(m.background || m.poster, "w1280");
      if (src) fd.style.backgroundImage = cssUrl(src);
      const titre = mkd("h3", "ftitre", m.name);
      if (m.logo) { const b = mkd("div", "flogo"), im = mkd("img"); im.alt = m.name; im.src = m.logo; im.onerror = () => b.replaceWith(titre); b.append(im); fh.append(b); }
      else fh.append(titre);
      // Boutons : Regarder (sélectionné à l'ouverture), Bibliothèque, Vu (films), Bande-annonce
      const fb = mkd("div", "fb");
      const lire = mkd("button", "bt lire focus"); lire.type = "button"; lire.innerHTML = SVG.lire;
      const v1 = (m.videos || []).filter((v) => v.season > 0).sort((a, b) => a.season - b.season || a.episode - b.episode)[0];
      lire.append(m.type === "series" ? "Regarder S" + (v1 ? v1.season : 1) + " E" + (v1 ? v1.episode : 1) : "Regarder");
      lire.title = "Dans Nuvio, la liste des sources s'ouvre ici";
      const bBib = mkd("button", "bt rond"); bBib.type = "button";
      const dessineBib = () => { const d = dansListe(m); bBib.innerHTML = d ? SVG.coche : SVG.plus; bBib.setAttribute("aria-label", d ? "Retirer de la bibliothèque" : "Ajouter à la bibliothèque"); bBib.title = bBib.getAttribute("aria-label"); };
      dessineBib();
      bBib.addEventListener("click", () => { const d = basculeListe(m); dessineBib(); if (window.sfx) sfx.click(); if (d && window.popcorn) popcorn(bBib); if (window.toast) toast(d ? "Ajouté à la bibliothèque" : "Retiré de la bibliothèque"); });
      fb.append(lire, bBib);
      if (m.type !== "series") { const bVu = mkd("button", "bt rond"); bVu.type = "button"; bVu.innerHTML = SVG.vu; bVu.setAttribute("aria-label", "Marquer comme vu"); bVu.title = "Marquer comme vu"; bVu.addEventListener("click", () => { bVu.classList.toggle("vu"); bVu.style.background = bVu.classList.contains("vu") ? "#fff" : ""; bVu.style.color = bVu.classList.contains("vu") ? "#000" : ""; }); fb.append(bVu); }
      bBA = mkd("button", "bt rond"); bBA.type = "button"; bBA.innerHTML = SVG.ba; bBA.setAttribute("aria-label", "Regarder la bande-annonce"); bBA.title = "Regarder la bande-annonce";
      bBA.addEventListener("click", () => lanceBA(false));
      fb.append(bBA); fh.append(fb);
      fb.addEventListener("pointerover", (e) => { if (e.target.closest(".bt") !== lire) lire.classList.remove("focus"); });
      const equipe = m.type === "series" ? (m.creators || m.director || []) : (m.director && m.director.length ? m.director : m.writer || []);
      if (equipe.length) fh.append(mkd("p", "fc", (m.type === "series" ? "Créateur : " : (m.director && m.director.length ? "Réalisateur : " : "Scénariste : ")) + equipe.slice(0, 3).join(", ")));
      else fh.append(mkd("div", "fc"));
      if (m.description) fh.append(mkd("p", "fs", m.description));
      // Infos : « Horreur • Thriller • 19 août 2026 • IMDb 6.0 », puis « SORTI • 1h 46m • États-Unis • EN »
      const fm = mkd("div", "fm"), l1 = mkd("div", "fm1"), l2 = mkd("div", "fm2");
      const avec = (ligne, items) => items.filter(Boolean).forEach((x, i) => { if (i) ligne.append(mkd("span", "sep", "•")); ligne.append(typeof x === "string" ? mkd("span", null, x) : x); });
      avec(l1, [(m.genres || []).slice(0, 6).join(" • "), dateSortie(m), m.imdbRating ? imdbEl(Number(m.imdbRating).toFixed(1)) : null]);
      avec(l2, [m.status ? mkd("span", "badge", String(m.status).toUpperCase()) : null, duree(m.runtime), m.country ? pays(m.country) : "", m.language ? String(m.language).toUpperCase() : ""]);
      fm.append(l1); if (l2.childNodes.length) fm.append(l2); fh.append(fm);
      // Séries : saisons et épisodes (non vus floutés)
      const videos = (m.videos || []).filter((v) => v.season != null);
      if (m.type === "series" && videos.length) {
        const nums = [...new Set(videos.map((v) => v.season))].sort((a, b) => (a === 0) - (b === 0) || a - b);
        const sa = mkd("div", "saisons"), eps = mkd("div", "episodes");
        const montreSaison = (s) => {
          sa.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b._s === s)));
          eps.textContent = "";
          videos.filter((v) => v.season === s).sort((a, b) => a.episode - b.episode).forEach((v) => {
            const c = mkd("div", "ep");
            if (v.thumbnail) { const im = mkd("img"); im.alt = ""; im.loading = "lazy"; im.src = v.thumbnail; c.append(im); }
            const tx = mkd("div", "tx"); tx.append(mkd("span", "num", "ÉPISODE " + v.episode), mkd("b", null, v.title || v.name || "Épisode " + v.episode));
            if (v.overview) tx.append(mkd("p", null, v.overview));
            const inf = mkd("div", "inf"); if (duree(v.runtime)) inf.append(mkd("span", null, duree(v.runtime)));
            if (v.rating || v.imdbRating) inf.append(imdbEl(Number(v.rating || v.imdbRating).toFixed(1)));
            if (v.released) { const d = new Date(v.released); if (!isNaN(d)) inf.append(mkd("span", "date", d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }))); }
            tx.append(inf); c.append(mkd("i", "rond-vu"), tx); eps.append(c);
          });
          eps.scrollLeft = 0;
        };
        nums.forEach((s) => { const b = mkd("button", "bt", s === 0 ? "Spéciaux" : "Saison " + s); b.type = "button"; b._s = s; b.addEventListener("click", () => montreSaison(s)); sa.append(b); });
        bas.append(sa, eps); montreSaison(nums[0]);
      }
      // Onglets : Créateur et distribution | Bande-annonce
      const ong = mkd("div", "onglets"), contenu = mkd("div");
      const cast = (m.app_extras && m.app_extras.cast) || (m.cast || []).map((n) => ({ name: n }));
      const ongs = [];
      if (cast.length || equipe.length) ongs.push(["Créateur et distribution", () => {
        const l = mkd("div", "ligne");
        const pers = (nom, role, photo) => { const p = mkd("div", "pers"), i = mkd("i", null, photo ? "" : String(nom).trim().charAt(0).toUpperCase()); if (photo) i.style.backgroundImage = cssUrl(photo); p.append(i, mkd("b", null, nom)); if (role) p.append(mkd("small", null, role)); return p; };
        (m.director || []).forEach((n) => l.append(pers(n, m.type === "series" ? "Créateur" : "Réalisateur")));
        (m.writer || []).filter((n) => !(m.director || []).includes(n)).slice(0, 2).forEach((n) => l.append(pers(n, "Scénariste")));
        if (l.children.length && cast.length) l.append(mkd("div", "pers trait"));
        cast.slice(0, 15).forEach((c) => l.append(pers(c.name, c.character, c.photo)));
        return l;
      }]);
      const bas2 = (m.trailers || []).filter((t) => t.ytId || t.source);
      if (bas2.length) ongs.push(["Bande-annonce", () => {
        const l = mkd("div", "ligne");
        bas2.slice(0, 6).forEach((t) => { const k = t.ytId || t.source, b = mkd("button", "vid"), i = mkd("i"); b.type = "button"; i.style.backgroundImage = cssUrl("https://i.ytimg.com/vi/" + k + "/hqdefault.jpg"); b.append(i, t.name || "Bande-annonce"); b.addEventListener("click", () => joueBA(k, false)); l.append(b); });
        return l;
      }]);
      ongs.forEach(([nom, rend], i) => {
        if (i) ong.append(mkd("i", null, "|"));
        const b = mkd("button", null, nom); b.type = "button";
        b.addEventListener("click", () => { ong.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); contenu.textContent = ""; contenu.append(rend()); });
        ong.append(b);
      });
      if (ongs.length) { bas.append(ong, contenu); ong.querySelector("button").click(); }
    };
    let bBA = null;
    dessine();
    // « Préférer les métadonnées de l'addon externe » : la fiche est celle de l'addon (résumé, distribution, épisodes).
    fiche(m0).then((x) => { if (x && f.isConnected) { m = { ...m0, ...x, id: m0.id, type: m0.type }; finBA(); dessine(); auto(); } });
    const auto = () => { clearTimeout(baT); if (tactile || calme()) return; baT = setTimeout(() => { if (f.isConnected && !f.classList.contains("ba") && !f.querySelector(".fv") && fh.querySelector(".lire.focus")) lanceBA(true); }, 5000); };
    auto();
    f.addEventListener("scroll", () => f.classList.toggle("loin", f.scrollTop > 200 * ecran.clientWidth / 1920));
    f.addEventListener("click", (e) => { if (f.classList.contains("ba") && !e.target.closest(".fb")) finBA(); });
    f._retour = () => { if (f.classList.contains("ba")) { finBA(); return true; } clearTimeout(baT); f.remove(); return true; };
    if (window.sfx) sfx.click();
    return f;
  };

  // ---------- La recherche : les rangées « Films » et « Séries » du Catalogue FR ----------
  const recherche = (vue, ouvrir) => {
    vue.textContent = ""; vue.className = "nvo-vue nvo-rech";
    const ch = mkd("div", "champ"), mic = mkd("button", "bt micro"), inp = mkd("input");
    mic.type = "button"; mic.innerHTML = SVG.micro; mic.setAttribute("aria-label", "Recherche vocale"); mic.addEventListener("click", () => inp.focus());
    inp.type = "search"; inp.enterKeyHint = "search"; inp.placeholder = "Rechercher des films et séries"; inp.setAttribute("aria-label", "Rechercher des films et séries");
    const efface = mkd("button", "bt micro", "✕"); efface.type = "button"; efface.setAttribute("aria-label", "Effacer"); efface.hidden = true;
    efface.addEventListener("click", () => { inp.value = ""; efface.hidden = true; cherche(); inp.focus(); });
    ch.append(mic, inp, efface);
    const res = mkd("div");
    const etat = (titre, sous) => { const e = mkd("div", "nvo-etat"); e.innerHTML = SVG.loupe; e.append(mkd("b", null, titre), mkd("span", null, sous)); return e; };
    vue.append(ch, res); res.append(etat("Lancer une recherche", "Saisissez au moins 2 caractères"));
    let t = 0, n = 0;
    const cherche = () => {
      const q = inp.value.trim(), k = ++n; res.textContent = "";
      if (q.length < 2) { res.append(etat("Lancer une recherche", "Saisissez au moins 2 caractères")); return; }
      let vides = 0;
      [["movie", "recherche-films", "Films"], ["series", "recherche-series", "Séries"]].forEach(([type, id, nom]) => {
        const r = mkd("section", "nvo-res"), hd = mkd("header"), piste = mkd("div", "piste");
        hd.append(mkd("h4", null, nom), mkd("span", null, "depuis Catalogue FR")); r.append(hd, piste); res.append(r);
        for (let i = 0; i < 6; i++) { const it = mkd("div", "nvo-item"); it.append(carte(null)); piste.append(it); }
        fetch(NV_ORIG + "/catalog/" + type + "/" + id + "/search=" + encodeURIComponent(q) + ".json").then((x) => x.json()).then((d) => {
          if (k !== n) return;
          const metas = ((d && d.metas) || []).slice(0, 20); piste.textContent = "";
          if (!metas.length) { r.remove(); if (++vides === 2) res.append(etat("Aucun résultat", "Essayez avec d'autres mots-clés")); return; }
          metas.forEach((m) => piste.append(item(m, ouvrir)));
        }).catch(() => { if (k === n) { piste.textContent = ""; piste.append(mkd("p", "vide", "Recherche indisponible pour le moment.")); } });
      });
    };
    inp.addEventListener("input", () => { efface.hidden = !inp.value; clearTimeout(t); t = setTimeout(cherche, 350); });
    if (!tactile) setTimeout(() => inp.focus({ preventScroll: true }), 50);
  };
  // Une affiche avec son titre et son année dessous (recherche, bibliothèque)
  const item = (m, ouvrir) => {
    const b = mkd("button", "nvo-item"); b.type = "button"; b.setAttribute("aria-label", m.name || "");
    const c = carte(null); c.tabIndex = -1; c.removeAttribute("aria-label"); remplit(c, m);
    b.append(c, mkd("b", null, m.name || ""));
    const an = String(m.releaseInfo || "").split(" · ")[0]; if (an) b.append(mkd("small", null, an));
    b.addEventListener("click", () => ouvrir(m));
    return b;
  };
  // ---------- Une tuile de collection ouverte (FolderDetailScreen, vue « TABBED_GRID ») ----------
  // En haut : la vignette, le titre et un onglet par source (sélectionné au survol, comme au focus de la télécommande).
  // Dessous : la grille d'affiches de l'onglet, page après page. base = l'adresse de l'addon avec les réglages du lien.
  const dossier = (vue, t, base, ouvrir) => {
    const f = t._f; vue.textContent = ""; vue.className = "nvo-vue nvo-dossier";
    const hd = mkd("header"), grille = mkd("div", "grille"), fin = mkd("i", "fin");
    if (f.coverImageUrl) { const im = mkd("img"); im.alt = ""; im.src = f.coverImageUrl; hd.append(im); }
    hd.append(mkd("h3", null, f.title || ""));
    const ongs = mkd("div", "ongs"); hd.append(ongs);
    vue.append(hd, grille, fin);
    const sources = (f.sources || []).map((src, i) => ({ src, i }));
    let n = 0, page = 1, plus = false, charge = false, courant = -1;
    const remplir = () => {
      if (charge || courant < 0) return;
      charge = true; const k = n, ici = courant;
      const att = []; for (let j = 0; j < 6; j++) { const it = mkd("div", "nvo-item"); it.append(carte(null)); grille.append(it); att.push(it); }
      fetch(base + "/dossier/" + encodeURIComponent(t._collId) + "/" + encodeURIComponent(f.id) + "/" + ici + ".json?page=" + page).then((r) => r.json()).then((d) => {
        if (k !== n) return;
        att.forEach((x) => x.remove());
        ((d && d.metas) || []).forEach((m) => grille.append(item(m, ouvrir)));
        plus = !!(d && d.hasMore); page++;
        if (!grille.children.length) grille.append(mkd("p", "vide", "Rien à afficher pour le moment."));
      }).catch(() => { if (k === n) { att.forEach((x) => x.remove()); grille.append(mkd("p", "vide", "Impossible de charger cet onglet pour le moment.")); } })
        .finally(() => { if (k === n) charge = false; });
    };
    const choisis = (i) => {
      if (i === courant) return;
      courant = i; n++; page = 1; plus = false; charge = false; grille.textContent = ""; vue.scrollTop = 0;
      ongs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b._i === i)));
      remplir();
    };
    if (sources.length > 1) sources.forEach(({ src, i }) => {
      const b = mkd("button", null, src.title || "Onglet " + (i + 1)); b.type = "button"; b._i = i; b.setAttribute("role", "tab");
      b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") choisis(i); });
      b.addEventListener("focus", () => choisis(i)); b.addEventListener("click", () => choisis(i));
      ongs.append(b);
    });
    // La télécommande : gauche/droite d'un onglet à l'autre (la rangée défile pour le garder visible),
    // bas vers la grille, haut depuis la première ligne de la grille vers l'onglet choisi.
    const voitOnglet = (b) => {
      const g = b.offsetLeft - ongs.offsetLeft, d = g + b.offsetWidth, m = b.offsetHeight;
      if (g < ongs.scrollLeft) ongs.scrollTo({ left: g - m, behavior: calme() ? "auto" : "smooth" });
      else if (d > ongs.scrollLeft + ongs.clientWidth) ongs.scrollTo({ left: d - ongs.clientWidth + m, behavior: calme() ? "auto" : "smooth" });
    };
    const ongSel = () => ongs.querySelector('[aria-selected="true"]') || ongs.firstChild;
    const vers = (x) => { if (!x) return; x.focus({ preventScroll: true }); if (ongs.contains(x)) { voitOnglet(x); vue.scrollTo({ top: 0, behavior: calme() ? "auto" : "smooth" }); } else montreDans(vue, x); };
    vue.addEventListener("keydown", (e) => {
      if (!/^Arrow/.test(e.key)) return;
      const a = document.activeElement, items = [...grille.querySelectorAll("button.nvo-item")];
      e.preventDefault();
      if (a && ongs.contains(a)) {
        if (e.key === "ArrowLeft") vers(a.previousElementSibling);
        else if (e.key === "ArrowRight") vers(a.nextElementSibling);
        else if (e.key === "ArrowDown") vers(items[0]);
        return;
      }
      const i = items.indexOf(a);
      if (i < 0) { vers(ongSel() || items[0]); return; }
      const cols = getComputedStyle(grille).gridTemplateColumns.split(" ").length || 1;
      if (e.key === "ArrowLeft" && i % cols) vers(items[i - 1]);
      else if (e.key === "ArrowRight" && i % cols < cols - 1) vers(items[i + 1]);
      else if (e.key === "ArrowDown") vers(items[i + cols] || (Math.floor(i / cols) < Math.floor((items.length - 1) / cols) ? items[items.length - 1] : null));
      else if (e.key === "ArrowUp") vers(i >= cols ? items[i - cols] : ongSel());
    });
    // La molette sur les onglets les fait défiler de côté (ceux qui dépassent à droite deviennent atteignables).
    ongs.addEventListener("wheel", (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && ongs.scrollWidth > ongs.clientWidth) { e.preventDefault(); ongs.scrollLeft += e.deltaY; } }, { passive: false });
    setTimeout(() => { const b = ongSel(); if (b && vue.isConnected) b.focus({ preventScroll: true }); }, 0);
    new IntersectionObserver((es) => { if (es[0].isIntersecting && plus) remplir(); }, { root: vue, rootMargin: "400px 0px" }).observe(fin);
    if (sources.length) choisis(0); else grille.append(mkd("p", "vide", "Cette tuile n’a pas de catalogue."));
  };
  // ---------- La bibliothèque ----------
  const bibliotheque = (vue, ouvrir) => {
    vue.textContent = ""; vue.className = "nvo-vue nvo-biblio";
    const l = liste(), hd = mkd("header");
    hd.append(mkd("h3", null, "Bibliothèque"), mkd("span", null, "Local"));
    const modes = mkd("div", "modes"); modes.append(mkd("span", null, "Enregistrés"), mkd("span", null, "Cloud"));
    const filtre = (petit, valeur, cls) => { const d = mkd("div", cls); const g = mkd("span"); g.append(mkd("small", null, petit), mkd("b", null, valeur)); d.append(g, mkd("i", null, "›")); return d; };
    const fi = mkd("div", "filtres"); fi.append(filtre("Type", "Tout (" + l.length + ")"), filtre("Tri", "Ajoutés ↓"), filtre("Watched", "All", "seul"));
    vue.append(hd, modes, fi);
    if (!l.length) { const e = mkd("div", "nvo-etat"); e.innerHTML = SVG.signet; e.append(mkd("b", null, "Aucun tout pour le moment"), mkd("span", null, "Commencez à enregistrer vos favoris pour les voir ici")); vue.append(e); return; }
    const g = mkd("div", "grille"); l.forEach((m) => g.append(item(m, ouvrir))); vue.append(g);
  };

  // Outils communs à Découvrir et aux Paramètres
  const proche = (liste, x) => liste.reduce((a, c) => Math.abs(c.getBoundingClientRect().left - x) < Math.abs(a.getBoundingClientRect().left - x) ? c : a);
  // Fait défiler zone pour que x soit visible (sans toucher à la page autour, contrairement à scrollIntoView).
  const montreDans = (zone, x, part) => {
    const z = zone.getBoundingClientRect(), r = x.getBoundingClientRect(), m = zone.clientHeight * .06;
    let d = 0;
    if (part != null) d = r.top + r.height / 2 - z.top - zone.clientHeight * part;
    else if (r.top < z.top + m) d = r.top - z.top - m;
    else if (r.bottom > z.bottom - m) d = r.bottom - z.bottom + m;
    if (d) zone.scrollTo({ top: Math.max(0, zone.scrollTop + d), behavior: calme() ? "auto" : "smooth" });
  };
  // Une fiche ouverte depuis une vue : à sa fermeture, la sélection revient où elle était.
  const ouvreDepuis = (ouvrir, m, revient) => {
    const f = ouvrir(m); if (!f || !f.parentNode) return;
    const mo = new MutationObserver(() => { if (!f.isConnected) { mo.disconnect(); revient(); } });
    mo.observe(f.parentNode, { childList: true });
  };

  // ---------- Découvrir (DiscoverScreen ; « Emplacement de Découvrir » : panneau latéral) ----------
  // Fixes en haut : le titre, les listes Type, Catalogue et Genre, et la ligne « Catalogue FR • Action » (sans le
  // type : « Afficher le type de catalogue » est désactivé). Dessous, la grille du catalogue choisi défile seule ;
  // la carte sélectionnée reste à 42 % de sa hauteur. Rien ne se passe au survol d'une affiche (pas de fond).
  const FL_BAS = '<svg viewBox="0 0 24 24"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>';
  const FL_HAUT = '<svg viewBox="0 0 24 24"><path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
  const ROND = '<svg class="nvo-spin" viewBox="0 0 48 48" role="img" aria-label="Chargement"><circle cx="24" cy="24" r="15.4"/></svg>';
  const manifestes = new Map();
  const manifeste = (base) => {
    if (!manifestes.has(base)) manifestes.set(base, fetch(base + "/manifest.json").then((r) => r.json()).catch((e) => { manifestes.delete(base); throw e; }));
    return manifestes.get(base);
  };
  const nomType = (t) => t === "movie" ? "Film" : t === "series" ? "Série" : t === "tv" ? "TV" : String(t).charAt(0).toUpperCase() + String(t).slice(1);
  const decouvrir = (vue, base, ouvrir, menuG, retourEcran) => {
    vue.textContent = ""; vue.className = "nvo-vue nvo-dec"; vue.tabIndex = -1;
    const filtres = mkd("div", "filtres"), infos = mkd("p", "infos"), zone = mkd("div", "defile"), grille = mkd("div", "grille");
    zone.append(grille); vue.append(mkd("h3", null, "Découvrir"), filtres, infos, zone);
    let cats = [], addon = "", type = "movie", cle = null, genre = null;
    let n = 0, page = 1, plus = false, charge = false, sel = null, ouverte = null, action = null, versNouveau = false;
    const cat = () => cats.find((c) => c.key === cle) || null;
    const etat = (t, s) => { const e = mkd("div", "nvo-etat"); e.innerHTML = SVG.loupe; e.append(mkd("b", null, t), mkd("span", null, s)); return e; };

    // Le titre trop long d'une affiche sélectionnée défile (45 dp/s, 3 passages, un tiers de largeur d'écart).
    const defil = (it) => {
      const t = it.querySelector("b"); if (!t || calme() || t.scrollWidth <= t.clientWidth + 1) return;
      const w = t.firstChild.getBoundingClientRect().width, g = t.clientWidth / 3, dp = vue.clientWidth / 960;
      t.style.setProperty("--g", g + "px"); t.style.setProperty("--x", -(w + g) + "px"); t.style.setProperty("--t", ((w + g) / (45 * dp)) + "s");
      t.append(mkd("span", null, t.firstChild.textContent)); t.classList.add("defil");
    };
    const finDefil = (it) => { const t = it.querySelector("b.defil"); if (t) { t.classList.remove("defil"); t.lastChild.remove(); } };
    const choisit = (x, clavier) => {
      if (!x) return;
      if (x !== sel) {
        if (sel) { sel.classList.remove("focus"); finDefil(sel); }
        sel = x; x.classList.add("focus");
        if (x._m) defil(x);
      }
      x.focus({ preventScroll: true });
      if (clavier && zone.contains(x)) montreDans(zone, x, .42);
    };

    // Les trois listes (DropdownMenu sous la case, l'option choisie sélectionnée à l'ouverture)
    const fermeListe = () => {
      if (!ouverte) return;
      const { l, b } = ouverte; ouverte = null; l.remove(); b._fl.innerHTML = FL_BAS; b._ferme = Date.now(); choisit(b);
    };
    const ouvreListe = (b) => {
      fermeListe();
      const opts = b._options(); if (!opts.length) return;
      const l = mkd("div", "nvo-liste"); l.setAttribute("role", "listbox"); l.setAttribute("aria-label", b._nom);
      l.style.left = b.offsetLeft + "px"; l.style.top = (b.offsetTop + b.offsetHeight) + "px"; l.style.width = b.offsetWidth + "px";
      let cur = null;
      const met = (o) => {
        if (!o) return; if (cur) cur.classList.remove("focus"); cur = o; o.classList.add("focus"); o.focus({ preventScroll: true });
        if (o.offsetTop < l.scrollTop) l.scrollTop = o.offsetTop - o.offsetHeight / 4;
        else if (o.offsetTop + o.offsetHeight > l.scrollTop + l.clientHeight) l.scrollTop = o.offsetTop + o.offsetHeight * 1.25 - l.clientHeight;
      };
      opts.forEach((o) => {
        const x = mkd("button", null, o.label); x.type = "button"; x.setAttribute("role", "option"); x.setAttribute("aria-selected", String(o.value === b._valeur()));
        x.addEventListener("click", () => { fermeListe(); if (o.value !== b._valeur()) b._change(o.value); });
        l.append(x);
      });
      l.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; const x = e.target.closest("button"); if (x && x !== cur) met(x); });
      l.addEventListener("keydown", (e) => {
        const xs = [...l.children], i = xs.indexOf(cur);
        if (e.key === "ArrowDown") met(xs[Math.min(i + 1, xs.length - 1)]);
        else if (e.key === "ArrowUp") met(xs[Math.max(i - 1, 0)]);
        else if (e.key === "Enter" || e.key === " ") { if (cur) cur.click(); }
        else if (["Escape", "Backspace", "ArrowLeft", "ArrowRight"].includes(e.key)) fermeListe();
        else return;
        e.preventDefault(); e.stopPropagation();
      });
      // Pendant que la liste est ouverte, la case reprend son aspect normal (flèche vers le haut, grise).
      b._fl.innerHTML = FL_HAUT; b.classList.remove("focus"); sel = null;
      vue.append(l); ouverte = { l, b };
      met(l.querySelector('[aria-selected="true"]') || l.firstChild);
      if (window.sfx) sfx.click();
    };
    vue.addEventListener("pointerdown", (e) => { if (ouverte && !ouverte.l.contains(e.target)) fermeListe(); }, true);
    const caseListe = (nom, options, valeur, change) => {
      const b = mkd("button", "choix"), v = mkd("b"), fl = mkd("i"), l = mkd("span"); b.type = "button"; b.tabIndex = -1;
      fl.innerHTML = FL_BAS; l.append(v, fl); b.append(mkd("small", null, nom), l);
      Object.assign(b, { _nom: nom, _options: options, _valeur: valeur, _change: change, _texte: v, _fl: fl });
      b.addEventListener("click", () => { if (Date.now() - (b._ferme || 0) > 250) ouvreListe(b); });
      filtres.append(b); return b;
    };
    // Changer de type prend le premier catalogue de ce type ; changer de catalogue remet le genre « Par défaut ».
    const cType = caseListe("Type", () => [...new Set(cats.map((c) => c.type))].map((t) => ({ label: nomType(t), value: t })), () => type, (t) => {
      const c = cats.find((x) => x.key === cle && x.type === t) || cats.find((x) => x.type === t);
      type = t; cle = c ? c.key : null; genre = null; relance();
    });
    const cCat = caseListe("Catalogue", () => cats.filter((c) => c.type === type).map((c) => ({ label: c.name, value: c.key })), () => cle, (k) => {
      const c = cats.find((x) => x.key === k); if (!c) return;
      cle = k; type = c.type; genre = null; relance();
    });
    const cGenre = caseListe("Genre", () => [{ label: "Par défaut", value: "" }].concat(((cat() || {}).genres || []).map((g) => ({ label: g, value: g }))), () => genre || "", (g) => { genre = g || null; relance(); });
    const cases = [cType, cCat, cGenre];
    const etiquettes = () => {
      cType._texte.textContent = nomType(type);
      cCat._texte.textContent = cat() ? cat().name : "Sélectionner";
      cGenre._texte.textContent = genre || "Par défaut";
      infos.textContent = cat() ? [addon, genre].filter(Boolean).join(" • ") : "";
    };

    // La grille : une page du catalogue à la fois ; la suivante arrive quand on approche du bas.
    const carteDec = (m) => {
      const b = mkd("button", "nvo-item"), t = mkd("b"); b.type = "button"; b.tabIndex = -1; b.setAttribute("aria-label", m.name || "");
      const c = carte(null); c.removeAttribute("aria-label"); remplit(c, m);
      t.append(mkd("span", null, m.name || "")); b.append(c, t); b._m = m;
      return b;
    };
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting) && plus && !charge) suite(); }, { root: zone, rootMargin: "0px 0px 30% 0px" });
    const suite = () => {
      const c = cat(); if (!c || charge) return;
      charge = true; const k = n, pas = c.pageSize || 100, ex = [];
      if (action) { if (sel === action) sel = null; action.disabled = true; action.classList.remove("focus"); action.innerHTML = ROND; }
      if (genre) ex.push("genre=" + encodeURIComponent(genre));
      if (page > 1) ex.push("skip=" + (page - 1) * pas);
      const avant = grille.querySelectorAll(".nvo-item").length;
      fetch(base + "/catalog/" + c.type + "/" + encodeURIComponent(c.id) + (ex.length ? "/" + ex.join("&") : "") + ".json").then((r) => r.json()).then((d) => {
        if (k !== n) return;
        grille.querySelectorAll(".charge, .action").forEach((x) => { io.unobserve(x); x.remove(); }); action = null;
        const vus = new Set([...grille.querySelectorAll(".nvo-item")].map((x) => x._m.id));
        const recus = (d && d.metas) || [];
        recus.filter((m) => m && m.id && !vus.has(m.id)).forEach((m) => { vus.add(m.id); grille.append(carteDec(m)); });
        page++; plus = c.pageSize ? recus.length >= c.pageSize : recus.length > 0;
        if (!avant && !grille.querySelector(".nvo-item")) { plus = false; grille.append(etat("Aucun contenu trouvé", "Essayez un autre genre ou catalogue")); return; }
        if (plus) { action = mkd("button", "action", "Charger plus"); action.type = "button"; action.tabIndex = -1; grille.append(action); io.observe(action); }
        if (versNouveau) { versNouveau = false; const it = grille.querySelectorAll(".nvo-item")[avant]; if (it) choisit(it, true); }
      }).catch(() => {
        if (k !== n) return;
        grille.querySelectorAll(".charge").forEach((x) => x.remove());
        if (action) { action.disabled = false; action.textContent = "Charger plus"; }
        else if (!grille.querySelector(".nvo-item")) grille.append(etat("Aucun contenu trouvé", "Essayez un autre genre ou catalogue"));
      }).finally(() => { if (k === n) charge = false; });
    };
    const relance = () => {
      etiquettes(); if (cle) ecrit("apercu-decouvrir", cle);
      n++; page = 1; plus = false; charge = false; action = null; versNouveau = false;
      if (sel && grille.contains(sel)) sel = null;
      grille.querySelectorAll(".action").forEach((x) => io.unobserve(x));
      grille.textContent = ""; zone.scrollTop = 0;
      if (!cat()) { grille.append(etat("Sélectionnez un catalogue", "Choisissez un catalogue à parcourir")); return; }
      const ch = mkd("div", "charge"); ch.innerHTML = ROND; grille.append(ch);
      suite();
    };

    // La télécommande : les flèches vont des listes à la grille ; « Gauche » au bord ouvre la barre latérale.
    const cartes = () => [...grille.querySelectorAll(".nvo-item, .action:not(:disabled)")];
    vue.addEventListener("keydown", (e) => {
      if (ouverte) return;
      const k = e.key;
      if (k === "Backspace") { e.preventDefault(); e.stopPropagation(); retourEcran(); return; }
      if (k === "Enter" || k === " ") { if (sel && sel.isConnected) { e.preventDefault(); sel.click(); } return; }
      if (!/^Arrow/.test(k)) return;
      e.preventDefault();
      if (!sel || !sel.isConnected) { choisit(cType, true); return; }
      if (filtres.contains(sel)) {
        const i = cases.indexOf(sel);
        if (k === "ArrowLeft") { if (i > 0) choisit(cases[i - 1], true); else menuG(); }
        else if (k === "ArrowRight") { if (i < cases.length - 1) choisit(cases[i + 1], true); }
        else if (k === "ArrowDown") { const cs = cartes(), cols = getComputedStyle(grille).gridTemplateColumns.split(" ").length; if (cs.length) choisit(proche(cs.slice(0, cols), sel.getBoundingClientRect().left), true); }
        return;
      }
      const cs = cartes(), i = cs.indexOf(sel); if (i < 0) return;
      const cols = getComputedStyle(grille).gridTemplateColumns.split(" ").length || 1, col = i % cols;
      if (k === "ArrowLeft") { if (col === 0) menuG(); else choisit(cs[i - 1], true); }
      else if (k === "ArrowRight") { if (col < cols - 1 && cs[i + 1]) choisit(cs[i + 1], true); }
      else if (k === "ArrowDown") { if (cs[i + cols]) choisit(cs[i + cols], true); else if (Math.floor(i / cols) < Math.floor((cs.length - 1) / cols)) choisit(cs[cs.length - 1], true); }
      else if (k === "ArrowUp") { if (i >= cols) choisit(cs[i - cols], true); else choisit(proche(cases, sel.getBoundingClientRect().left), true); }
    });
    // La souris déplace la sélection seulement quand elle bouge vraiment (pas pendant le défilement).
    let mx = -1, my = -1;
    vue.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || ouverte || (e.screenX === mx && e.screenY === my)) return;
      mx = e.screenX; my = e.screenY;
      const x = e.target.closest(".choix, .nvo-item, .action:not(:disabled)"); if (x && x !== sel) choisit(x);
    });
    grille.addEventListener("click", (e) => {
      const it = e.target.closest(".nvo-item");
      if (it) { choisit(it); ouvreDepuis(ouvrir, it._m, () => { if (sel && sel.isConnected) sel.focus({ preventScroll: true }); }); return; }
      const a = e.target.closest(".action"); if (a && !a.disabled) { versNouveau = true; suite(); }
    });
    // « Retour » : d'abord ferme la liste ouverte, puis remonte de la grille à la liste « Type ».
    vue._retour = () => { if (ouverte) { fermeListe(); return true; } if (sel && zone.contains(sel)) { choisit(cType, true); return true; } return false; };

    etiquettes();
    const ch = mkd("div", "charge"); ch.innerHTML = ROND; grille.append(ch);
    manifeste(base).then((man) => {
      if (!vue.isConnected) return;
      addon = man.name || "";
      // Tous les catalogues de l'addon, sauf ceux qui ne servent qu'à la recherche
      cats = (man.catalogs || []).filter((c) => !(c.extra || []).some((x) => x.name === "search" && x.isRequired) && !(c.extraRequired || []).includes("search"))
        .map((c) => ({ key: c.type + "/" + c.id, type: c.type, id: c.id, name: c.name || c.id, pageSize: c.pageSize, genres: ((c.extra || []).find((x) => x.name === "genre") || {}).options || c.genres || [] }));
      const c0 = cats.find((c) => c.key === lit("apercu-decouvrir")) || cats[0];
      cle = c0 ? c0.key : null; type = c0 ? c0.type : "movie";
      relance();
    }).catch(() => { grille.textContent = ""; grille.append(etat("Aperçu indisponible", "Vérifie ta connexion et réessaie.")); });
    setTimeout(() => { if (!sel) vue.focus({ preventScroll: true }); }, 0);
  };

  // ---------- Paramètres (SettingsScreen, style « Par défaut ») ----------
  // Les écrans du motion design de l'étape 9 (mêmes valeurs), dessinés comme dans Nuvio TV : les rubriques à gauche,
  // l'écran à droite sur une grande carte. La rubrique suit la sélection au bout de 140 ms ; « Droite » ou OK entre
  // dans l'écran, « Gauche » ou « Retour » en ressort. Les interrupteurs, puces et sections répondent, sans rien garder.
  const MI = {
    person: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    people: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
    groups: "M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58C.48 14.9 0 15.62 0 16.43V17c0 .55.45 1 1 1h3.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 3.43c0-.81-.48-1.53-1.22-1.85-.85-.37-1.79-.58-2.78-.58-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H23c.55 0 1-.45 1-1v-.57zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z",
    palette: "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
    grille: "M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z",
    explore: "M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1 1.1-.49 1.1-1.1-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z",
    lecture: "M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z",
    lien: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
    sync: "M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z",
    build: "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z",
    info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
    droite: "M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z",
    haut: "M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z",
    bas: "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z",
    check: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    moins: "M19 13H5v-2h14v2z",
    ext: "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
    dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    agenda: "M20 13H3c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h17c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zm0-10H3c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h17c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1z",
    sidebar: "M16 20H2V4h14v16zm2-12h4V4h-4v4zm0 12h4v-4h-4v4zm0-6h4v-4h-4v4z",
    history: "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
    centre: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 7H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4z",
    coin: "M19 19h2v2h-2v-2zm0-2h2v-2h-2v2zM3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm0-4h2V3H3v2zm4 0h2V3H7v2zm8 16h2v-2h-2v2zm-4 0h2v-2h-2v2zm4 0h2v-2h-2v2zm-8 0h2v-2H7v2zm-4 0h2v-2H3v2zM21 8c0-2.76-2.24-5-5-5h-5v2h5c1.65 0 3 1.35 3 3v5h2V8z",
    ar: "M18.25 7.6l-5.5-3.18c-.46-.27-1.04-.27-1.5 0L5.75 7.6c-.46.27-.75.76-.75 1.3v6.35c0 .54.29 1.03.75 1.3l5.5 3.18c.46.27 1.04.27 1.5 0l5.5-3.18c.46-.27.75-.76.75-1.3V8.9c0-.54-.29-1.03-.75-1.3zM7 14.96v-4.62l4 2.32v4.61l-4-2.31zm5-4.03L8 8.61l4-2.31 4 2.31-4 2.32zm1 6.34v-4.61l4-2.32v4.62l-4 2.31zM7 2H3.5C2.67 2 2 2.67 2 3.5V7h2V4h3V2zm10 0h3.5c.83 0 1.5.67 1.5 1.5V7h-2V4h-3V2zM7 22H3.5c-.83 0-1.5-.67-1.5-1.5V17h2v3h3v2zm10 0h3.5c.83 0 1.5-.67 1.5-1.5V17h-2v3h-3v2z",
    photos: "M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z",
    doc: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    liste: "M3 14h4v-4H3v4zm0 5h4v-4H3v4zM3 9h4V5H3v4zm5 5h13v-4H8v4zm0 5h13v-4H8v4zM8 5v4h13V5H8z",
    ecran: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM9.5 16.5v-9l7 4.5-7 4.5z",
    playlist: "M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm13-1v8l6-4z",
    suivant: "M21 3H3c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h5v2h8v-2h2v-2H3V5h18v8h2V5c0-1.11-.9-2-2-2zm-8 7V7h-2v3H8v2h3v3h2v-3h3v-2h-3zm11 8l-4.5 4.5L18 21l3-3-3-3 1.5-1.5L24 18z",
    avance: "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z",
    calques: "M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z",
    son: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
    stt: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z",
    video: "M3 6h18v5h2V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9v-2H3V6zm12 6L9 8v8l6-4zm7.71 6.06c.02-.2.04-.4.04-.6s-.02-.4-.04-.6l1.08-.85c.1-.08.12-.21.06-.32l-1.02-1.77c-.06-.11-.19-.15-.31-.11l-1.28.5c-.27-.2-.55-.37-.86-.5l-.19-1.35c-.02-.12-.12-.21-.25-.21h-2.05c-.13 0-.23.09-.25.21l-.19 1.35c-.31.13-.6.3-.86.5l-1.28-.5c-.12-.05-.25 0-.31.11l-1.02 1.77c-.06.11-.04.24.06.32l1.08.85c-.02.2-.03.4-.03.6s.02.4.04.6l-1.08.85c-.1.08-.12.21-.06.32l1.02 1.77c.06.11.19.15.31.11l1.27-.5c.27.2.55.37.86.5l.19 1.35c.02.12.12.21.25.21h2.05c.13 0 .23-.09.25-.21l.19-1.35c.31-.13.6-.3.86-.5l1.27.5c.12.05.25 0 .31-.11l1.02-1.77c.06-.11.04-.24-.06-.32l-1.07-.85zM19 19.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
    reseau: "M15.9 5c-.17 0-.32.09-.41.23l-.07.15-5.18 11.65c-.16.29-.26.61-.26.96 0 1.11.9 2.01 2.01 2.01.96 0 1.77-.68 1.96-1.59l.01-.03L16.4 5.5c0-.28-.22-.5-.5-.5zM1 9l2 2c2.88-2.88 6.79-4.08 10.53-3.62l1.19-2.68C9.89 3.84 4.74 5.27 1 9zm20 2l2-2c-1.64-1.64-3.55-2.82-5.59-3.57l-.53 2.82c1.5.62 2.9 1.53 4.12 2.75zm-4 4l2-2c-.8-.8-1.7-1.42-2.66-1.89l-.55 2.92c.42.27.83.59 1.21.97zM5 13l2 2c1.13-1.13 2.56-1.79 4.03-2l1.28-2.88c-2.63-.08-5.3.87-7.31 2.88z",
    hub: "M8.4 18.2c.38.5.6 1.12.6 1.8 0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3c.44 0 .85.09 1.23.26l1.41-1.77c-.92-1.03-1.29-2.39-1.09-3.69l-2.03-.68c-.54.83-1.46 1.38-2.52 1.38-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3v.2l2.03.68c.64-1.21 1.82-2.09 3.22-2.32V5.91C9.96 5.57 9 4.4 9 3c0-1.66 1.34-3 3-3s3 1.34 3 3c0 1.4-.96 2.57-2.25 2.91v2.16c1.4.23 2.58 1.11 3.22 2.32L18 9.71V9.5c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3c-1.06 0-1.98-.55-2.52-1.37l-2.03.68c.2 1.29-.16 2.65-1.09 3.69l1.41 1.77c.38-.17.79-.27 1.23-.27 1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3c0-.68.22-1.3.6-1.8l-1.41-1.77c-1.35.75-3.01.76-4.37 0L8.4 18.2z",
    nuage: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",
    cle: "M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
    extension: "M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z",
    dns: "M20 13H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zM7 19c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM20 3H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zM7 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
    prise: "M16.01 7L16 3h-2v4h-4V3H8v4h-.01C7 6.99 6 7.99 6 8.99v5.49L9.5 18v3h5v-3l3.5-3.51v-5.5c0-1-1-2-1.99-1.99z",
  };
  const mi = (n, cls) => '<svg class="' + (cls || "np-ico") + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + MI[n] + '"/></svg>';
  // Icônes au trait du motion design (data-ico) → icônes Material de Nuvio TV
  const ICO = { home: "dashboard", rows: "agenda", nav: "sidebar", play2: "history", target: "centre", card: "coin", depth: "ar", image: "photos", doc: "doc", list: "liste",
    player: "ecran", stream: "playlist", next: "suivant", skip: "avance", layers: "calques", audio: "son", cc: "stt", screen: "video", wifi: "reseau", p2p: "hub",
    cloud: "nuage", key: "cle", puzzle: "extension", server: "dns", plug: "prise", users: "groups" };
  const RAIL_ICO = { user: "person", users: "people", palette: "palette", grid: "grille", compass: "explore", play: "lecture", link: "lien", sync: "sync", wrench: "build", info: "info" };
  const txtSvg = (fond, lettre, taille) => '<svg class="np-logo' + (taille ? " grand" : "") + '" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" fill="' + fond + '"/><text x="12" y="16.4" text-anchor="middle" font-family="Inter,sans-serif" font-size="11.5" font-weight="800" fill="#fff">' + lettre + '</text></svg>';
  const LOGOS = {
    trakt: '<svg class="np-logo grand" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#ED1C24"/><circle cx="12" cy="12" r="7.6" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M8.7 11.4l2.4 2.4 4.9-4.9" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    simkl: txtSvg("#000", "S", true), mdblist: txtSvg("#0E5FA8", "M", true), mdblistPetit: txtSvg("#0E5FA8", "M"),
    tmdb: '<svg class="np-logo" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="nvo-tmdb" x1="0" x2="1"><stop offset="0" stop-color="#90CEA1"/><stop offset=".56" stop-color="#3CBEC9"/><stop offset="1" stop-color="#00B3E5"/></linearGradient></defs><rect x="1" y="6" width="22" height="12" rx="3.5" fill="url(#nvo-tmdb)"/><text x="12" y="14.6" text-anchor="middle" font-family="Inter,sans-serif" font-size="6.6" font-weight="800" fill="#0D253F">TMDB</text></svg>',
  };
  // Couleurs des thèmes de Nuvio TV (ThemeAccess)
  const THEMES = { Custom: "#EC70A9", Blanc: "#F5F5F5", Cramoisi: "#E53935", "Océan": "#1E88E5", Violet: "#8E24AA", "Émeraude": "#43A047", Ambre: "#FB8C00", Rose: "#D81B60" };
  const SEL_F = ".np-row:not(.dim), .np-sw, .np-card, .np-chip-row i, .np-url";
  const parametres = (vue, menuG, retourEcran) => {
    vue.textContent = ""; vue.className = "nvo-vue nvo-par"; vue.tabIndex = -1;
    const surf = mkd("div", "np-surf"), rail = mkd("nav", "np-rail"), rl = mkd("div", "np-rliste"), pane = mkd("div", "np-pane");
    const fh = mkd("i", "np-fl haut"), fb = mkd("i", "np-fl bas"); fh.innerHTML = mi("haut", "fl"); fb.innerHTML = mi("bas", "fl");
    rail.setAttribute("aria-label", "Rubriques des paramètres"); rail.append(rl, fh, fb); surf.append(rail, pane); vue.append(surf);
    const items = [];
    NV_PAR.rubriques.forEach((r) => {
      if (!r) { rl.append(mkd("i", "np-sep")); return; }
      const b = mkd("button", "np-ru"); b.type = "button"; b.tabIndex = -1; b._i = items.length;
      b.innerHTML = mi(r[0] === "Watch party" ? "groups" : RAIL_ICO[r[1]]); b.append(mkd("span", null, r[0])); b.insertAdjacentHTML("beforeend", mi("droite", "np-chev"));
      rl.append(b); items.push(b);
    });
    const fleches = () => { fh.classList.toggle("on", rl.scrollTop > 2); fb.classList.toggle("on", rl.scrollTop + rl.clientHeight < rl.scrollHeight - 2); };
    rl.addEventListener("scroll", fleches, { passive: true });
    const pageDe = (i) => NV_PAR.pages.find((p) => p.side === i && !p.parent);
    const pageId = (id) => NV_PAR.pages.find((p) => p.id === id);
    let selI = 0, courante = null, f = null, zone = "rail", t140 = 0;

    // L'écran de droite : en-tête, puis une seule carte qui défile (Disposition, Lecture…) ou des cartes qui défilent avec l'en-tête.
    const habille = (c) => {
      c.querySelectorAll(SEL_F).forEach((x) => { x.tabIndex = -1; });
      c.querySelectorAll(".np-ext .np-val svg").forEach((s) => { s.outerHTML = mi("ext", "np-chev ext"); });
      c.querySelectorAll("svg.np-chev:not(.ext)").forEach((s) => { s.outerHTML = mi("droite", "np-chev"); });
      c.querySelectorAll("svg[data-ico]").forEach((s) => {
        const n = s.dataset.ico;
        const h = s.closest('[data-enter="tmdb"]') ? LOGOS.tmdb : n === "star" ? LOGOS.mdblistPetit : LOGOS[n] || (ICO[n] ? mi(ICO[n]) : "");
        if (h) s.outerHTML = h;
      });
      c.querySelectorAll(".np-sw").forEach((s) => { const i = s.querySelector("i"), nom = s.textContent.trim(); if (THEMES[nom]) i.style.background = THEMES[nom]; i.style.color = nom === "Blanc" ? "#111" : "#fff"; });
      coche(c);
      c.querySelectorAll(".np-card").forEach((k) => { const s = mkd("span", "np-coche"); s.innerHTML = mi("check"); (k.querySelector("b") || k).append(s); });
      c.querySelectorAll(".np-sl > i").forEach((i) => { i.innerHTML = mi(i.textContent.trim() === "+" ? "plus" : "moins"); });
      c.querySelectorAll(".np-about").forEach((a) => {
        const im = mkd("img"); im.alt = "Nuvio"; im.src = LOGO_NUVIO; im.onerror = () => im.replaceWith(mkd("b", null, "NUVIO"));
        a.append(im, mkd("small", null, "Fait avec ❤️ par Tapframe et ses amis"), mkd("small", null, "Version " + VERSION_TV));
      });
    };
    const coche = (c) => c.querySelectorAll(".np-sw i").forEach((i) => { i.innerHTML = i.parentNode.classList.contains("sel") ? mi("check") : ""; });
    const dessine = (p) => {
      if (!p) return;
      courante = p; pane.textContent = ""; pane.className = "np-pane";
      const tete = mkd("div", "np-tete"), corps = mkd("div", "np-corps");
      tete.append(mkd("h3", null, p.title), mkd("p", null, p.sub)); corps.innerHTML = p.body;
      pane.append(tete, corps);
      const seule = corps.children.length === 1 && corps.firstElementChild.classList.contains("np-group") && !corps.querySelector(":scope > .np-group > .np-gh");
      if (seule) corps.firstElementChild.classList.add("np-defile"); else pane.classList.add("tout", "np-defile");
      habille(corps);
      if (f && !f.isConnected) f = null;
    };

    // La sélection : dans la barre de gauche (zone « rail ») ou dans l'écran (zone « pane »)
    const metFocus = (x) => {
      if (!x) return;
      if (f !== x) { if (f) f.classList.remove("focus"); f = x; x.classList.add("focus"); }
      x.focus({ preventScroll: true });
      const d = x.closest(".np-defile, .np-rliste"); if (d) montreDans(d, x);
      const h = x.closest(".np-swatches"); if (h) { if (x.offsetLeft < h.scrollLeft) h.scrollLeft = x.offsetLeft - 8; else if (x.offsetLeft + x.offsetWidth > h.scrollLeft + h.clientWidth) h.scrollLeft = x.offsetLeft + x.offsetWidth - h.clientWidth + 8; }
    };
    const marque = () => { items.forEach((b, i) => b.classList.toggle("sel", i === selI)); rail.classList.toggle("actif", zone === "rail"); };
    const railFocus = (b) => {
      zone = "rail"; metFocus(b); marque(); fleches();
      clearTimeout(t140);
      t140 = setTimeout(() => { if (selI !== b._i || (courante && courante.parent)) { selI = b._i; marque(); dessine(pageDe(selI)); } }, 140);
    };
    const focusables = () => [...pane.querySelectorAll(SEL_F)].filter((x) => !x.closest(".np-secw:not(.open) .np-kids"));
    const premier = () => pane.querySelector(".np-sw.sel") || focusables()[0];
    const entre = (i) => {
      clearTimeout(t140);
      if (selI !== i || !courante || courante.side !== i) { selI = i; dessine(pageDe(i)); }
      montreDans(rl, items[i]);
      const c = premier(); if (!c) return;
      zone = "pane"; marque(); metFocus(c);
      if (window.sfx) sfx.click();
    };
    const versRail = () => { zone = "pane"; railFocus(items[selI]); };
    const groupe = (x) => x && x.closest(".np-swatches, .np-cards, .np-chip-row");
    const bouge = (k) => {
      const fs = focusables(), i = fs.indexOf(f);
      if (i < 0) { metFocus(fs[0]); return; }
      const g = groupe(f);
      if (k === "ArrowLeft" || k === "ArrowRight") {
        const s = g ? (k === "ArrowLeft" ? f.previousElementSibling : f.nextElementSibling) : null;
        if (s) metFocus(s); else if (k === "ArrowLeft") versRail();
        return;
      }
      const d = k === "ArrowDown" ? 1 : -1;
      let j = i + d; while (fs[j] && g && groupe(fs[j]) === g) j += d;
      const c = fs[j]; if (!c) return;
      const g2 = groupe(c);
      metFocus(g2 ? proche(fs.filter((x) => groupe(x) === g2), f.getBoundingClientRect().left) : c);
    };
    const active = (x) => {
      if (x.classList.contains("np-sec")) {
        if (x.hasAttribute("data-keep")) return;
        const o = x.closest(".np-secw").classList.toggle("open"); x.querySelector(".np-etat").textContent = o ? "Ouvert" : "Fermé";
      } else if (x.dataset.enter) { dessine(pageId(x.dataset.enter)); metFocus(premier()); }
      else if (x.classList.contains("np-sw") || x.classList.contains("np-card")) { [...x.parentNode.children].forEach((s) => s.classList.toggle("sel", s === x)); coche(pane); }
      else if (x.matches(".np-chip-row i")) { const t = x.querySelector(".np-tg"); if (t) t.classList.toggle("on"); else [...x.parentNode.children].forEach((s) => s.classList.toggle("sel", s === x)); }
      else { const t = x.querySelector(":scope > .np-tg"); if (t) { const on = t.classList.toggle("on"); t.setAttribute("aria-label", on ? "activé" : "désactivé"); } }
      if (window.sfx) sfx.click();
    };

    vue.addEventListener("keydown", (e) => {
      const k = e.key;
      if (k === "Backspace") { e.preventDefault(); e.stopPropagation(); retourEcran(); return; }
      if (k === "Enter" || k === " ") { e.preventDefault(); if (zone === "rail" && f) entre(f._i); else if (f) active(f); return; }
      if (!/^Arrow/.test(k)) return;
      e.preventDefault();
      if (!f || !f.isConnected) { railFocus(items[selI]); return; }
      if (zone === "rail") {
        const i = items.indexOf(f);
        if (k === "ArrowUp" && i > 0) railFocus(items[i - 1]);
        else if (k === "ArrowDown" && i < items.length - 1) railFocus(items[i + 1]);
        else if (k === "ArrowRight") entre(i);
        else if (k === "ArrowLeft") menuG();
      } else bouge(k);
    });
    let mx = -1, my = -1;
    vue.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || (e.screenX === mx && e.screenY === my)) return;
      mx = e.screenX; my = e.screenY;
      const b = e.target.closest(".np-ru"); if (b) { if (b !== f) railFocus(b); return; }
      const x = e.target.closest(SEL_F);
      if (x && x !== f && pane.contains(x)) { zone = "pane"; marque(); metFocus(x); }
    });
    vue.addEventListener("click", (e) => {
      const b = e.target.closest(".np-ru"); if (b) { entre(b._i); return; }
      const x = e.target.closest(SEL_F); if (x && pane.contains(x)) { zone = "pane"; marque(); metFocus(x); active(x); }
    });
    // « Retour » : d'une sous-page (TMDB) vers Intégrations, puis de l'écran vers la barre de gauche.
    vue._retour = () => {
      if (zone !== "pane") return false;
      if (courante && courante.parent) { const de = courante.id; dessine(pageId(courante.parent)); metFocus(pane.querySelector('[data-enter="' + de + '"]') || premier()); return true; }
      versRail(); return true;
    };
    marque(); dessine(pageDe(0)); railFocus(items[0]);
    requestAnimationFrame(fleches);
  };

  // ---------- L'écran complet : accueil, recherche, bibliothèque, fiche, barre latérale ----------
  // ecran(hote) crée .nvo dans hote. L'appelant remplit l'accueil avec rangee() puis appelle pret().
  const ecran = (hote, opts = {}) => {
    const el = mkd("div", "nvo"), h = hero(), rangees = mkd("div", "nvo-rangees"), bord = mkd("div", "nvo-bord");
    el.append(h.el, rangees, bord); hote.append(el);
    let vue = "accueil", vueEl = null, menuVu = false;
    const ouvrir = (m) => ouvreFiche(el, m);
    const aller = (v, tuileOuverte) => {
      if (vueEl) { vueEl.remove(); vueEl = null; }
      vue = v; h.stopVideo();
      if (v === "recherche" || v === "biblio") { vueEl = mkd("div"); el.append(vueEl); (v === "recherche" ? recherche : bibliotheque)(vueEl, ouvrir); }
      else if (v === "decouvrir") { vueEl = mkd("div"); el.append(vueEl); decouvrir(vueEl, opts.base ? opts.base() : NV_ORIG, ouvrir, ouvreMenu, retour); }
      else if (v === "reglages") { vueEl = mkd("div"); el.append(vueEl); parametres(vueEl, ouvreMenu, retour); }
      else if (v === "dossier") { vueEl = mkd("div"); el.append(vueEl); dossier(vueEl, tuileOuverte, opts.base ? opts.base() : NV_ORIG, ouvrir); }
      else { const c = p.sel; if (c) c.focus({ preventScroll: true }); }
      if (window.sfx) sfx.click();
    };
    const ouvreMenu = () => menu(el, vue, aller);
    const p = pilote(el, h, { menu: ouvreMenu });
    bord.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !el.querySelector(".nvo-fiche")) ouvreMenu(); });
    el.addEventListener("click", (e) => {
      const c = e.target.closest(".nvo-rangees .nvo-carte, .nvo-rangees .nvo-tuile"); if (!c || vientDeGlisser()) return;
      if (c._m) ouvrir(c._m);
      else if (c._f && c._collId) aller("dossier", c);
    });
    // Le bouton « Retour » de la télécommande
    const retour = () => {
      const m = el.querySelector(".nvo-menu"); if (m) { m.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return true; }
      const f = el.querySelector(".nvo-fiche"); if (f) { f._retour(); return true; }
      if (vueEl && vueEl._retour && vueEl._retour()) return true;
      if (vue !== "accueil") { aller("accueil"); return true; }
      ouvreMenu(); return true;
    };
    el.addEventListener("keydown", (e) => { if (e.key === "Backspace" && !e.target.matches("input") && el.querySelector(".nvo-fiche")) { e.preventDefault(); e.stopPropagation(); retour(); } });
    addEventListener("ma-liste", () => { if (vue === "biblio" && vueEl) bibliotheque(vueEl, ouvrir); });
    const rangee = (titre) => {
      const s = mkd("section", "nvo-rangee"), piste = mkd("div", "nvo-piste");
      s.append(mkd("h4", null, titre), piste); rangees.append(s); glisse(piste);
      return { section: s, piste };
    };
    return {
      el, hero: h, rangees, rangee, pilote: p, ouvrir, retour, aller,
      get vue() { return vue; },
      // Quelque chose est ouvert par-dessus l'accueil (fiche, menu, recherche, bibliothèque) : « Échap » le referme d'abord.
      ouvert() { return !!el.querySelector(".nvo-fiche, .nvo-menu") || vue !== "accueil"; },
      vider() { rangees.textContent = ""; p.reset(); },
      // Au premier remplissage, le menu est déjà ouvert : sinon on peut ne jamais le découvrir.
      pret() { p.premier(); if (!menuVu) { menuVu = true; if (vue === "accueil" && !el.querySelector(".nvo-fiche")) menu(el, vue, aller, undefined, true); } },
      paysage(on) { el.classList.toggle("paysage", !!on); el.querySelectorAll(".nvo-carte").forEach(peint); },
      pp() { el.classList.toggle("pp", reglages.pp); el.querySelectorAll(".nvo-carte").forEach(peint); },
    };
  };

  return { mkd, cssUrl, imgW, lit, ecrit, tactile, calme, reglages, lienPerso, ppSrc, fiche, baCle, youtube, typeGenre, duree, dateSortie, lignesInfos, imdbEl,
    hero, carte, remplit, peint, tuile, gif, pilote, glisse, vientDeGlisser, menu, MENU, liste, dansListe, basculeListe, ouvreFiche, item, ecran };
})();
`;
