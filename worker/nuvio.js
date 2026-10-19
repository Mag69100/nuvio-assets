/**
 * L'écran Nuvio des aperçus, recopié de Nuvio TV 1.1.0-beta.7 (la version du guide) avec les réglages
 * conseillés de l'étape 9 : Vue moderne, thème Cramoisi, police Inter, cartes « Équilibré » à coins
 * « Pilule », Card Depth Effect, barre latérale moderne cachée (Hide Floating Pill), affiches PostersPlus.
 * Partagé par l'aperçu du hall et du guide (apercu.js) et par celui de la salle 2 (page.js) : les gens
 * voient partout le même accueil, celui qu'ils auront à la fin.
 *
 * Les mesures viennent du code de Nuvio TV (écran de référence 960 × 540 dp) : 1 dp = 1/9,6 cqw.
 */
export const NUVIO_CSS = `/* ---------- L'écran Nuvio (Vue moderne, thème Cramoisi) ---------- */
.nvo { position: absolute; inset: 0; overflow: hidden; background: #0D0D0D; color: #fff; font-family: Inter, "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.nvo button { font-family: inherit; }
/* Le haut de l'accueil : il montre l'affiche sélectionnée (pas de carrousel, pas de bouton). */
.nvo-hero { position: absolute; left: 0; right: 0; top: 0; height: 30.958cqw; pointer-events: none; }
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
.nvo-rangees { position: absolute; left: 0; right: 0; top: 27cqw; bottom: 0; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; scroll-snap-type: y mandatory; overscroll-behavior: contain; padding-bottom: 29.25cqw; }
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
/* Carte paysage sans PostersPlus : dégradé et logo en bas à gauche */
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
  font: 400 max(1.667cqw, 10px) Inter, sans-serif; letter-spacing: .052cqw; white-space: nowrap; transition: transform .18s ease, background .18s ease; outline: none; }
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
.nvo-etat b { margin-top: 2.5cqw; font: 400 2.5cqw/3.333cqw Inter, sans-serif; color: #fff; }
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
@media (prefers-reduced-motion: reduce) { .nvo-menu { animation: none; } .nvo-carte.attente > .reflet { animation: none; } }
`;

/** Le script commun : window.NV. origin = l'adresse de l'addon ; posterUrl = le réglage PostersPlus conseillé (« TA_CLE_TMDB » à la place de la clé). */
export const nuvioJS = (origin, posterUrl) => "const NV_ORIG = " + JSON.stringify(origin) + ", NV_PP = " + JSON.stringify(posterUrl) + ";\n" + `window.NV = (() => {
  const mkd = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const cssUrl = (u) => "url('" + String(u).replace(/'/g, "%27") + "')";
  // Fonds envoyés en w1920 (ou original, w1280 selon la version de l'addon) : on demande la taille utile.
  const imgW = (u, w) => String(u || "").replace(/[/](original|w1920|w1280)[/]/, "/" + w + "/");
  const lit = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ecrit = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const tactile = matchMedia("(hover: none), (pointer: coarse)").matches;
  const calme = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Réglages de l'aperçu (les mêmes partout : hall, guide, salle 2) ----------
  // Affiches PostersPlus : activées d'office (c'est le réglage de l'étape 8). Sans clé TMDB du visiteur,
  // le worker les demande avec la sienne (/affiche/…).
  const reglages = {
    get format() { return lit("apercu-format") === "l" ? "l" : "p"; },
    set format(v) { ecrit("apercu-format", v === "l" ? "l" : "p"); },
    get pp() { return lit("apercu-pp-v2") !== "0"; },
    set pp(v) { ecrit("apercu-pp-v2", v ? "1" : "0"); },
  };
  const cle = () => (lit("tmdb-key") || "").trim();
  const ppSrc = (m, forme) => {
    if (!reglages.pp || !m || !m.id) return "";
    const id = String(m.id), imdb = m.imdb_id || (id.startsWith("tt") ? id : "");
    const k = cle();
    if (/^[A-Fa-f0-9]{32}$/.test(k)) {
      const vals = { "{tmdb_id?}": id.startsWith("tmdb:") ? id.slice(5) : "", "{imdb_id?}": imdb, "{id}": id, "{type}": m.type || "movie", "{shape}": forme };
      let u = NV_PP.replace("TA_CLE_TMDB", encodeURIComponent(k));
      for (const [a, b] of Object.entries(vals)) u = u.split(a).join(encodeURIComponent(b));
      return u;
    }
    if (!/^(tt\\d+|tmdb:\\d+)$/.test(id)) return "";
    return NV_ORIG + "/affiche/" + (m.type === "series" ? "series" : "movie") + "/" + forme + "/" + encodeURIComponent(id) + (imdb && imdb !== id ? "?imdb=" + imdb : "");
  };

  // ---------- Données de l'addon (fiches, bandes-annonces), gardées en mémoire ----------
  const caches = { meta: new Map(), ba: new Map() };
  const fiche = (m) => {
    if (!m || !m.id) return Promise.resolve(null);
    const u = NV_ORIG + "/meta/" + (m.type === "series" ? "series" : "movie") + "/" + encodeURIComponent(m.id) + ".json";
    if (!caches.meta.has(u)) caches.meta.set(u, fetch(u).then((r) => r.ok ? r.json() : {}).then((d) => (d && d.meta) || null).catch(() => null));
    return caches.meta.get(u);
  };
  const baCle = (m) => {
    if (!m || !m.id) return Promise.resolve(null);
    const u = NV_ORIG + "/trailer/" + (m.type === "series" ? "series" : "movie") + "/" + encodeURIComponent(m.id) + ".json";
    if (!caches.ba.has(u)) caches.ba.set(u, fetch(u).then((r) => r.ok ? r.json() : {}).then((d) => (d && /^[A-Za-z0-9_-]{6,20}$/.test(d.key || "")) ? d.key : null).catch(() => null));
    return caches.ba.get(u);
  };
  const youtube = (key, muet) => {
    const f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + key + "?autoplay=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3" + (muet ? "&mute=1&controls=0&loop=1&disablekb=1&playlist=" + key : "");
    f.title = "Bande-annonce"; f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true; if (muet) f.tabIndex = -1;
    return f;
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
      fiche(m).then((f) => {
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
        const v = mkd("div", "nvo-video"); v.append(youtube(key, true)); bd.append(v);
        v.querySelector("iframe").addEventListener("load", () => setTimeout(() => v.classList.add("on"), 900));
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
  const tuile = (f, nomCollection) => {
    const t = mkd("button", "nvo-tuile"); t.type = "button"; t.tabIndex = -1; t.setAttribute("aria-label", f.title || "");
    t._f = f; t._coll = nomCollection;
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
  const LOGO_NUVIO = "https://raw.githubusercontent.com/NuvioMedia/NuvioTV/1.1.0-beta.7/app/src/main/res/drawable/app_logo_wordmark.png";
  // menu(ecran, vue courante, aller(vue)) : ouvre le panneau ; « Retour » ou un clic à côté le referme.
  const menu = (ecran, courante, aller, possibles) => {
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
    (nav.querySelector('[aria-current="page"]') || nav.querySelector("button")).focus({ preventScroll: true });
    const ferme = () => { p.remove(); ecran.removeEventListener("pointerdown", dehors, true); if (avant && avant.isConnected) avant.focus({ preventScroll: true }); };
    const dehors = (e) => { if (!p.contains(e.target)) ferme(); };
    setTimeout(() => ecran.addEventListener("pointerdown", dehors, true), 0);
    p.addEventListener("keydown", (e) => {
      const bs = [...nav.querySelectorAll("button:not(:disabled)")], i = bs.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length].focus(); }
      else if (e.key === "ArrowRight" || e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); e.stopPropagation(); ferme(); }
    });
    if (window.sfx) sfx.click();
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
    const lanceBA = (muet) => {
      baCle(m).then((key) => {
        if (!key || !f.isConnected) { if (!muet) { bBA.disabled = true; bBA.title = "Pas de bande-annonce"; } return; }
        finBA(); f.scrollTo({ top: 0 });
        const v = mkd("div", "fv"); v.append(youtube(key, muet)); f.insertBefore(v, fh);
        f.classList.add("ba"); fh.append(mkd("p", "astuce", "Appuyez sur « Retour » pour quitter la bande-annonce"));
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
        bas2.slice(0, 6).forEach((t) => { const k = t.ytId || t.source, b = mkd("button", "vid"), i = mkd("i"); b.type = "button"; i.style.backgroundImage = cssUrl("https://i.ytimg.com/vi/" + k + "/hqdefault.jpg"); b.append(i, t.name || "Bande-annonce"); b.addEventListener("click", () => { finBA(); f.scrollTo({ top: 0 }); const v = mkd("div", "fv"); v.append(youtube(k, false)); f.insertBefore(v, fh); f.classList.add("ba"); fh.append(mkd("p", "astuce", "Appuyez sur « Retour » pour quitter la bande-annonce")); }); l.append(b); });
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
    const auto = () => { clearTimeout(baT); if (tactile || calme()) return; baT = setTimeout(() => { if (f.isConnected && !f.classList.contains("ba") && fh.querySelector(".lire.focus")) lanceBA(true); }, 5000); };
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

  // ---------- L'écran complet : accueil, recherche, bibliothèque, fiche, barre latérale ----------
  // ecran(hote) crée .nvo dans hote. L'appelant remplit l'accueil avec rangee() puis appelle pret().
  const ecran = (hote) => {
    const el = mkd("div", "nvo"), h = hero(), rangees = mkd("div", "nvo-rangees"), bord = mkd("div", "nvo-bord");
    el.append(h.el, rangees, bord); hote.append(el);
    let vue = "accueil", vueEl = null;
    const ouvrir = (m) => ouvreFiche(el, m);
    const aller = (v) => {
      if (vueEl) { vueEl.remove(); vueEl = null; }
      vue = v; h.stopVideo();
      if (v === "recherche" || v === "biblio") { vueEl = mkd("div"); el.append(vueEl); (v === "recherche" ? recherche : bibliotheque)(vueEl, ouvrir); }
      else { const c = p.sel; if (c) c.focus({ preventScroll: true }); }
      if (window.sfx) sfx.click();
    };
    const ouvreMenu = () => menu(el, vue, aller, ["accueil", "recherche", "biblio"]);
    const p = pilote(el, h, { menu: ouvreMenu });
    bord.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !el.querySelector(".nvo-fiche")) ouvreMenu(); });
    el.addEventListener("click", (e) => {
      const c = e.target.closest(".nvo-rangees .nvo-carte, .nvo-rangees .nvo-tuile"); if (!c || vientDeGlisser()) return;
      if (c._m) ouvrir(c._m);
      else if (c._f && window.toast) toast("Dans Nuvio, la tuile « " + c._f.title + " » ouvre ses catalogues en plein écran.");
    });
    // Le bouton « Retour » de la télécommande
    const retour = () => {
      const m = el.querySelector(".nvo-menu"); if (m) { m.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return true; }
      const f = el.querySelector(".nvo-fiche"); if (f) { f._retour(); return true; }
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
      pret() { p.premier(); },
      paysage(on) { el.classList.toggle("paysage", !!on); el.querySelectorAll(".nvo-carte").forEach(peint); },
      pp() { el.classList.toggle("pp", reglages.pp); el.querySelectorAll(".nvo-carte").forEach(peint); },
    };
  };

  return { mkd, cssUrl, imgW, lit, ecrit, tactile, calme, reglages, cle, ppSrc, fiche, baCle, youtube, typeGenre, duree, dateSortie, lignesInfos, imdbEl,
    hero, carte, remplit, peint, tuile, gif, pilote, glisse, vientDeGlisser, menu, MENU, liste, dansListe, basculeListe, ouvreFiche, item, ecran };
})();
`;
