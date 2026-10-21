/**
 * Les vérifications du guide (salle 1), chacune dans son étape :
 *   - le mot de passe de la séance (étape 6, carte du Catalogue FR) : un code à taper dans la recherche de Nuvio,
 *     que le guide guette (GET /seance/<code>, voir seance.js) ; preuve que l'addon est installé et répond ;
 * Le HTML est inséré par guide.js ; le style et le script sont servis à part (statique.js), après guide-fin.js.
 */

/** Étape 6, sous le lien du Catalogue FR : le ticket avec le code. */
export const seanceHTML = () => `<div class="seance" id="seance">
          <div class="se-corps">
            <p class="se-sur">Le mot de passe de la séance</p>
            <p class="se-consigne">L'addon est ajouté ? Vérifie qu'il répond : dans Nuvio, va dans <b>Rechercher</b> et tape (avec ou sans accent) :</p>
            <p class="se-code" aria-label="Le texte à taper"><span>séance</span> <b id="seance-code">····</b></p>
            <p class="se-etat" id="seance-etat" role="status" aria-live="polite"></p>
            <button type="button" class="ca-changer" id="seance-relance" hidden>Guetter de nouveau</button>
          </div>
          <span class="se-tampon" aria-hidden="true">Salle connectée</span>
        </div>`;

export const VERIFS_CSS = `/* Le mot de passe de la séance : un ticket crème, le code en grosses lettres, tamponné quand Nuvio l'a reçu. */
.seance { position: relative; display: grid; padding: 16px 18px 16px 30px; border-radius: 12px; color: var(--ink); overflow: hidden;
  background: radial-gradient(circle at 0 50%, var(--velvet) 9px, transparent 10px) left center / 20px 100% no-repeat, linear-gradient(180deg, #f8efdd, #ecdcc0); }
.seance::before { content: ""; position: absolute; left: 16px; top: 10px; bottom: 10px; border-left: 2px dashed rgba(42,26,20,.3); }
.seance p { margin: 0; }
.se-corps { display: grid; gap: 8px; min-width: 0; }
.se-sur { font: 800 .72rem var(--body); letter-spacing: .2em; text-transform: uppercase; color: #8f2420; }
.se-consigne { color: #3a2418; }
.se-code { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; font: 400 clamp(2.2rem, 9vw, 3rem)/1 var(--display); letter-spacing: .06em; }
.se-code span { color: #6b4a3a; }
.se-code b { font-weight: 400; color: var(--ink); letter-spacing: .18em; font-variant-numeric: tabular-nums; }
.se-etat { font-weight: 700; font-size: .92rem; color: #5a3a2a; }
.se-etat:empty { display: none; }
.se-etat.guette::before { content: ""; display: inline-block; width: 9px; height: 9px; margin-right: 8px; border-radius: 50%; background: #c2352f; vertical-align: 1px; animation: se-guette 1.4s ease-in-out infinite; }
@keyframes se-guette { 50% { opacity: .25; } }
.seance .ca-changer { justify-self: start; color: #8f2420; border-color: rgba(143,36,32,.45); }
.seance .ca-changer:hover { background: rgba(143,36,32,.08); }
/* Le tampon, en bas à droite : à côté du bouton « Refaire le test », sans cacher le texte. */
.se-tampon { display: none; position: absolute; right: 16px; bottom: 18px; padding: 4px 10px; border: 3px double #1f7a4d; border-radius: 6px; color: #1f7a4d;
  font: 400 1.25rem/1 var(--display); letter-spacing: .08em; text-transform: uppercase; transform: rotate(-9deg); opacity: .92; pointer-events: none; }
.seance.ok .se-tampon { display: block; animation: se-tampon .35s cubic-bezier(.16,1,.3,1); }
@keyframes se-tampon { from { transform: rotate(-9deg) scale(1.6); opacity: 0; } }
.seance.ok .se-etat { color: #1f6b44; }
/* Téléphone : le tampon passe sous le bouton, à droite, au lieu de le recouvrir. */
@media (max-width: 520px) { .se-tampon { position: static; justify-self: end; margin: 8px 4px 2px 0; } }
@media (prefers-reduced-motion: reduce) { .se-etat.guette::before { animation: none; } .seance.ok .se-tampon { animation: none; } }
`;

export const VERIFS_JS = `// ---------- Le mot de passe de la séance (étape 6) ----------
(() => {
  const box = document.getElementById("seance");
  if (!box) return;
  const etat = document.getElementById("seance-etat"), relance = document.getElementById("seance-relance"), codeEl = document.getElementById("seance-code");
  const lit = (s, k) => { try { return s.getItem(k) || ""; } catch (e) { return ""; } };
  const garde = (s, k, v) => { try { v ? s.setItem(k, v) : s.removeItem(k); } catch (e) {} };
  const POLL_MS = 3000, MAX = 200;   // toutes les 3 s, 10 minutes au plus
  let code = lit(sessionStorage, "seance-code"), essais = 0, visible = false, minuteur = 0, enCours = false, fini = false;
  const nouveau = () => {
    const n = new Uint16Array(1); crypto.getRandomValues(n);
    code = String(1000 + (n[0] % 9000)); garde(sessionStorage, "seance-code", code);
  };
  if (!/^\\d{4}$/.test(code)) nouveau();
  codeEl.textContent = code;
  const dire = (texte, guette) => { etat.textContent = texte; etat.classList.toggle("guette", !!guette); };
  const arreter = () => { clearInterval(minuteur); minuteur = 0; };
  const reussi = (fete) => {
    fini = true; arreter(); box.classList.add("ok"); relance.hidden = false; relance.textContent = "Refaire le test";
    dire("Salle connectée ✓ Nuvio voit le Catalogue FR, et sa recherche marche. Tu peux passer aux addons de sources.");
    garde(localStorage, "seance-ok", "1");
    if (!fete) return;
    if (typeof window.bravo === "function") bravo();
    if (typeof window.popcorn === "function") popcorn(box.querySelector(".se-tampon"));
    if (typeof window.toast === "function") toast("Salle connectée : le Catalogue FR répond dans Nuvio !");
  };
  const tour = async () => {
    if (fini || enCours || !visible || document.hidden) return;
    if (essais >= MAX) {
      arreter(); relance.hidden = false; relance.textContent = "Guetter de nouveau";
      dire("Le guide a arrêté de guetter. Rien reçu ? Vérifie que le Catalogue FR est bien dans tes addons, retape « séance " + code + " » dans Rechercher, puis appuie sur « Guetter de nouveau ».");
      return;
    }
    essais++; enCours = true;
    try {
      const r = await fetch(ORIG + "/seance/" + code, { cache: "no-store" });
      const j = r.ok ? await r.json() : {};
      if (j.ok) reussi(true);
    } catch (e) {} finally { enCours = false; }
  };
  const guetter = () => {
    fini = false; essais = 0; box.classList.remove("ok"); relance.hidden = true;
    dire("Le guide guette ta recherche : ce ticket se tamponne tout seul dès que Nuvio l'a reçue.", true);
    if (!minuteur) minuteur = setInterval(tour, POLL_MS);
    tour();
  };
  relance.addEventListener("click", () => {
    if (box.classList.contains("ok")) { nouveau(); codeEl.textContent = code; garde(localStorage, "seance-ok", ""); }
    guetter();
    // Le bouton disparaît : le focus va au ticket, qui annonce le nouveau code.
    box.tabIndex = -1; box.focus({ preventScroll: true });
  });
  // Seulement quand l'étape 6 est à l'écran et l'onglet au premier plan.
  const etape = box.closest("section") || box;
  new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) tour(); }).observe(etape);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tour(); });
  if (lit(localStorage, "seance-ok")) reussi(false); else guetter();
})();
`;
