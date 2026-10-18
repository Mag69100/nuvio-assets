/**
 * L'aperçu de l'accueil final (« Voir l'accueil que tu auras à la fin ») : un écran de TV avec l'accueil
 * Nuvio obtenu en suivant le guide (réglages conseillés, vrais films du moment, affiches PostersPlus),
 * dessiné par l'écran Nuvio commun (nuvio.js). Partagé par le hall et le guide.
 * Les boutons [data-resultat] l'ouvrent ; une arrivée avec « #apercu » l'ouvre directement.
 */
import { NUVIO_CSS, nuvioJS } from "./nuvio.js";

export const APERCU_CSS = `/* L'aperçu du résultat : l'accueil Nuvio qu'on obtient à la fin du guide, sur un écran de TV. */
.voir-resultat { display: inline-flex; align-items: center; gap: 8px; font: 800 .92rem var(--body); padding: 9px 16px; border-radius: 99px; cursor: pointer;
  border: 1px solid rgba(255,207,107,.55); background: rgba(255,207,107,.08); color: var(--bulb); }
.voir-resultat:hover { background: rgba(255,207,107,.16); }
.voir-resultat svg { width: 18px; height: 18px; }
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
}
${NUVIO_CSS}`;

/** Le script de l'aperçu ; posterUrl est le réglage PostersPlus conseillé, avec « TA_CLE_TMDB » à la place de la clé. */
export const apercuJS = (origin, posterUrl) => nuvioJS(origin, posterUrl) + "\nconst ORIG_AP = " + JSON.stringify(origin) + ";\n" + `// ---------- L'accueil qu'on aura à la fin du guide ----------
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
    legende.innerHTML = "Ton accueil Nuvio une fois le guide terminé : réglages conseillés, affiches PostersPlus et vrais films du moment. " + (NV.tactile ? "Touche une affiche pour ouvrir sa fiche ; « Retour » ouvre le menu." : "Passe la souris sur une affiche (ou utilise les flèches du clavier) comme avec la télécommande ; « Retour » ouvre le menu.") + " Tu pourras choisir tes rangées, tes plateformes et tes filtres en <a href='" + ORIG_AP + "/configure'>salle 2</a>" + (location.pathname.indexOf("/guide") === 0 ? "." : ", ou suivre le guide en <a href='" + ORIG_AP + "/guide'>salle 1</a>.");
    // La télécommande et les réglages d'affichage (les mêmes qu'en salle 2)
    const outils = mkd("div", "r-outils"), seg = mkd("div", "seg");
    const bRet = mkd("button", "retour", "◀ Retour"), bV = mkd("button", null, "Affiches verticales"), bP = mkd("button", null, "Paysage"), bPP = mkd("button", "pp", "Affiches PostersPlus");
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
      (c.folders || []).forEach((f) => piste.append(NV.tuile(f, c.title)));
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
  // Arrivée depuis le hall avec « #apercu » : on ouvre directement l'aperçu.
  if (location.hash === "#apercu") { history.replaceState(null, "", location.pathname); setTimeout(ouvrir, 400); }
})();
`;
