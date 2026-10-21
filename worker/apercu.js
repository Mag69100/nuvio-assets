/**
 * L'aperçu de l'accueil final (« Voir l'accueil que tu auras à la fin ») : un écran de TV avec l'accueil
 * Nuvio obtenu en suivant le guide (réglages conseillés, vrais films du moment, affiches maison),
 * dessiné par l'écran Nuvio commun (nuvio.js). Partagé par le hall et le guide.
 * Les boutons [data-resultat] l'ouvrent ; une arrivée avec « #apercu » l'ouvre directement. Le mode « Avant / après » met
 * côte à côte Nuvio tel qu'il s'installe (Cinemeta seul, réglages d'origine) et cet accueil : bouton [data-avant-apres]
 * ou arrivée avec « #avant-apres ».
 */
import { nuvioDonnees } from "./nuvio.js";

// L'icône des boutons d'aperçu : une petite TV dont l'écran (.ap-ecran) s'allume, avec le bouton lecture.
export const ICONE_APERCU = `<svg viewBox="0 0 20 20" aria-hidden="true"><rect class="ap-ecran" x="3.4" y="4.9" width="13.2" height="7.7" rx=".6"/><rect x="2" y="3.5" width="16" height="10.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 17h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path class="ap-play" d="M8.5 6.6v4.4l3.8-2.2z" fill="currentColor"/></svg>`;

// L'icône du bouton « Avant / après » : la même TV, l'écran à moitié allumé, coupé par le trait.
export const ICONE_AVANT_APRES = `<svg viewBox="0 0 20 20" aria-hidden="true"><rect class="ap-ecran" x="3.4" y="4.9" width="6.6" height="7.7" rx=".6"/><rect x="2" y="3.5" width="16" height="10.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 2.2v13.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7 17h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

export const APERCU_CSS =`/* L'aperçu du résultat : l'accueil Nuvio qu'on obtient à la fin du guide, sur un écran de TV. */
.voir-resultat { display: inline-flex; align-items: center; gap: 8px; font: 800 .92rem var(--body); padding: 9px 16px; border-radius: 99px; cursor: pointer;
  border: 1px solid rgba(255,207,107,.55); background: rgba(255,207,107,.08); color: var(--bulb); }
.voir-resultat:hover { background: rgba(255,207,107,.16); }
.voir-resultat svg { width: 18px; height: 18px; }
/* Les boutons d’aperçu sont une TV allumée dans une salle sombre. Au repos, l’écran de l’icône vacille et sa
   lumière éclaire le bouton depuis la gauche ; un reflet de projecteur le traverse de temps en temps.
   Au survol (ou au clavier), tout le bouton devient l’écran qui s’allume, comme un vieux tube : un trait de
   lumière, qui s’ouvre en grand ; il s’éteint en se refermant. Rien ne tourne hors de l’écran (.ap-vu). */
[data-resultat] { --ap-x: 26px; position: relative; isolation: isolate; overflow: hidden; -webkit-tap-highlight-color: transparent;
  transition: transform .12s cubic-bezier(.16,1,.3,1), border-color .25s ease, color .2s ease, box-shadow .35s cubic-bezier(.16,1,.3,1);
  box-shadow: 0 6px 18px -8px rgba(255,207,107,.25), inset 30px 0 26px -20px rgba(255,207,107,.22); }
.apercu-lien[data-resultat] { --ap-x: 30px; }
[data-resultat] svg { overflow: visible; flex: none; }
[data-resultat] .ap-ecran { fill: currentColor; opacity: .22; transition: opacity .2s ease, fill .2s ease; }
[data-resultat] .ap-play { transform-box: fill-box; transform-origin: center; transition: fill .2s ease, transform .35s cubic-bezier(.16,1,.3,1); }
/* L’écran allumé : un aplat doré, plus clair au centre, d’abord fermé sur un trait. */
[data-resultat]::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0;
  background: radial-gradient(ellipse 70% 120% at var(--ap-x) 50%, #fff4d8, var(--bulb) 46%, #f2b54e);
  clip-path: inset(50% 0 50% 0); transition: opacity .22s ease; }
/* Le reflet du projecteur */
[data-resultat]::after { content: ""; position: absolute; inset: -2px; z-index: -1; pointer-events: none; opacity: 0;
  background: linear-gradient(105deg, transparent 32%, rgba(255,236,190,.3) 46%, rgba(255,250,235,.62) 50%, rgba(255,236,190,.3) 54%, transparent 68%);
  transform: translateX(-110%); }
[data-resultat].ap-vu { animation: ap-lueur 5.2s linear infinite; }
[data-resultat].ap-vu .ap-ecran { animation: ap-vacille 5.2s steps(1, end) infinite; }
[data-resultat].ap-vu::after { animation: ap-reflet 6.5s cubic-bezier(.45,0,.2,1) .8s infinite; }
@keyframes ap-lueur {
  0%, 100% { box-shadow: 0 6px 18px -8px rgba(255,207,107,.25), inset 30px 0 26px -20px rgba(255,207,107,.22); }
  18% { box-shadow: 0 7px 24px -6px rgba(255,207,107,.42), inset 40px 0 30px -18px rgba(255,207,107,.4); }
  21% { box-shadow: 0 6px 16px -8px rgba(255,207,107,.18), inset 24px 0 22px -20px rgba(255,207,107,.14); }
  24% { box-shadow: 0 7px 26px -5px rgba(255,207,107,.46), inset 44px 0 30px -18px rgba(255,207,107,.44); }
  58% { box-shadow: 0 6px 20px -7px rgba(255,170,110,.32), inset 34px 0 28px -20px rgba(255,170,110,.3); }
  76% { box-shadow: 0 8px 28px -5px rgba(255,207,107,.5), inset 48px 0 32px -18px rgba(255,207,107,.46); }
}
@keyframes ap-vacille { 0% { opacity: .3; } 18% { opacity: .6; } 21% { opacity: .18; } 24% { opacity: .7; } 40% { opacity: .42; } 58% { opacity: .34; } 76% { opacity: .75; } 88% { opacity: .4; } }
@keyframes ap-reflet { 0% { opacity: 1; transform: translateX(-110%); } 20% { opacity: 1; transform: translateX(110%); } 21%, 100% { opacity: 0; transform: translateX(110%); } }
@keyframes ap-tube { 0% { clip-path: inset(50% 46% 50% 46%); filter: brightness(1.6); } 30% { clip-path: inset(47% 0 47% 0); filter: brightness(1.5); } 100% { clip-path: inset(0); filter: none; } }
/* Survol à la souris, ou focus au clavier : l’écran s’allume. (Au doigt, pas de survol « collé » après l’appui.) */
[data-resultat]:focus-visible { border-color: var(--bulb); color: var(--ink); outline: 2px solid var(--bulb); outline-offset: 3px; transition-delay: 0s, 0s, .14s, 0s;
  box-shadow: 0 10px 34px -8px rgba(255,207,107,.65); animation: none; }
[data-resultat]:focus-visible::before { opacity: 1; animation: ap-tube .5s cubic-bezier(.16,1,.3,1) both; }
[data-resultat]:focus-visible::after { animation: none; opacity: 0; }
[data-resultat]:focus-visible .ap-ecran { fill: var(--ink); opacity: 1; animation: none; }
[data-resultat]:focus-visible .ap-play { fill: var(--bulb); transform: scale(1.2); }
@media (hover: hover) {
  [data-resultat]:hover { border-color: var(--bulb); color: var(--ink); box-shadow: 0 10px 34px -8px rgba(255,207,107,.65); animation: none;
    transition: transform .12s cubic-bezier(.16,1,.3,1), border-color .25s ease, color .16s ease .14s, box-shadow .35s cubic-bezier(.16,1,.3,1); }
  [data-resultat]:hover::before { opacity: 1; animation: ap-tube .5s cubic-bezier(.16,1,.3,1) both; }
  [data-resultat]:hover::after { animation: none; opacity: 0; }
  [data-resultat]:hover .ap-ecran { fill: var(--ink); opacity: 1; animation: none; transition-delay: .14s; }
  [data-resultat]:hover .ap-play { fill: var(--bulb); transform: scale(1.2); }
}
/* Au clic, le bouton s’enfonce. */
[data-resultat]:active { transform: scale(.96); transition-duration: .06s; }
@media (prefers-reduced-motion: reduce) {
  [data-resultat].ap-vu, [data-resultat].ap-vu .ap-ecran, [data-resultat].ap-vu::after { animation: none; }
  [data-resultat] .ap-ecran { opacity: .45; }
  [data-resultat]::before { clip-path: none; transition: opacity .2s ease; }
  [data-resultat]:hover::before, [data-resultat]:focus-visible::before { animation: none; }
  [data-resultat]:active { transform: none; }
}
.resultat { position: fixed; inset: 0; z-index: 86; display: grid; place-items: center; align-content: center; gap: 14px; padding: 16px; background: rgba(5,3,4,.97); animation: rise .3s ease both; }
.resultat .tv { width: min(1180px, calc(100vw - 32px), calc((100vh - 170px) * 16 / 9)); padding: 10px; border-radius: 16px; background: #050304; box-shadow: 0 0 0 2px #2b1820, 0 30px 80px rgba(0,0,0,.7); }
.resultat .ecran { position: relative; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; background: #0D0D0D; container-type: inline-size; }
/* Sous l'écran : la télécommande (Retour) et les mêmes réglages d'affichage qu'en salle 2 */
.r-outils { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.r-outils .seg { display: inline-flex; border: 1px solid var(--seat); border-radius: 10px; overflow: hidden; }
.r-outils button { font: 700 .85rem var(--body); padding: 8px 14px; border: 0; background: var(--velvet); color: var(--dim); cursor: pointer; }
.r-outils .seg button + button { border-left: 1px solid var(--seat); }
.r-outils button[aria-pressed="true"] { background: var(--cream); color: var(--ink); }
.r-outils .pp, .r-outils .retour { border: 1px solid var(--seat); border-radius: 10px; }
.r-outils .retour { color: var(--cream); }
.resultat .legende { margin: 0; max-width: 66ch; text-align: center; color: var(--dim); font-size: .95rem; }
.resultat .legende a { color: var(--bulb); }
.resultat .fermer { position: absolute; top: 16px; right: 16px; width: 40px; height: 40px; border-radius: 50%; border: 0; background: rgba(255,255,255,.1); color: #fff; font: 800 1.3rem/1 var(--body); cursor: pointer; }
.apercu-lien[data-resultat] { font-family: var(--body); cursor: pointer; }
/* Avant / après : Nuvio de base à gauche du trait (découpé à --aa-x), l'accueil du guide à droite. */
.r-outils .aa-bouton { display: inline-flex; align-items: center; gap: 7px; border: 1px solid rgba(255,207,107,.6); border-radius: 10px; background: rgba(255,207,107,.1); color: var(--bulb); }
.r-outils .aa-bouton svg { width: 18px; height: 18px; flex: none; }
.r-outils .aa-bouton[aria-pressed="true"] { background: var(--bulb); border-color: var(--bulb); color: var(--ink); }
.resultat .ecran { --aa-x: 50%; }
.aa-avant { position: absolute; inset: 0; z-index: 9; clip-path: inset(0 calc(100% - var(--aa-x)) 0 0); }
.aa-trait { position: absolute; z-index: 10; top: 0; bottom: 0; left: var(--aa-x); width: 0; touch-action: none; cursor: ew-resize; }
.aa-trait::before { content: ""; position: absolute; top: 0; bottom: 0; left: -1.5px; width: 3px; background: var(--bulb); box-shadow: 0 0 0 1px rgba(0,0,0,.35), 0 0 14px rgba(255,207,107,.6); }
/* Une bande invisible de 28 px autour du trait : facile à attraper, au doigt comme à la souris. */
.aa-trait::after { content: ""; position: absolute; top: 0; bottom: 0; left: -14px; width: 28px; }
.aa-poignee { position: absolute; z-index: 1; top: 50%; left: 0; width: 44px; height: 44px; border-radius: 50%; transform: translate(-50%, -50%); display: grid; place-items: center;
  background: var(--bulb); color: var(--ink); box-shadow: 0 0 0 3px rgba(0,0,0,.45), 0 6px 18px rgba(0,0,0,.5); transition: transform .15s ease; }
.aa-poignee svg { width: 24px; height: 24px; }
.aa-poignee:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.aa-trait:hover .aa-poignee, .aa-tire .aa-poignee { transform: translate(-50%, -50%) scale(1.08); }
.aa-etiq { position: absolute; z-index: 11; top: 10px; padding: 4px 10px; border-radius: 99px; pointer-events: none; font: 800 .78rem/1.3 var(--body); letter-spacing: .02em; white-space: nowrap;
  background: rgba(10,6,8,.78); color: var(--cream); box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); transition: opacity .2s ease; }
.aa-etiq.g { left: 10px; }
.aa-etiq.d { right: 10px; color: var(--bulb); box-shadow: inset 0 0 0 1px rgba(255,207,107,.45); }
.aa-etiq.loin { opacity: 0; }
.aa-tire, .aa-tire * { user-select: none; }
/* À l'arrivée : le trait part de la droite et balaie l'écran jusqu'au milieu. */
.ecran.aa-balaye .aa-avant { animation: aa-coupe .9s cubic-bezier(.65,0,.25,1) both; }
.ecran.aa-balaye .aa-trait { animation: aa-glisse .9s cubic-bezier(.65,0,.25,1) both; }
@keyframes aa-coupe { from { clip-path: inset(0 0 0 0); } }
@keyframes aa-glisse { from { left: 100%; } }
@media (max-width: 560px) { .aa-etiq { top: 6px; padding: 2px 7px; font-size: .68rem; } .aa-etiq.g { left: 6px; } .aa-etiq.d { right: 6px; } }
@media (prefers-reduced-motion: reduce) { .ecran.aa-balaye .aa-avant, .ecran.aa-balaye .aa-trait { animation: none; } .aa-poignee { transition: none; } }
/* Doigt plutôt que souris : cibles plus grandes, champs en 16 px (sinon iOS zoome dans la page). */
@media (hover: none), (pointer: coarse) {
  .r-outils button { min-height: 44px; }
  .resultat .nvo-rech input { font-size: 16px; }
  .resultat .fermer { width: 44px; height: 44px; }
}`;

/** Les données de l'aperçu propres au site qui sert la page (son adresse). */
export const apercuDonnees = (origin) => nuvioDonnees(origin) + "\nconst ORIG_AP = " + JSON.stringify(origin) + ";";

/** Le script de l'aperçu (après nuvio.js et apercuDonnees). Servi à part par statique.js. */
export const APERCU_JS = `// ---------- L'accueil qu'on aura à la fin du guide ----------
(() => {
  let ouvert = null;
  const mkd = NV.mkd;
  // ---------- Avant / après : Nuvio tel qu'installé (à gauche) contre l'accueil du guide (à droite) ----------
  // Nuvio TV tout juste installé n'a que Cinemeta pour les catalogues : ses rangées « Popular » et « Featured »,
  // titrées comme Nuvio les titre (nom du catalogue, puis le type), affiches de Cinemeta, réglages d'origine.
  // Rangées relayées par le site (/cinemeta/…, gardées un jour) : le navigateur ne contacte pas Cinemeta.
  const RANGEES_BASE = [["movie", "top", "Popular - Film"], ["series", "top", "Popular - Série"], ["movie", "imdbRating", "Featured - Film"], ["series", "imdbRating", "Featured - Série"]];
  const avantApres = (ecran, bouton, legende, textes) => {
    let pret = false, x = 50, actif = false;
    const couche = mkd("div", "aa-avant"), trait = mkd("div", "aa-trait"), poignee = mkd("div", "aa-poignee");
    const etG = mkd("span", "aa-etiq g", "Nuvio de base"), etD = mkd("span", "aa-etiq d", "Avec le guide");
    couche.setAttribute("aria-hidden", "true");
    poignee.tabIndex = 0; poignee.setAttribute("role", "slider"); poignee.setAttribute("aria-label", "Avant / après : partage de l'écran entre Nuvio de base et l'accueil du guide");
    poignee.setAttribute("aria-valuemin", "0"); poignee.setAttribute("aria-valuemax", "100");
    poignee.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6.5 4 12l5.5 5.5M14.5 6.5 20 12l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    trait.append(poignee);
    [couche, trait, etG, etD].forEach((e) => { e.hidden = true; ecran.append(e); });
    const place = (v) => {
      x = Math.max(0, Math.min(100, Math.round(v * 10) / 10));
      ecran.style.setProperty("--aa-x", x + "%");
      poignee.setAttribute("aria-valuenow", String(Math.round(x)));
      poignee.setAttribute("aria-valuetext", Math.round(x) + " % de l'écran pour Nuvio de base, " + (100 - Math.round(x)) + " % pour l'accueil du guide");
      etG.classList.toggle("loin", x < 16); etD.classList.toggle("loin", x > 84);
    };
    // Glisser la poignée (ou le trait) : souris, doigt ou stylet.
    const versX = (e) => { const r = ecran.getBoundingClientRect(); return r.width ? (e.clientX - r.left) / r.width * 100 : x; };
    let tire = null;
    trait.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      e.preventDefault(); tire = e.pointerId; ecran.classList.add("aa-tire");
      try { trait.setPointerCapture(e.pointerId); } catch (err) {}
      poignee.focus({ preventScroll: true }); place(versX(e));
    });
    trait.addEventListener("pointermove", (e) => { if (e.pointerId === tire) place(versX(e)); });
    const lache = (e) => { if (e.pointerId !== tire) return; tire = null; ecran.classList.remove("aa-tire"); };
    trait.addEventListener("pointerup", lache); trait.addEventListener("pointercancel", lache);
    // Au clavier : flèches (5 %, 10 % avec Maj), Page haut / bas (20 %), Début / Fin.
    poignee.addEventListener("keydown", (e) => {
      const pas = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 }[e.key];
      if (pas != null) place(x + pas * (e.shiftKey ? 2 : 1));
      else if (e.key === "Home") place(0);
      else if (e.key === "End") place(100);
      else return;
      e.preventDefault(); e.stopPropagation();
    });
    // Le Nuvio de base, chargé au premier passage en avant / après.
    const charge = () => {
      if (pret) return; pret = true;
      const B = NV.ecran(couche, { defaut: true });
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); e.target._charge(); } }), { root: B.rangees, rootMargin: "300px 0px" });
      RANGEES_BASE.forEach(([type, id, titre]) => {
        const { section, piste } = B.rangee(titre);
        for (let k = 0; k < 8; k++) piste.append(NV.carte(null));
        section._charge = () => fetch(ORIG_AP + "/cinemeta/" + type + "/" + id + ".json").then((r) => r.json()).then((d) => {
          const metas = ((d && d.metas) || []).filter((m) => m.poster);
          piste.textContent = "";
          if (!metas.length) { section.remove(); return; }
          metas.forEach((m) => piste.append(NV.carte(m, true)));
          // Tant que la 1re rangée n'est pas là, rien n'est choisi : on réessaie à chaque rangée reçue.
          if (!B.pilote.sel) B.pret();
        }).catch(() => section.remove());
        io.observe(section);
      });
    };
    const bascule = (on, glisse) => {
      actif = !!on;
      bouton.setAttribute("aria-pressed", String(actif));
      ecran.classList.toggle("comparer", actif);
      [couche, trait, etG, etD].forEach((e) => { e.hidden = !actif; });
      legende.innerHTML = actif ? textes.avant : textes.normal;
      if (!actif) return;
      charge();
      // À l'arrivée, le trait balaie l'écran depuis la droite jusqu'au milieu (rien ne bouge si on refuse les animations).
      if (glisse && !NV.calme()) {
        place(50); ecran.classList.remove("aa-balaye"); void ecran.offsetWidth; ecran.classList.add("aa-balaye");
        setTimeout(() => ecran.classList.remove("aa-balaye"), 1000);
      } else place(x);
      if (window.sfx) sfx.whoosh();
    };
    place(x);
    return { bascule, get actif() { return actif; } };
  };
  const ouvrir = async (ev) => {
    if (ouvert) return;
    // Le bouton « Avant / après » du hall ouvre l'aperçu directement en comparaison.
    const comparer = ev === true || !!(ev && ev.currentTarget && ev.currentTarget.hasAttribute && ev.currentTarget.hasAttribute("data-avant-apres"));
    const ov = mkd("div", "resultat"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "L'accueil Nuvio à la fin du guide");
    const fermer = mkd("button", "fermer", "×"); fermer.type = "button"; fermer.setAttribute("aria-label", "Fermer l'aperçu");
    const tv = mkd("div", "tv"), ecran = mkd("div", "ecran"); tv.append(ecran);
    const E = NV.ecran(ecran);
    E.paysage(NV.reglages.format === "l"); E.pp();
    const legende = mkd("p", "legende");
    legende.id = "r-legende";
    const normal = "Ton accueil Nuvio une fois le guide terminé : réglages conseillés, affiches maison et vrais films du moment. " + (NV.tactile ? "Touche une affiche pour ouvrir sa fiche ; « Retour » ouvre le menu." : "Passe la souris sur une affiche (ou utilise les flèches du clavier) comme avec la télécommande ; « Retour » ouvre le menu.") + " Tu pourras choisir tes rangées, tes plateformes et tes filtres en <a href='" + ORIG_AP + "/configure'>salle 2</a>" + (location.pathname.indexOf("/guide") === 0 ? "." : ", ou suivre le guide en <a href='" + ORIG_AP + "/guide'>salle 1</a>.");
    const texteAvant = "<b>À gauche, Nuvio tel qu'il s'installe</b> : son seul catalogue, Cinemeta, en anglais (« Popular », « Featured »), avec ses affiches et ses réglages d'origine. <b>À droite, le même Nuvio avec le guide</b> : rangées en français, affiches maison, bandes-annonces. " + (NV.tactile ? "Fais glisser le trait pour comparer." : "Fais glisser le trait (ou sa poignée avec les flèches du clavier) pour comparer.");
    legende.innerHTML = normal;
    // La télécommande et les réglages d'affichage (les mêmes qu'en salle 2)
    const outils = mkd("div", "r-outils"), seg = mkd("div", "seg");
    const bRet = mkd("button", "retour", "◀ Retour"), bV = mkd("button", null, "Affiches verticales"), bP = mkd("button", null, "Paysage"), bPP = mkd("button", "pp", "Affiches maison");
    const bAA = mkd("button", "aa-bouton");
    bAA.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="4" width="16" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.6 5.6h6.4v8.8H3.6z" fill="currentColor" opacity=".4"/><path d="M10 2.2v15.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>Avant / après';
    bAA.setAttribute("aria-describedby", "r-legende");
    [bRet, bV, bP, bPP, bAA].forEach((b) => { b.type = "button"; });
    bRet.title = "Le bouton Retour de la télécommande (touche Retour arrière du clavier)";
    const boutons = () => { bV.setAttribute("aria-pressed", String(NV.reglages.format === "p")); bP.setAttribute("aria-pressed", String(NV.reglages.format === "l")); bPP.setAttribute("aria-pressed", String(NV.reglages.pp)); };
    bRet.addEventListener("click", () => E.retour());
    bV.addEventListener("click", () => { NV.reglages.format = "p"; boutons(); E.paysage(false); });
    bP.addEventListener("click", () => { NV.reglages.format = "l"; boutons(); E.paysage(true); });
    bPP.addEventListener("click", () => { NV.reglages.pp = !NV.reglages.pp; boutons(); E.pp(); if (window.sfx) sfx.click(); });
    seg.append(bV, bP); outils.append(bAA, bRet, seg, bPP); boutons();
    const AA = avantApres(ecran, bAA, legende, { normal, avant: texteAvant });
    bAA.setAttribute("aria-pressed", "false");
    bAA.addEventListener("click", () => AA.bascule(!AA.actif, true));
    // Fenêtre modale : le reste de la page devient inerte (le focus reste dans l'aperçu) ; à la fermeture,
    // le focus revient au bouton qui l'a ouverte.
    const avant = document.activeElement, fond = [...document.body.children].filter((x) => !x.inert);
    ov.setAttribute("aria-modal", "true");
    ov.append(fermer, tv, outils, legende); document.body.append(ov); fond.forEach((x) => { x.inert = true; }); fermer.focus(); ouvert = ov;
    if (comparer) AA.bascule(true, true);
    // Échap ferme aussi quand le focus s'est perdu hors de l'aperçu (clic sur une zone sans bouton).
    const echap = (e) => { if (e.key === "Escape" && !ov.contains(e.target)) { e.preventDefault(); close(); } };
    addEventListener("keydown", echap);
    const close = () => {
      E.hero.stopVideo(); ov.remove(); ouvert = null; removeEventListener("keydown", echap);
      fond.forEach((x) => { x.inert = false; });
      if (avant && avant.isConnected && avant !== document.body) avant.focus({ preventScroll: true });
    };
    fermer.addEventListener("click", close);
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    ov.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); if (E.ouvert()) E.retour(); else close(); }
      else if (e.key === "Backspace" && !e.target.matches("input") && ecran.contains(e.target) === false && E.ouvert()) { e.preventDefault(); E.retour(); }
    });
    if (window.sfx) sfx.whoosh();
    // L'accueil : Plateformes (épinglée en haut), les rangées du Catalogue FR, puis Genres, J'ai envie de…, Sagas, Studios.
    const rangeeTuiles = (c) => {
      const { piste } = E.rangee(c.title);
      (c.folders || []).forEach((f) => piste.append(NV.tuile(f, c.title, c.id)));
    };
    try {
      const [manifest, colls] = await Promise.all([fetch(ORIG_AP + "/manifest.json").then((r) => r.json()), fetch(ORIG_AP + "/collections.json").then((r) => r.json()).catch(() => [])]);
      const collections = Array.isArray(colls) ? colls : (colls.collections || []);
      collections.filter((c) => c.pinToTop).forEach(rangeeTuiles);
      const accueil = (manifest.catalogs || []).filter((c) => c.showInHome !== false && String(c.id).startsWith("accueil-"));
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); e.target._charge(); } }), { root: E.rangees, rootMargin: "300px 0px" });
      accueil.forEach((c) => {
        const { section, piste } = E.rangee(c.name);
        for (let k = 0; k < 8; k++) piste.append(NV.carte(null));
        section._charge = () => fetch(ORIG_AP + "/catalog/" + c.type + "/" + c.id + ".json").then((x) => x.json()).then((d) => {
          const metas = (d.metas || []).filter((m) => m.poster);
          piste.textContent = "";
          if (!metas.length) { section.remove(); return; }
          metas.slice(0, 20).forEach((m) => piste.append(NV.carte(m)));
        }).catch(() => section.remove());
        io.observe(section);
      });
      collections.filter((c) => !c.pinToTop).forEach(rangeeTuiles);
      E.pret();
    } catch (e) {
      const { piste } = E.rangee("Aperçu indisponible"); piste.append(mkd("p", "vide", "Vérifie ta connexion et réessaie."));
    }
  };
  document.querySelectorAll("[data-resultat]").forEach((b) => b.addEventListener("click", ouvrir));
  // La TV des boutons ne vacille que lorsqu'ils sont à l'écran.
  if ("IntersectionObserver" in window) {
    const vu = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("ap-vu", e.isIntersecting)));
    document.querySelectorAll("[data-resultat]").forEach((b) => vu.observe(b));
  }
  // Arrivée avec « #apercu » : on ouvre directement l'aperçu ; avec « #avant-apres », directement en comparaison.
  if (location.hash === "#apercu" || location.hash === "#avant-apres") { const aa = location.hash === "#avant-apres"; history.replaceState(null, "", location.pathname); setTimeout(() => ouvrir(aa), 400); }
})();
`;
