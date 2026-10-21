/**
 * Les vérifications du guide (salle 1), chacune dans son étape :
 *   - le mot de passe de la séance (étape 6, carte du Catalogue FR) : un code à taper dans la recherche de Nuvio,
 *     que le guide guette (GET /seance/<code>, voir seance.js) ; preuve que l'addon est installé et répond ;
 *   - « Vérifier ma clé » (étape 5, trousseau) : la clé AllDebrid demandée directement à AllDebrid, depuis le
 *     navigateur, jamais par notre serveur ;
 *   - le diagnostic par photo (étape 12) : une photo de l'écran, réduite sur l'appareil, lue par Gemini
 *     (POST /diagnostic, voir diagnostic.js), qui ouvre la bonne panne.
 * Le HTML est inséré par guide.js ; le style et le script sont servis à part (statique.js), après guide-fin.js.
 */
import { esc } from "./outils-serveur.js";

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

/** Étape 5, dans le trousseau : vérifier la clé AllDebrid auprès d'AllDebrid. */
export const verifCleHTML = () => `<div class="verif-cle" id="verif-cle" hidden>
        <button type="button" class="ca-changer" id="vc-btn">Vérifier ma clé</button>
        <p class="vc-etat" id="vc-etat" role="status" aria-live="polite"></p>
        <p class="small vc-note">La vérification part directement de ce navigateur vers AllDebrid : notre serveur ne voit jamais ta clé.</p>
      </div>`;

/** Étape 12, avant les pannes : la photo de l'écran. */
export const photoHTML = (origin) => `<div class="photo-diag" id="photo-diag">
      <svg class="pd-icone" viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="13" width="38" height="27" rx="5"/><path d="M17 13l3-5h8l3 5"/><circle cx="24" cy="26.5" r="8"/><circle cx="24" cy="26.5" r="3.2"/><circle cx="36.5" cy="19" r="1.6"/></svg>
      <div class="pd-texte">
        <h3 class="sub-h">L'œil du projectionniste</h3>
        <p>Un message bizarre à l'écran ? Prends ta TV en photo avec ton téléphone : l'IA lit l'écran et t'ouvre la bonne panne ci-dessous.</p>
        <p class="pd-actions"><button type="button" class="perso-btn" id="pd-btn">Prendre ou choisir une photo</button><input type="file" id="pd-fichier" accept="image/*" hidden></p>
        <p class="pd-etat" id="pd-etat" role="status" aria-live="polite"></p>
        <p class="small">La photo est réduite sur ton appareil, puis lue par Gemini (l'IA de Google), avec ta clé de la <a href="${esc(origin)}/configure#s-ia">salle 2</a> si tu en as une. Elle n'est jamais gardée.</p>
      </div>
      <div class="pd-resultat" id="pd-resultat" tabindex="-1" hidden>
        <div class="pd-photo" id="pd-photo"></div>
        <div>
          <p class="pd-lu" id="pd-lu-l"><span>Lu à l'écran</span> <q id="pd-lu"></q></p>
          <p class="pd-conseil" id="pd-conseil"></p>
          <p class="pd-suite" id="pd-suite" hidden>La panne qui correspond est ouverte juste en dessous.</p>
        </div>
      </div>
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

/* Vérifier ma clé AllDebrid. */
.verif-cle { display: grid; gap: 6px; justify-items: start; }
.verif-cle p { margin: 0; }
.vc-etat { font-weight: 800; font-size: .95rem; }
.vc-etat:empty { display: none; }
.vc-etat.bon { color: var(--green); }
.vc-etat.moyen, .vc-etat.mauvais { color: #ffe1d8; border-left: 3px solid var(--red); padding: 4px 0 4px 10px; }
.vc-etat a { color: var(--bulb); }
.vc-note { max-width: 60ch; }

/* L'œil du projectionniste : le diagnostic par photo. */
.photo-diag { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px 16px; padding: 16px 18px; border-radius: 14px; border: 1px solid rgba(255,207,107,.35);
  background: linear-gradient(180deg, rgba(255,207,107,.08), rgba(255,207,107,.02)); }
.photo-diag p { margin: 0; }
.pd-icone { width: 48px; height: 48px; fill: none; stroke: var(--bulb); stroke-width: 2.4; stroke-linejoin: round; }
.pd-texte { display: grid; gap: 8px; }
.pd-texte .sub-h { margin: 0; }
.pd-etat { font-weight: 700; font-size: .95rem; color: var(--bulb); }
.pd-etat:empty { display: none; }
.pd-etat.erreur { color: #ffe1d8; border-left: 3px solid var(--red); padding: 4px 0 4px 10px; }
.pd-etat.lit::before { content: ""; display: inline-block; width: 12px; height: 12px; margin-right: 8px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; vertical-align: -1px; animation: pd-tourne .8s linear infinite; }
@keyframes pd-tourne { to { transform: rotate(360deg); } }
.pd-resultat { grid-column: 1 / -1; display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 14px; align-items: start; padding: 14px; border-radius: 12px; background: var(--velvet); border: 1px solid var(--seat); scroll-margin-top: 90px; }
.pd-resultat:focus { outline: none; }
.pd-resultat:focus-visible { outline: 3px solid var(--bulb); }
.pd-photo img { display: block; width: 96px; height: 72px; object-fit: cover; border-radius: 8px; border: 1px solid var(--seat); }
.pd-resultat > div { display: grid; gap: 6px; }
.pd-lu span { display: block; font: 700 .72rem var(--body); letter-spacing: .18em; text-transform: uppercase; color: var(--dim); }
.pd-lu q { font: 600 .95rem var(--type); color: var(--cream); }
.pd-conseil { font-weight: 700; }
.pd-suite { font-size: .9rem; color: var(--bulb); }
/* Le résultat rangé juste au-dessus de la panne choisie, qui s'allume. */
.faq .pd-resultat { margin: 10px 0 0; }
.faq details.pd-choisie { border-left: 3px solid var(--bulb); padding-left: 12px; background: rgba(255,207,107,.05); border-radius: 0 10px 10px 0; }
@media (max-width: 520px) { .photo-diag { grid-template-columns: minmax(0, 1fr); } .pd-icone { width: 40px; height: 40px; } .pd-resultat { grid-template-columns: 72px minmax(0, 1fr); } .pd-photo img { width: 72px; height: 54px; } }
@media (prefers-reduced-motion: reduce) { .se-etat.guette::before, .pd-etat.lit::before { animation: none; } .seance.ok .se-tampon { animation: none; } }
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

// ---------- Vérifier ma clé AllDebrid (étape 5) : directement auprès d'AllDebrid, depuis ce navigateur ----------
(() => {
  const input = document.getElementById("ad-key"), zone = document.getElementById("verif-cle");
  if (!input || !zone) return;
  const btn = document.getElementById("vc-btn"), etat = document.getElementById("vc-etat");
  const OFFRES = "https://alldebrid.com/offer/";
  const dire = (texte, ton, lien) => {
    etat.className = "vc-etat " + (ton || ""); etat.textContent = texte;
    if (lien) { const a = document.createElement("a"); a.href = lien[0]; a.target = "_blank"; a.rel = "noopener"; a.textContent = lien[1]; etat.append(" ", a); }
  };
  const maj = () => { zone.hidden = !cleAllDebrid(input.value); etat.textContent = ""; etat.className = "vc-etat"; };
  input.addEventListener("input", maj);
  const oublier = document.getElementById("oublier-cle");
  if (oublier) oublier.addEventListener("click", () => setTimeout(maj));
  maj();
  // premiumUntil : secondes depuis 1970 (millisecondes au cas où).
  const date = (t) => {
    const d = new Date(t > 1e12 ? t : t * 1000), memeAnnee = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString("fr-FR", memeAnnee ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });
  };
  const ERREURS = {
    AUTH_BAD_APIKEY: "Clé refusée : AllDebrid ne la connaît pas. Recopie-la depuis la page des clés API.",
    AUTH_MISSING_APIKEY: "Clé refusée : AllDebrid ne la connaît pas. Recopie-la depuis la page des clés API.",
    AUTH_BLOCKED: "Clé bloquée par AllDebrid depuis cet endroit (nouvel appareil, VPN ou autre pays) : valide la demande reçue par e-mail, puis réessaie.",
    AUTH_USER_BANNED: "Clé refusée : ce compte AllDebrid est suspendu.",
  };
  btn.addEventListener("click", async () => {
    const cle = cleAllDebrid(input.value);
    if (!cle) return;
    btn.disabled = true; dire("Vérification auprès d'AllDebrid…");
    try {
      const r = await fetch("https://api.alldebrid.com/v4/user?agent=catalogue-fr", {
        headers: { Authorization: "Bearer " + cle }, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store",
      });
      const j = await r.json();
      const u = j && j.status === "success" && j.data && j.data.user;
      if (!u) { const c = (j && j.error && j.error.code) || ""; dire(ERREURS[c] || "AllDebrid refuse cette clé" + (c ? " (" + c + ")" : "") + " : recopie-la depuis la page des clés API.", "mauvais"); return; }
      if (u.isPremium && u.isTrial) { dire("Essai gratuit : les sources ne marcheront pas avec les addons. Il faut un abonnement premium payant.", "moyen", [OFFRES, "Voir les offres"]); return; }
      if (u.isPremium) {
        const fin = Number(u.premiumUntil) || 0, jours = fin ? Math.ceil(((fin > 1e12 ? fin : fin * 1000) - Date.now()) / 86400e3) : 0;
        if (!fin) dire("Premium actif ✓", "bon");
        else if (jours <= 7) dire("Premium actif jusqu'au " + date(fin) + " : bientôt fini, pense à le renouveler.", "moyen", [OFFRES, "Renouveler"]);
        else dire("Premium actif jusqu'au " + date(fin) + " ✓", "bon");
        if (typeof window.popcorn === "function" && jours > 7) popcorn(btn);
        return;
      }
      dire("Compte gratuit : les sources ne marcheront pas. Passe en premium pour regarder.", "mauvais", [OFFRES, "Voir les offres"]);
    } catch (e) {
      dire("AllDebrid ne répond pas : vérifie ta connexion, puis réessaie.", "mauvais");
    } finally { btn.disabled = false; }
  });
})();

// ---------- L'œil du projectionniste (étape 12) : une photo de l'écran, lue par l'IA ----------
(() => {
  const box = document.getElementById("photo-diag");
  if (!box) return;
  const btn = document.getElementById("pd-btn"), fichier = document.getElementById("pd-fichier"), etat = document.getElementById("pd-etat");
  const resultat = document.getElementById("pd-resultat"), apercu = document.getElementById("pd-photo");
  const SALLE2 = ORIG + "/configure#s-ia";
  const cleGemini = () => { try { return localStorage.getItem("cle-gemini") || ""; } catch (e) { return ""; } };
  // Sans clé à soi : la clé du site sert-elle aux visiteurs ? Demandé une fois, quand l'étape approche.
  let iaSite = null;
  const demanderIa = () => {
    if (iaSite !== null || cleGemini()) return;
    iaSite = fetch(ORIG + "/diagnostic", { cache: "no-store" }).then((r) => r.json()).then((j) => !!j.ia, () => true);
  };
  new IntersectionObserver((es, o) => { if (es.some((e) => e.isIntersecting)) { demanderIa(); o.disconnect(); } }, { rootMargin: "400px 0px" }).observe(box);
  const dire = (texte, ton, lien) => {
    etat.className = "pd-etat " + (ton || ""); etat.textContent = texte;
    if (lien) { const a = document.createElement("a"); a.href = lien[0]; a.textContent = lien[1]; etat.append(" ", a); }
  };
  const sansCle = () => dire("Pour lire une photo, il faut une clé Gemini, gratuite (2 minutes à créer) : ajoute-la dans la salle 2, section IA, puis reviens ici.", "erreur", [SALLE2, "Ajouter ma clé"]);
  btn.addEventListener("click", async () => {
    if (!cleGemini() && iaSite && !(await iaSite)) { sansCle(); return; }
    fichier.value = ""; fichier.click();
  });
  // La photo réduite à 1024 px au plus, en JPEG : plus légère à envoyer, et bien assez pour lire un écran.
  const charger = (f) => new Promise((ok, ko) => {
    const img = new Image(), u = URL.createObjectURL(f);
    img.onload = () => { URL.revokeObjectURL(u); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(u); ko(new Error("format")); };
    img.src = u;
  });
  async function reduire(f) {
    let src;
    try { src = await createImageBitmap(f, { imageOrientation: "from-image" }); } catch (e) { src = await charger(f); }
    const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
    if (!w || !h) throw new Error("format");
    const k = Math.min(1, 1024 / Math.max(w, h)), c = document.createElement("canvas");
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    if (src.close) src.close();
    const en = (q) => new Promise((ok) => c.toBlob(ok, "image/jpeg", q));
    let b = await en(0.8);
    if (b && b.size > 1400000) b = await en(0.6);
    if (!b) throw new Error("format");
    return b;
  }
  let apercuUrl = "";
  fichier.addEventListener("change", async () => {
    const f = fichier.files && fichier.files[0];
    if (!f) return;
    resultat.hidden = true; box.append(resultat);
    document.querySelectorAll("#depannage details.pd-choisie").forEach((d) => d.classList.remove("pd-choisie"));
    btn.disabled = true; box.setAttribute("aria-busy", "true");
    dire("Lecture de l'écran…", "lit");
    try {
      let photo;
      try { photo = await reduire(f); } catch (e) { dire("Cette photo ne s'ouvre pas ici : prends-en une autre avec l'appareil photo (pas une capture au format HEIC).", "erreur"); return; }
      const cle = cleGemini();
      let r, j = {};
      try {
        r = await fetch(ORIG + "/diagnostic", { method: "POST", headers: { "Content-Type": "image/jpeg", ...(cle ? { "X-Cle-Gemini": cle } : {}) }, body: photo, cache: "no-store" });
        j = await r.json().catch(() => ({}));
      } catch (e) { dire("Pas de connexion : vérifie ton Wi-Fi, puis réessaie.", "erreur"); return; }
      if (r.status === 401 && j.cle === "absente") { sansCle(); return; }
      if (!r.ok) { dire(j.error || "L'IA ne répond pas pour le moment : réessaie dans un instant.", "erreur", r.status === 502 && cle ? [SALLE2, "Vérifier ma clé"] : null); return; }
      if (!j.lisible) { dire("L'écran est trop flou ou trop sombre sur cette photo : rapproche-toi, évite les reflets, et réessaie.", "erreur"); return; }
      if (apercuUrl) URL.revokeObjectURL(apercuUrl);
      const img = document.createElement("img");
      img.alt = "Ta photo"; img.src = apercuUrl = URL.createObjectURL(photo);
      apercu.replaceChildren(img);
      document.getElementById("pd-lu").textContent = j.lu || "";
      document.getElementById("pd-lu-l").hidden = !j.lu;
      document.getElementById("pd-conseil").textContent = j.conseil || "";
      const panne = j.faq && document.getElementById("panne-" + j.faq);
      document.getElementById("pd-suite").hidden = !panne;
      resultat.hidden = false;
      if (panne) {
        // Panne cachée par un voyant du pupitre : on éteint le voyant, toutes les pannes reviennent.
        if (panne.hidden) { const v = document.querySelector('#pupitre .voyant[aria-pressed="true"]'); if (v) v.click(); }
        panne.before(resultat); panne.open = true; panne.classList.add("pd-choisie");
      }
      dire(panne ? "C'est lu : voici la panne qui correspond." : "C'est lu. Aucune panne connue ne correspond : suis le conseil, ou le grand rembobinage plus bas.");
      resultat.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      resultat.focus({ preventScroll: true });
      if (typeof window.popcorn === "function") popcorn(resultat);
    } finally { btn.disabled = false; box.removeAttribute("aria-busy"); }
  });
})();
`;
