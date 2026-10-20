/**
 * L'aperçu de l'accueil final (« Voir l'accueil que tu auras à la fin ») : un écran de TV avec l'accueil
 * Nuvio obtenu en suivant le guide (réglages conseillés, vrais films du moment, affiches maison),
 * dessiné par l'écran Nuvio commun (nuvio.js). Partagé par le hall et le guide.
 * Les boutons [data-resultat] l'ouvrent ; une arrivée avec « #apercu » l'ouvre directement.
 */
import { nuvioDonnees } from "./nuvio.js";

// L'icône des boutons d'aperçu : une petite TV dont l'écran (.ap-ecran) s'allume, avec le bouton lecture.
export const ICONE_APERCU = `<svg viewBox="0 0 20 20" aria-hidden="true"><rect class="ap-ecran" x="3.4" y="4.9" width="13.2" height="7.7" rx=".6"/><rect x="2" y="3.5" width="16" height="10.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 17h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path class="ap-play" d="M8.5 6.6v4.4l3.8-2.2z" fill="currentColor"/></svg>`;

export const APERCU_CSS = `/* L'aperçu du résultat : l'accueil Nuvio qu'on obtient à la fin du guide, sur un écran de TV. */
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
  const ouvrir = async () => {
    if (ouvert) return;
    const ov = mkd("div", "resultat"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "L'accueil Nuvio à la fin du guide");
    const fermer = mkd("button", "fermer", "×"); fermer.type = "button"; fermer.setAttribute("aria-label", "Fermer l'aperçu");
    const tv = mkd("div", "tv"), ecran = mkd("div", "ecran"); tv.append(ecran);
    const E = NV.ecran(ecran);
    E.paysage(NV.reglages.format === "l"); E.pp();
    const legende = mkd("p", "legende");
    legende.innerHTML = "Ton accueil Nuvio une fois le guide terminé : réglages conseillés, affiches maison et vrais films du moment. " + (NV.tactile ? "Touche une affiche pour ouvrir sa fiche ; « Retour » ouvre le menu." : "Passe la souris sur une affiche (ou utilise les flèches du clavier) comme avec la télécommande ; « Retour » ouvre le menu.") + " Tu pourras choisir tes rangées, tes plateformes et tes filtres en <a href='" + ORIG_AP + "/configure'>salle 2</a>" + (location.pathname.indexOf("/guide") === 0 ? "." : ", ou suivre le guide en <a href='" + ORIG_AP + "/guide'>salle 1</a>.");
    // La télécommande et les réglages d'affichage (les mêmes qu'en salle 2)
    const outils = mkd("div", "r-outils"), seg = mkd("div", "seg");
    const bRet = mkd("button", "retour", "◀ Retour"), bV = mkd("button", null, "Affiches verticales"), bP = mkd("button", null, "Paysage"), bPP = mkd("button", "pp", "Affiches maison");
    [bRet, bV, bP, bPP].forEach((b) => { b.type = "button"; });
    bRet.title = "Le bouton Retour de la télécommande (touche Retour arrière du clavier)";
    const boutons = () => { bV.setAttribute("aria-pressed", String(NV.reglages.format === "p")); bP.setAttribute("aria-pressed", String(NV.reglages.format === "l")); bPP.setAttribute("aria-pressed", String(NV.reglages.pp)); };
    bRet.addEventListener("click", () => E.retour());
    bV.addEventListener("click", () => { NV.reglages.format = "p"; boutons(); E.paysage(false); });
    bP.addEventListener("click", () => { NV.reglages.format = "l"; boutons(); E.paysage(true); });
    bPP.addEventListener("click", () => { NV.reglages.pp = !NV.reglages.pp; boutons(); E.pp(); if (window.sfx) sfx.click(); });
    seg.append(bV, bP); outils.append(bRet, seg, bPP); boutons();
    ov.append(fermer, tv, outils, legende); document.body.append(ov); fermer.focus(); ouvert = ov;
    const close = () => { E.hero.stopVideo(); ov.remove(); ouvert = null; };
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
  // Arrivée depuis le hall avec « #apercu » : on ouvre directement l'aperçu.
  if (location.hash === "#apercu") { history.replaceState(null, "", location.pathname); setTimeout(ouvrir, 400); }
})();
`;
