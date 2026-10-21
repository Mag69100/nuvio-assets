/**
 * Soirée à deux (salle 2) : on colle le lien d'un ami (sa page de programmation, son lien d'addon, son lien fixe),
 * on coche ses rangées, elles s'ajoutent aux siennes : les rangées d'origine s'allument à leur place, ses rangées sur
 * mesure sont recopiées (12 au plus). Sa clé Gemini et son jeton d'alerte ne sont jamais lus.
 *
 * Le serveur relit le lien (même un lien fixe, dont les réglages sont dans la base) : /<config ou f…>/programmation.json
 * ne donne que les rangées, leurs noms et les rangées sur mesure. Pas de clé de modification à fournir : qui a le
 * lien peut déjà l'installer et voir ces rangées.
 */

/** Les rangées d'un lien, sans rien de secret (ni clé Gemini, ni jeton d'alerte, ni le reste des réglages). */
export const programmationPublique = (cfg) => ({ n: cfg.n, r: cfg.r, x: cfg.x, o: cfg.o });

export const SOIREE_HTML = `
        <button type="button" class="add-row ami" id="soiree-ouvrir" aria-expanded="false" aria-controls="soiree">Soirée à deux : fusionner avec le billet d'un ami</button>
        <div class="builder soiree" id="soiree" role="region" aria-labelledby="soiree-titre" hidden>
          <h3 id="soiree-titre" tabindex="-1">Soirée à deux</h3>
          <p class="sub">Colle le lien de ton ami : sa page de programmation (« Offrir ce billet »), son lien d'addon ou son lien fixe. Coche ses rangées : elles rejoignent les tiennes. Sa clé Gemini, elle, reste chez lui.</p>
          <div class="field">
            <label for="soiree-lien">Le lien de ton ami</label>
            <div class="soiree-ligne">
              <input type="text" class="plain" id="soiree-lien" inputmode="url" autocomplete="off" spellcheck="false" enterkeyhint="go" placeholder="https://…/manifest.json">
              <button type="button" class="mini ok" id="soiree-lire">Lire son billet</button>
            </div>
          </div>
          <p class="soiree-msg" id="soiree-msg" aria-live="polite"></p>
          <fieldset class="soiree-liste" id="soiree-liste" hidden>
            <legend id="soiree-de"></legend>
            <ul id="soiree-rangees"></ul>
            <p class="soiree-place" id="soiree-place"></p>
          </fieldset>
          <div class="b-actions"><button type="button" class="mini ok" id="soiree-ajouter" hidden>Ajouter à ma programmation</button><button type="button" class="mini" id="soiree-fermer">Fermer</button></div>
        </div>`;

export const SOIREE_CSS = `/* ---------- Soirée à deux (worker/soiree.js) ---------- */
.add-row.ami { border-style: dashed; border-color: rgba(229,65,58,.7); background: rgba(229,65,58,.07); color: #ffb3a8; }
.add-row.ami::before { content: "♥"; margin-right: 8px; color: var(--red); }
.soiree { border-color: rgba(229,65,58,.7); background: linear-gradient(180deg, #2c141c, #1d0f16); }
.soiree h3 { color: #ffb3a8; }
.soiree h3:focus { outline: none; }
.soiree .sub { margin: -6px 0 0; }
.soiree .field > label { font: 700 .72rem var(--body); letter-spacing: .2em; text-transform: uppercase; color: var(--dim); }
.soiree-ligne { display: flex; gap: 8px; }
.soiree-ligne input { flex: 1; min-width: 0; }
.soiree-ligne .mini { padding: 10px 14px; font-size: .88rem; }
.soiree-msg { margin: 0; min-height: 1.2em; color: var(--dim); font-size: .9rem; }
.soiree-msg.erreur { color: #ffb3a8; font-weight: 700; }
.soiree-liste { margin: 0; padding: 0; border: 0; display: grid; gap: 8px; min-width: 0; }
.soiree-liste legend { padding: 0; margin-bottom: 8px; font: 700 .72rem var(--body); letter-spacing: .2em; text-transform: uppercase; color: var(--dim); }
.soiree-liste legend b { color: var(--cream); letter-spacing: .06em; }
.soiree-liste ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.soiree-liste li label { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--seat); background: var(--velvet); cursor: pointer; }
.soiree-liste li input { width: 20px; height: 20px; flex: none; accent-color: var(--bulb); cursor: pointer; }
.soiree-liste li span { min-width: 0; display: grid; }
.soiree-liste li b { font-weight: 800; overflow-wrap: anywhere; }
.soiree-liste li small { color: var(--dim); font-size: .82rem; }
.soiree-liste li.deja label { opacity: .55; cursor: default; }
.soiree-liste li input:focus-visible { outline: 3px solid var(--bulb); outline-offset: 2px; }
.soiree-place { margin: 0; color: var(--bulb); font-size: .85rem; font-weight: 700; }
.soiree-place:empty { display: none; }
`;

export const SOIREE_JS = `// ---------- Soirée à deux : les rangées du billet d'un ami (worker/soiree.js) ----------
{
  const FIXE = /^f[0-9A-Za-z]{16}$/;
  let ami = null; // { nom, rangees: [{ id, nom, sorte, x?, deja }] }
  const msg = (texte, erreur) => { $("soiree-msg").textContent = texte; $("soiree-msg").classList.toggle("erreur", !!erreur); };
  function ouvre(ouvert) {
    $("soiree").hidden = !ouvert;
    $("soiree-ouvrir").setAttribute("aria-expanded", String(ouvert));
    if (ouvert) { $("soiree").scrollIntoView({ behavior: glisse(), block: tactile ? "start" : "center" }); if (!tactile) $("soiree-lien").focus({ preventScroll: true }); else $("soiree-titre").focus({ preventScroll: true }); }
    else $("soiree-ouvrir").focus();
  }
  $("soiree-ouvrir").addEventListener("click", () => ouvre($("soiree").hidden));
  $("soiree-fermer").addEventListener("click", () => ouvre(false));

  /**
   * L'adresse à lire pour un lien collé, ou null : sa config (le premier segment) relue par ce site-ci ; un lien
   * fixe, relu par le site qui le garde (le sien ou un autre en https). Sans config : la programmation d'origine.
   */
  function adresseAmi(texte) {
    let u;
    try { u = new URL(String(texte || "").trim().replace(/^(stremio|nuvio):[/][/]/i, "https://")); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const seg = u.pathname.split("/").filter(Boolean)[0] || "";
    if (!seg || /^(configure|manifest\\.json|collections\\.json)$/.test(seg)) return { origine: true };
    if (FIXE.test(seg)) return u.origin === D.origin || u.protocol === "https:" ? { url: u.origin + "/" + seg + "/programmation.json" } : null;
    if (!/^[A-Za-z0-9_-]{2,6000}$/.test(seg)) return null;
    return { url: D.origin + "/" + seg + "/programmation.json" };
  }
  // Une rangée sur mesure venue d'ailleurs, remise en forme (comme cleanCustom de config.js) avant d'entrer.
  const entier = (v, n) => Number.isInteger(v) && v >= 0 && v < n;
  function propre(x) {
    if (!x || typeof x !== "object") return null;
    const liste = (v, n) => Array.isArray(v) ? [...new Set(v)].filter((i) => entier(i, n)).sort((a, b) => a - b) : [];
    const y = Array.isArray(x.y) ? x.y.map((v) => Number.isInteger(v) && v >= 1900 && v <= 2100 ? v : 0) : [];
    return { n: typeof x.n === "string" ? x.n.replace(/[\\u0000-\\u001f<>]/g, "").trim().slice(0, 40) : "",
      t: [0, 1, 2].includes(x.t) ? x.t : 0, g: liste(x.g, D.genres.length), w: liste(x.w, D.providers.length),
      l: D.languages.some((l) => l[0] === x.l) ? x.l : "", y: [y[0] || 0, y[1] || 0],
      v: Math.min(9.5, Math.max(0, Number(x.v) || 0)), s: [0, 1, 2, 3].includes(x.s) ? x.s : 0 };
  }
  const memeRangee = (a, b) => JSON.stringify({ ...a, n: "" }) === JSON.stringify({ ...b, n: "" }) && a.n === b.n;

  function lit(j) {
    const x = (Array.isArray(j.x) ? j.x : []).slice(0, D.maxCustom).map(propre);
    const o = j.o && typeof j.o === "object" ? j.o : {};
    const nomDe = (id) => typeof o[id] === "string" && o[id].trim() ? o[id].trim().slice(0, 40) : "";
    const rangees = [];
    for (const id of Array.isArray(j.r) ? j.r : []) {
      if (typeof id !== "string") continue;
      const p = /^perso-(\\d+)$/.exec(id);
      if (p) {
        const xi = x[Number(p[1])];
        if (!xi) continue;
        const copie = { ...xi, n: nomDe(id) || xi.n || "Rangée de ton ami" };
        rangees.push({ id, nom: copie.n, sorte: describe(copie), x: copie, deja: state.x.some((m) => memeRangee(m, copie)) });
      } else {
        const r = D.rows.find((d) => d.id === id);
        if (r) rangees.push({ id, nom: nomDe(id) || r.name, sorte: r.kind + (nomDe(id) ? " · " + r.name : ""), deja: state.r.includes(id) });
      }
    }
    return { nom: typeof j.n === "string" ? j.n.slice(0, 40) : "", rangees };
  }

  function dessine() {
    const ul = $("soiree-rangees"); ul.textContent = "";
    $("soiree-de").textContent = "";
    $("soiree-de").append("Ses rangées · ", el("b", { text: ami.nom || "son billet" }));
    ami.rangees.forEach((r, i) => {
      const cb = el("input", { type: "checkbox", id: "soiree-r-" + i });
      cb.checked = true; cb.disabled = r.deja;   // déjà chez soi : cochée d'office, grisée
      cb.addEventListener("change", place);
      ul.append(el("li", { class: r.deja ? "deja" : "" }, el("label", { for: cb.id }, cb,
        el("span", {}, el("b", { text: r.nom }), el("small", { text: (r.x ? "Sur mesure · " : "") + r.sorte + (r.deja ? " · déjà chez toi" : "") })))));
    });
    $("soiree-liste").hidden = false;
    $("soiree-ajouter").hidden = !ami.rangees.some((r) => !r.deja);
    place();
  }
  // Rangées sur mesure : 12 au plus ; ce qui ne rentre pas est dit avant d'ajouter.
  function place() {
    const voulues = ami.rangees.filter((r, i) => r.x && $("soiree-r-" + i).checked && !$("soiree-r-" + i).disabled).length;
    const libres = D.maxCustom - state.x.length;
    $("soiree-place").textContent = voulues > libres
      ? "Tu as " + state.x.length + " rangées sur mesure sur " + D.maxCustom + " : " + (libres > 1 ? "seules les " + libres + " premières cochées seront ajoutées." : libres === 1 ? "seule la première cochée sera ajoutée." : "supprime des tiennes pour faire de la place.")
      : "";
  }

  async function lire() {
    const a = adresseAmi($("soiree-lien").value);
    $("soiree-liste").hidden = true; $("soiree-ajouter").hidden = true; ami = null;
    if (!a) { msg("Ce n'est pas un lien de programmation : colle son lien d'addon (…/manifest.json), sa page de programmation ou son lien fixe.", true); return; }
    let j;
    if (a.origine) j = { n: D.defaults.n, r: D.defaults.r, x: [], o: {} };
    else {
      msg("Lecture de son billet…");
      $("soiree-lire").disabled = true;
      try {
        const r = await fetch(a.url, { credentials: "omit" });
        j = await r.json().catch(() => ({}));
        if (r.status === 503) throw new Error("Le site de ce lien ne répond pas pour le moment : réessaie dans quelques minutes.");
        if (!r.ok || !Array.isArray(j.r)) throw new Error(/introuvable/i.test(j.error || "") ? "Ce lien fixe n'existe pas (ou plus) : demande-lui de te renvoyer son lien." : "Ce lien ne se lit pas : vérifie qu'il est complet.");
      } catch (err) {
        $("soiree-lire").disabled = false;
        msg(err && err.message && !/fetch|network/i.test(err.message) ? err.message : "Lecture impossible : vérifie ta connexion.", true);
        return;
      }
      $("soiree-lire").disabled = false;
    }
    ami = lit(j);
    if (!ami.rangees.length) { msg("Son billet n'a aucune rangée à l'affiche.", true); return; }
    const nouvelles = ami.rangees.filter((r) => !r.deja).length;
    msg(nouvelles ? ami.rangees.length + " rangées trouvées, " + nouvelles + " que tu n'as pas encore." : "Tu as déjà toutes ses rangées !");
    dessine();
  }
  $("soiree-lire").addEventListener("click", lire);
  $("soiree-lien").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); lire(); } });

  $("soiree-ajouter").addEventListener("click", () => {
    if (!ami) return;
    const avant = clone(state), ordreAvant = [...order];
    let ajoutees = 0, refusees = 0;
    ami.rangees.forEach((r, i) => {
      const cb = $("soiree-r-" + i);
      if (!cb || !cb.checked || cb.disabled) return;
      if (!r.x) { setRow(r.id, true); ajoutees++; return; }   // rangée d'origine : allumée à sa place
      if (state.x.length >= D.maxCustom || state.x.some((m) => memeRangee(m, r.x))) { refusees++; return; }
      state.x.push(clone(r.x));
      const id = "perso-" + (state.x.length - 1);
      order.push(id); setRow(id, true); ajoutees++;
    });
    if (!ajoutees) { msg(refusees ? "Plus de place : " + D.maxCustom + " rangées sur mesure au plus. Supprime des tiennes, puis réessaie." : "Coche au moins une rangée.", true); return; }
    renderRows(); update();
    const texte = ajoutees + (ajoutees > 1 ? " rangées ajoutées" : " rangée ajoutée") + " depuis son billet."
      + (refusees ? " " + refusees + " sur mesure en trop (" + D.maxCustom + " au plus)." : "");
    ouvre(false);
    $("soiree-lien").value = ""; $("soiree-liste").hidden = true; $("soiree-ajouter").hidden = true; msg(""); ami = null;
    effet("popcorn", $("soiree-ouvrir")); bruit("punch");
    proposeAnnuler(texte, avant, ordreAvant, $("soiree-ouvrir"));
  });
}
`;
