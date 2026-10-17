/**
 * L'aperçu de l'accueil final (« Voir l'accueil que tu auras à la fin ») : un écran de TV avec l'accueil
 * Nuvio obtenu en suivant le guide (réglages conseillés, vrais films du moment), en affiches verticales ou
 * paysage, avec ou sans PostersPlus. Partagé par le hall et le guide.
 * Les boutons [data-resultat] l'ouvrent ; une arrivée avec « #apercu » l'ouvre directement.
 */
export const APERCU_CSS = `/* L'aperçu du résultat : l'accueil Nuvio qu'on obtient à la fin du guide, sur un écran de TV. */
.voir-resultat { display: inline-flex; align-items: center; gap: 8px; font: 800 .92rem var(--body); padding: 9px 16px; border-radius: 99px; cursor: pointer;
  border: 1px solid rgba(255,207,107,.55); background: rgba(255,207,107,.08); color: var(--bulb); }
.voir-resultat:hover { background: rgba(255,207,107,.16); }
.voir-resultat svg { width: 18px; height: 18px; }
.resultat { position: fixed; inset: 0; z-index: 86; display: grid; place-items: center; align-content: center; gap: 14px; padding: 16px; background: rgba(5,3,4,.97); animation: rise .3s ease both; }
.resultat .tv { width: min(1080px, calc(100vw - 32px), calc((100vh - 170px) * 1.6)); padding: 10px; border-radius: 16px; background: #050304; box-shadow: 0 0 0 2px #2b1820, 0 30px 80px rgba(0,0,0,.7); }
.resultat .ecran { position: relative; aspect-ratio: 16 / 10; border-radius: 8px; overflow: hidden; background: linear-gradient(180deg, #13101a, #0b0910); container-type: inline-size; }
.resultat .defile { position: absolute; inset: 0; overflow-y: auto; scrollbar-width: none; padding-bottom: 4cqw; }
.resultat .defile::-webkit-scrollbar { display: none; }
.r-hero { position: relative; height: 34cqw; display: flex; align-items: flex-end; padding: 0 3cqw 3cqw; background: #000 center 25% / cover no-repeat; transition: background-image .6s ease; }
.r-hero::before { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,6,12,.94), rgba(8,6,12,.35) 60%, transparent), linear-gradient(transparent 45%, #0f0c14); }
.r-hero > div { position: relative; max-width: 62%; display: grid; gap: .9cqw; }
.r-hero b { font: 400 5.4cqw/.95 var(--display); letter-spacing: .02em; color: #fff; }
.r-hero span { font: 600 1.8cqw/1.3 var(--body); color: #d9d4e6; }
.r-hero p { margin: 0; font: 400 1.7cqw/1.4 var(--body); color: #bdb6cc; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.r-hero p, .rf-desc { white-space: pre-line; }
.r-hero p.a-dispo { -webkit-line-clamp: 3; }
.a-dispo::first-line { color: #f3c969; font-weight: 700; }
.r-hero i { justify-self: start; font: normal 800 1.6cqw var(--body); background: #fff; color: #111; padding: .7cqw 1.7cqw; border-radius: .7cqw; }
.r-rangee h4 { margin: 2.2cqw 3cqw .4cqw; font: 700 2.2cqw/1.2 var(--body); color: #e8e2ff; }
.r-piste { display: flex; gap: 1.4cqw; overflow-x: auto; scrollbar-width: none; padding: 1cqw 3cqw; cursor: grab; }
.r-piste::-webkit-scrollbar { display: none; }
.r-piste.tire { cursor: grabbing; user-select: none; }
.r-piste > * { flex: none; border-radius: 1.2cqw; background: #221a2b center / cover no-repeat; transition: transform .25s ease, box-shadow .25s ease; }
.r-piste > *:hover { transform: scale(1.06); box-shadow: 0 0 0 .4cqw #fff; }
.r-affiche { position: relative; overflow: hidden; width: 12cqw; aspect-ratio: 2 / 3; }
.paysage .r-affiche { width: 24cqw; aspect-ratio: 16 / 9; }
.r-affiche .t { position: absolute; left: 0; right: 0; bottom: 0; display: none; padding: 3cqw 1.2cqw 1cqw; font: 400 2.3cqw/1 var(--display); letter-spacing: .03em; color: #fff; background: linear-gradient(transparent, rgba(0,0,0,.88)); }
.paysage:not(.pp) .r-affiche .t { display: block; }
/* Les réglages d'affichage sous l'écran : les mêmes qu'en salle 2. */
.r-outils { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.r-outils .seg { display: inline-flex; border: 1px solid var(--seat); border-radius: 10px; overflow: hidden; }
.r-outils button { font: 700 .85rem var(--body); padding: 8px 14px; border: 0; background: var(--velvet); color: var(--dim); cursor: pointer; }
.r-outils .seg button + button { border-left: 1px solid var(--seat); }
.r-outils button[aria-pressed="true"] { background: var(--cream); color: var(--ink); }
.r-outils .pp { border: 1px solid var(--seat); border-radius: 10px; }
.r-cle { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; color: var(--dim); font-size: .88rem; }
.r-cle input { font: 600 .95rem var(--type); padding: 8px 10px; border-radius: 8px; border: 1px dashed var(--bulb); background: #0f080c; color: var(--cream); width: 260px; max-width: 100%; }
.r-cle button { font: 800 .85rem var(--body); padding: 8px 14px; border-radius: 8px; border: 0; background: var(--bulb); color: var(--ink); cursor: pointer; }
.r-cle .err { color: #ff9c95; }
.r-cle .coller { background: transparent; color: var(--bulb); border: 1px solid rgba(255,207,107,.5); }
.r-cle .aide-cle { background: none; color: var(--bulb); text-decoration: underline; text-underline-offset: 3px; padding: 8px 4px; }
/* La fenêtre de l'étape 5, ouverte par-dessus l'aperçu */
.pop-etape { position: fixed; inset: 0; z-index: 88; display: grid; place-items: center; padding: 16px; background: rgba(5,3,4,.82); animation: rise .25s ease both; }
.pop-etape .boite { position: relative; display: grid; gap: 12px; width: min(560px, 100%); max-height: calc(100vh - 32px); overflow: auto; padding: 22px 24px; border-radius: 18px;
  background: var(--velvet-2); border: 1px solid rgba(255,207,107,.35); box-shadow: 0 30px 80px rgba(0,0,0,.7); }
.pop-etape h2 { margin: 0; font: 400 1.8rem/1 var(--display); letter-spacing: .03em; color: var(--bulb); }
.pop-etape ol { margin: 0; padding-left: 1.3em; display: grid; gap: 7px; }
.pop-etape li::marker { color: var(--bulb); font-weight: 800; }
.pop-etape .fermer { position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; border-radius: 50%; border: 0; background: rgba(255,255,255,.08); color: var(--cream); font: 800 1.1rem/1 var(--body); cursor: pointer; }
.pop-etape .ok { justify-self: start; font: 800 .95rem var(--body); padding: 11px 18px; border-radius: 10px; border: 0; background: var(--bulb); color: var(--ink); cursor: pointer; }
.r-tuile { width: 18cqw; aspect-ratio: 16 / 9; background-color: #fff !important; }
.resultat .legende { margin: 0; max-width: 62ch; text-align: center; color: var(--dim); font-size: .95rem; }
.resultat .legende a { color: var(--bulb); }
.resultat .fermer { position: absolute; top: 16px; right: 16px; width: 40px; height: 40px; border-radius: 50%; border: 0; background: rgba(255,255,255,.1); color: #fff; font: 800 1.3rem/1 var(--body); cursor: pointer; }
.apercu-lien[data-resultat] { font-family: var(--body); cursor: pointer; }
/* Dans l'aperçu : les fiches des films, la bibliothèque (écran à part, comme dans Nuvio) */
.r-affiche { cursor: pointer; }
.r-onglets { position: absolute; top: 2.4cqw; right: 2.4cqw; z-index: 2; display: flex; gap: .8cqw; padding: .6cqw; border-radius: 99px; background: rgba(10,8,14,.65); }
.r-onglets button { font: 800 max(1.7cqw, 10px) var(--body); padding: .7cqw 1.8cqw; border: 0; border-radius: 99px; background: transparent; color: #cfc8dc; cursor: pointer; }
.r-onglets button[aria-pressed="true"] { background: #fff; color: #111; }
.r-biblio { position: absolute; inset: 0; z-index: 1; overflow-y: auto; scrollbar-width: none; padding: 9cqw 3cqw 4cqw; background: linear-gradient(180deg, #13101a, #0b0910); }
.r-biblio::-webkit-scrollbar { display: none; }
.r-biblio h3 { margin: 0 0 2cqw; font: 400 5cqw/1 var(--display); letter-spacing: .02em; color: #fff; }
.r-biblio .grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(12cqw, 1fr)); gap: 1.6cqw; }
.r-biblio.paysage .grille { grid-template-columns: repeat(auto-fill, minmax(24cqw, 1fr)); }
.r-biblio .grille .r-affiche { width: auto; }
.r-rech input { width: 100%; font: 600 max(2.2cqw, 12px) var(--body); padding: 1.4cqw 2cqw; border-radius: 99px; border: 0; background: rgba(255,255,255,.1); color: #fff; outline: none; }
.r-rech input:focus { box-shadow: 0 0 0 .3cqw #fff; }
.r-rech .r-rangee h4 { margin: 2.6cqw 0 .4cqw; }
.r-rech .r-piste { margin: 0 -3cqw; }
.r-rech .r-rangee .vide { margin: 1cqw 0; text-align: left; }
.r-biblio .vide { margin: 6cqw auto 0; max-width: 46ch; text-align: center; color: #8d86a0; font-size: max(2.2cqw, 11px); line-height: 1.5; }
.r-fiche { position: absolute; inset: 0; z-index: 3; overflow: hidden; background: #0b0910; animation: rise .3s ease both; }
.rf-fond { position: absolute; inset: 0; background: center 20% / cover no-repeat; }
.rf-ombre { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,6,12,.96) 30%, rgba(8,6,12,.55) 65%, rgba(8,6,12,.2)), linear-gradient(transparent 60%, #0b0910); }
.rf-corps { position: relative; height: 100%; display: grid; grid-template-columns: 22cqw minmax(0, 1fr); gap: 3.5cqw; align-items: center; padding: 4cqw 7cqw 4cqw 5cqw; }
.rf-affiche { aspect-ratio: 2 / 3; border-radius: 1.2cqw; background: #221a2b center / cover no-repeat; box-shadow: 0 2cqw 4cqw rgba(0,0,0,.6); }
.rf-info { display: grid; gap: 1.3cqw; justify-items: start; }
.rf-info b { font: 400 6cqw/.95 var(--display); letter-spacing: .02em; color: #fff; }
.rf-meta { font: 700 max(1.8cqw, 11px)/1.3 var(--body); color: #e0d9ee; }
.rf-desc { margin: 0; font: 400 max(1.9cqw, 11px)/1.45 var(--body); color: #c9c1d6; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }
.rf-btns { display: flex; gap: 1.2cqw; flex-wrap: wrap; }
.rf-btns i, .rf-btns button { font: normal 800 max(1.8cqw, 11px) var(--body); padding: .9cqw 2cqw; border-radius: .8cqw; border: 0; background: rgba(255,255,255,.16); color: #fff; }
.rf-btns i { background: #fff; color: #111; }
.rf-btns button { cursor: pointer; }
.rf-btns button:hover, .rf-btns button:focus-visible { background: #fff; color: #111; outline: none; }
.rf-btns button:disabled { opacity: .5; cursor: default; }
.rf-fermer { position: absolute; top: 2.5cqw; right: 2.5cqw; z-index: 2; width: max(5cqw, 28px); height: max(5cqw, 28px); border-radius: 50%; border: 0; cursor: pointer; background: rgba(255,255,255,.15); color: #fff; font: 700 max(2.8cqw, 15px)/1 var(--body); }
.rf-video { position: absolute; inset: 0; z-index: 4; background: #000; }
.rf-video iframe { width: 100%; height: 100%; border: 0; display: block; }
/* Doigt plutôt que souris : cibles plus grandes, champs en 16 px (sinon iOS zoome dans la page). */
@media (hover: none), (pointer: coarse) {
  .r-outils button, .r-cle button { min-height: 44px; }
  .r-cle input, .r-rech input { font-size: 16px; }
  .r-onglets button { font-size: 12px; padding: 7px 12px; }
  .rf-btns i, .rf-btns button { font-size: 12px; padding: 8px 12px; }
  .rf-fermer { width: 36px; height: 36px; }
  .resultat .fermer { width: 44px; height: 44px; }
  .pop-etape .fermer { width: 40px; height: 40px; }
}`;

/** Le script de l'aperçu ; posterUrl est le réglage PostersPlus conseillé, avec « TA_CLE_TMDB » à la place de la clé. */
export const apercuJS = (origin, posterUrl) => "const ORIG_AP = " + JSON.stringify(origin) + ", PP_AP = " + JSON.stringify(posterUrl) + ", ETAPE5_AP = " + JSON.stringify('<li>Crée un compte sur <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener">themoviedb.org</a> et confirme ton adresse e-mail.</li><li>Va dans <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">Paramètres → API</a> et demande une clé : type <b>Développeur</b>, usage <b>personnel</b>. Remplis le formulaire simplement (nom de l\'appli : « Nuvio perso »).</li><li>Copie la <b>Clé d\'API</b> (une suite de 32 lettres et chiffres) et garde-la dans tes notes.</li>') + ";\n" + `// ---------- L'accueil qu'on aura à la fin du guide (réglages conseillés, vraies affiches) ----------
(() => {
  let ouvert = null, aGlisse = 0;
  // Écran tactile : on ne donne jamais le focus à un champ de nous-mêmes (ça ouvrirait le clavier).
  const tactile = matchMedia("(hover: none), (pointer: coarse)").matches;
  const mkd = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const url = (u) => "url('" + String(u).replace(/'/g, "%27") + "')";
  // Film pas encore regardable : l'addon met « 📅 Dispo le… » en tête du résumé ; comme sur la TV,
  // la ligne du dessous ne garde alors que l'année.
  const aDispo = (m) => String(m.description || "").indexOf("📅") === 0;
  const ri = (m) => aDispo(m) ? String(m.releaseInfo || "").split(" · ")[0] : m.releaseInfo;
  // Faire glisser une rangée à la souris
  const glisse = (piste) => {
    let x0 = 0, l0 = 0, tire = false;
    piste.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; tire = true; x0 = e.clientX; l0 = piste.scrollLeft; });
    addEventListener("pointermove", (e) => { if (!tire) return; if (Math.abs(e.clientX - x0) > 4) piste.classList.add("tire"); piste.scrollLeft = l0 - (e.clientX - x0); });
    addEventListener("pointerup", () => { if (tire && piste.classList.contains("tire")) aGlisse = Date.now(); tire = false; piste.classList.remove("tire"); });
  };
  const ouvrir = async () => {
    if (ouvert) return;
    const ov = mkd("div", "resultat"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "L'accueil Nuvio à la fin du guide");
    const fermer = mkd("button", "fermer", "×"); fermer.type = "button"; fermer.setAttribute("aria-label", "Fermer l'aperçu");
    const tv = mkd("div", "tv"), ecran = mkd("div", "ecran"), defile = mkd("div", "defile");
    const hero = mkd("div", "r-hero"), info = mkd("div"); hero.append(info); info.append(mkd("b", null, "Chargement de l'accueil…"));
    defile.append(hero); ecran.append(defile); tv.append(ecran);
    const legende = mkd("p", "legende");
    legende.innerHTML = 'Ton accueil Nuvio une fois le guide terminé, avec les réglages conseillés et les vrais films du moment. Tu pourras choisir tes rangées, tes plateformes et tes filtres en <a href="' + ORIG_AP + '/configure">salle 2</a>' + (location.pathname.indexOf("/guide") === 0 ? "." : ", ou suivre le guide en <a href='" + ORIG_AP + "/guide'>salle 1</a>.");
    // Format des affiches et PostersPlus (mêmes réglages et même clé TMDB qu'en salle 2 et qu'à l'étape 8)
    const lit = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const ecrit = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
    let format = lit("apercu-format") === "l" ? "l" : "p", pp = lit("apercu-pp") === "1";
    const cle = () => (lit("tmdb-key") || "").trim();
    const ppSrc = (m, forme) => {
      const k = cle(); if (!pp || !k || !m.id) return "";
      const id = String(m.id), vals = { "{tmdb_id?}": id.startsWith("tmdb:") ? id.slice(5) : "", "{imdb_id?}": m.imdb_id || (id.startsWith("tt") ? id : ""), "{id}": id, "{type}": m.type || "movie", "{shape}": forme };
      let u = PP_AP.replace("TA_CLE_TMDB", encodeURIComponent(k));
      for (const [a, b] of Object.entries(vals)) u = u.split(a).join(encodeURIComponent(b));
      return u;
    };
    const peint = (a) => {
      const m = a._m; if (!m) return;
      const simple = format === "l" ? String(m.background || m.poster || "").replace("/w1280/", "/w300/") : m.poster;
      const p2 = ppSrc(m, format === "l" ? "landscape" : "poster");
      const montre = (src, repli) => { if (!src) return; const im = new Image(); im.onload = () => { a.style.backgroundImage = url(src); }; if (repli) im.onerror = () => montre(repli); im.src = src; };
      a.style.backgroundImage = ""; montre(p2 || simple, p2 ? simple : null);
    };
    // La bibliothèque : la même que dans l'aperçu de la salle 2 et les billets (gardée sur l'appareil)
    const lireListe = () => { try { return JSON.parse(lit("ma-liste") || "[]"); } catch (e) { return []; } };
    const dansListe = (m) => lireListe().some((x) => x.id === m.id);
    const basculeListe = (m) => {
      let l = lireListe();
      if (dansListe(m)) l = l.filter((x) => x.id !== m.id);
      else l.unshift({ id: m.id, type: m.type, name: m.name, poster: m.poster, background: m.background, description: m.description, releaseInfo: m.releaseInfo, genres: m.genres, imdbRating: m.imdbRating, imdb_id: m.imdb_id });
      ecrit("ma-liste", JSON.stringify(l.slice(0, 50))); dispatchEvent(new Event("ma-liste")); dessineBiblio();
    };
    const biblio = mkd("div", "r-biblio"); biblio.hidden = true;
    const grille = mkd("div", "grille"), vide = mkd("p", "vide", "Ta bibliothèque est vide. Ouvre la fiche d'un film et choisis « Ajouter à la bibliothèque ».");
    biblio.append(mkd("h3", null, "Bibliothèque"), grille, vide);
    const dessineBiblio = () => {
      grille.textContent = ""; const l = lireListe(); vide.hidden = l.length > 0;
      l.forEach((m) => { const a = mkd("div", "r-affiche"); a.title = m.name; a._m = m; a.append(mkd("span", "t", m.name)); grille.append(a); peint(a); });
    };
    // La recherche, en direct : les rangées « Films » et « Séries » du Catalogue FR,
    // telles que Nuvio les affiche (titres en français, les plus connus d'abord).
    const rech = mkd("div", "r-biblio r-rech"); rech.hidden = true;
    const champ = mkd("input"); champ.type = "search"; champ.enterKeyHint = "search"; champ.placeholder = "Un film, une série…"; champ.setAttribute("aria-label", "Rechercher un film ou une série");
    const resultats = mkd("div"), astuce = mkd("p", "vide", "Tape un titre : les résultats arrivent en français, avec la date de dispo des films à venir.");
    rech.append(mkd("h3", null, "Recherche"), champ, astuce, resultats);
    let rT = 0, rN = 0;
    const cherche = () => {
      const q = champ.value.trim(), n = ++rN; resultats.textContent = ""; astuce.hidden = q.length >= 2;
      if (q.length < 2) return;
      [["movie", "recherche-films", "Films"], ["series", "recherche-series", "Séries"]].forEach(([type, id, nom]) => {
        const r = mkd("div", "r-rangee"), piste = mkd("div", "r-piste"), etat = mkd("p", "vide", "Recherche…");
        r.append(mkd("h4", null, nom), piste, etat); resultats.append(r); glisse(piste);
        fetch(ORIG_AP + "/catalog/" + type + "/" + id + "/search=" + encodeURIComponent(q) + ".json").then((x) => x.json()).then((d) => {
          if (n !== rN) return;
          const metas = (d && d.metas) || [];
          etat.textContent = metas.length ? "" : "Aucun résultat."; etat.hidden = metas.length > 0;
          metas.slice(0, 20).forEach((m) => { const a = mkd("div", "r-affiche"); a.title = m.name; a._m = m; a.append(mkd("span", "t", m.name)); piste.append(a); peint(a); });
        }).catch(() => { if (n === rN) etat.textContent = "Recherche indisponible pour le moment."; });
      });
    };
    champ.addEventListener("input", () => { clearTimeout(rT); rT = setTimeout(cherche, 350); });
    const onglets = mkd("div", "r-onglets"), bAcc = mkd("button", null, "Accueil"), bRech = mkd("button", null, "Recherche"), bBib = mkd("button", null, "Bibliothèque");
    onglets.setAttribute("role", "group"); onglets.setAttribute("aria-label", "Écran de Nuvio");
    const vue = (v) => {
      bAcc.setAttribute("aria-pressed", String(v === "accueil")); bRech.setAttribute("aria-pressed", String(v === "rech")); bBib.setAttribute("aria-pressed", String(v === "biblio"));
      biblio.hidden = v !== "biblio"; rech.hidden = v !== "rech";
      if (v === "biblio") dessineBiblio();
      if (v === "rech" && !tactile) champ.focus();
    };
    [bAcc, bRech, bBib].forEach((b) => { b.type = "button"; }); bAcc.addEventListener("click", () => vue("accueil")); bRech.addEventListener("click", () => vue("rech")); bBib.addEventListener("click", () => vue("biblio"));
    onglets.append(bAcc, bRech, bBib); ecran.append(biblio, rech, onglets); vue("accueil");
    // La fiche d'un film : bande-annonce, ajout à la bibliothèque
    const fermeFiche = () => { const f = ecran.querySelector(".r-fiche"); if (f) { f.remove(); return true; } return false; };
    const ouvrirFiche = (m) => {
      fermeFiche();
      const f = mkd("div", "r-fiche"); f.setAttribute("role", "dialog"); f.setAttribute("aria-label", m.name);
      const fond = mkd("div", "rf-fond"); if (m.background || m.poster) fond.style.backgroundImage = url(String(m.background || m.poster).replace("/w1280/", "/w780/"));
      const aff = mkd("div", "rf-affiche"); const src = ppSrc(m, "poster") || m.poster; if (src) aff.style.backgroundImage = url(src);
      const ba = mkd("button", null, "Bande-annonce"), bi = mkd("button", null, ""); ba.type = bi.type = "button";
      const dessineBi = () => { bi.textContent = dansListe(m) ? "Retirer de la bibliothèque" : "+ Ajouter à la bibliothèque"; };
      dessineBi();
      bi.addEventListener("click", () => { basculeListe(m); dessineBi(); if (window.sfx) sfx.click(); if (dansListe(m) && window.popcorn) popcorn(bi); });
      ba.addEventListener("click", () => {
        ba.disabled = true; ba.textContent = "Chargement…";
        fetch(ORIG_AP + "/trailer/" + (m.type === "series" ? "series" : "movie") + "/" + encodeURIComponent(m.id) + ".json").then((r) => r.json()).then((d) => {
          const key = d && /^[A-Za-z0-9_-]{6,20}$/.test(d.key || "") ? d.key : null;
          if (!key) { ba.textContent = "Pas de bande-annonce"; return; }
          ba.disabled = false; ba.textContent = "Bande-annonce";
          const v = mkd("div", "rf-video"), x2 = mkd("button", "rf-fermer", "×"); x2.type = "button"; x2.setAttribute("aria-label", "Revenir à la fiche");
          const fr = document.createElement("iframe"); fr.src = "https://www.youtube-nocookie.com/embed/" + key + "?autoplay=1&playsinline=1&rel=0&modestbranding=1"; fr.title = "Bande-annonce"; fr.allow = "autoplay; encrypted-media; picture-in-picture"; fr.allowFullscreen = true;
          v.append(fr, x2); f.append(v); x2.focus(); x2.addEventListener("click", () => { v.remove(); ba.focus(); });
        }).catch(() => { ba.textContent = "Pas de bande-annonce"; });
      });
      const x = mkd("button", "rf-fermer", "×"); x.type = "button"; x.setAttribute("aria-label", "Fermer la fiche"); x.addEventListener("click", fermeFiche);
      const info = mkd("div", "rf-info");
      info.append(mkd("b", null, m.name), mkd("span", "rf-meta", [ri(m), (m.genres || []).slice(0, 3).join(", "), m.imdbRating ? "★ " + m.imdbRating : ""].filter(Boolean).join("  ·  ")),
        mkd("p", aDispo(m) ? "rf-desc a-dispo" : "rf-desc", m.description || "Pas encore de résumé en français pour ce titre."));
      const btns = mkd("div", "rf-btns"); btns.append(mkd("i", null, "▶ Lecture"), ba, bi); info.append(btns);
      const corps = mkd("div", "rf-corps"); corps.append(aff, info);
      f.append(fond, mkd("div", "rf-ombre"), x, corps); ecran.append(f); x.focus();
      if (window.sfx) sfx.click();
    };
    ecran.addEventListener("click", (e) => {
      const a = e.target.closest(".r-affiche"); if (!a || !a._m || Date.now() - aGlisse < 300) return;
      ouvrirFiche(a._m);
    });
    const toutPeindre = () => {
      [defile, biblio, rech].forEach((el) => { el.classList.toggle("paysage", format === "l"); el.classList.toggle("pp", pp && !!cle()); });
      ecran.querySelectorAll(".r-affiche").forEach(peint);
    };
    const outils = mkd("div", "r-outils"), seg = mkd("div", "seg");
    const bV = mkd("button", null, "Affiches verticales"), bP = mkd("button", null, "Paysage"), bPP = mkd("button", "pp", "Affiches PostersPlus");
    [bV, bP, bPP].forEach((b) => { b.type = "button"; });
    const boutons = () => { bV.setAttribute("aria-pressed", String(format === "p")); bP.setAttribute("aria-pressed", String(format === "l")); bPP.setAttribute("aria-pressed", String(pp && !!cle())); };
    bV.addEventListener("click", () => { format = "p"; ecrit("apercu-format", "p"); boutons(); toutPeindre(); });
    bP.addEventListener("click", () => { format = "l"; ecrit("apercu-format", "l"); boutons(); toutPeindre(); });
    const cleBox = mkd("form", "r-cle"); cleBox.hidden = true;
    cleBox.innerHTML = '<label for="r-cle-in">Ta clé TMDB (étape 5) :</label><input id="r-cle-in" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="32 caractères"><button type="submit">Valider</button><button type="button" class="coller" hidden>Coller ma clé</button><button type="button" class="aide-cle">Pas de clé ? Voir l’étape 5</button><span class="err" hidden>Une clé TMDB fait 32 caractères (chiffres et lettres de a à f).</span>';
    cleBox.addEventListener("submit", (e) => {
      e.preventDefault();
      const k = cleBox.querySelector("input").value.trim().replace(/[^A-Za-z0-9]/g, "");
      if (!/^[A-Fa-f0-9]{32}$/.test(k)) { const er = cleBox.querySelector(".err"); er.textContent = "Une clé TMDB fait 32 caractères (chiffres et lettres de a à f)."; er.hidden = false; return; }
      ecrit("tmdb-key", k); if (typeof keyInput !== "undefined") { keyInput.value = k; drawPoster(); }
      cleBox.hidden = true; pp = true; ecrit("apercu-pp", "1"); boutons(); toutPeindre();
    });
    // Montrer le champ de la clé : sur téléphone, sans focus (le clavier ne s'ouvre que si on touche le champ).
    const montreCle = () => {
      cleBox.hidden = false;
      if (tactile) cleBox.scrollIntoView({ block: "center", behavior: "smooth" }); else cleBox.querySelector("input").focus();
    };
    // « Coller ma clé » : lit le presse-papiers et valide d'un coup, sans passer par le clavier.
    if (navigator.clipboard && navigator.clipboard.readText) {
      const coller = cleBox.querySelector(".coller"); coller.hidden = false;
      coller.addEventListener("click", async () => {
        try { cleBox.querySelector("input").value = (await navigator.clipboard.readText()).trim(); } catch (e) { const er = cleBox.querySelector(".err"); er.textContent = "Le collage automatique est bloqué : touche le champ et colle ta clé."; er.hidden = false; return; }
        cleBox.requestSubmit();
      });
    }
    // « Pas de clé ? » : l'étape 5 (clé TMDB) dans une fenêtre, sans quitter l'aperçu.
    cleBox.querySelector(".aide-cle").addEventListener("click", () => {
      const pop = mkd("div", "pop-etape"); pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Étape 5 : la clé TMDB");
      const boite = mkd("div", "boite"), x = mkd("button", "fermer", "×"); x.type = "button"; x.setAttribute("aria-label", "Fermer");
      const titre = document.getElementById("cle-tmdb");
      let etapes = titre && titre.nextElementSibling ? titre.nextElementSibling.cloneNode(true) : null;
      if (!etapes) { etapes = document.createElement("ol"); etapes.innerHTML = ETAPE5_AP; }
      boite.append(x, mkd("h2", null, "Étape 5 · La clé TMDB (gratuite)"));
      if (etapes) boite.append(etapes);
      boite.append(mkd("p", "small", "Elle reste sur ton appareil : elle sert seulement à demander les affiches."));
      const ok = mkd("button", "ok", "J'ai ma clé, je la colle"); ok.type = "button"; boite.append(ok);
      pop.append(boite); document.body.append(pop); x.focus();
      const ferme = () => { pop.remove(); montreCle(); };
      x.addEventListener("click", ferme); ok.addEventListener("click", ferme);
      pop.addEventListener("click", (e) => { if (e.target === pop) ferme(); });
      pop.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); ferme(); } });
    });
    bPP.addEventListener("click", () => {
      if (pp && cle()) { pp = false; ecrit("apercu-pp", "0"); boutons(); toutPeindre(); return; }
      if (!cle()) { montreCle(); return; }
      pp = true; ecrit("apercu-pp", "1"); boutons(); toutPeindre();
    });
    seg.append(bV, bP); outils.append(seg, bPP); boutons(); toutPeindre();
    ov.append(fermer, tv, outils, cleBox, legende); document.body.append(ov); fermer.focus(); ouvert = ov;
    const close = () => { ov.remove(); ouvert = null; };
    fermer.addEventListener("click", close);
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    ov.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!fermeFiche()) close(); } });
    if (window.sfx) sfx.whoosh();
    const rangeeTuiles = (titre, dossiers) => {
      const r = mkd("section", "r-rangee"), piste = mkd("div", "r-piste");
      dossiers.forEach((f) => { const t = mkd("div", "r-tuile"); t.title = f.title || ""; if (f.coverImageUrl) t.style.backgroundImage = url(f.coverImageUrl); piste.append(t); });
      r.append(mkd("h4", null, titre), piste); glisse(piste); return r;
    };
    try {
      const [manifest, colls] = await Promise.all([fetch(ORIG_AP + "/manifest.json").then((r) => r.json()), fetch(ORIG_AP + "/collections.json").then((r) => r.json()).catch(() => [])]);
      const collections = Array.isArray(colls) ? colls : (colls.collections || []);
      const plateformes = collections.find((c) => c.id === "plateformes-streaming");
      if (plateformes) defile.append(rangeeTuiles(plateformes.title, plateformes.folders || []));
      const accueil = (manifest.catalogs || []).filter((c) => c.showInHome !== false && String(c.id).startsWith("accueil-"));
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); e.target._charge(); } }), { root: defile, rootMargin: "200px 0px" });
      accueil.forEach((c, i) => {
        const r = mkd("section", "r-rangee"), piste = mkd("div", "r-piste");
        for (let k = 0; k < 10; k++) piste.append(mkd("div", "r-affiche"));
        r.append(mkd("h4", null, c.name), piste); defile.append(r); glisse(piste);
        r._charge = () => fetch(ORIG_AP + "/catalog/" + c.type + "/" + c.id + ".json").then((x) => x.json()).then((d) => {
          const metas = (d.metas || []).filter((m) => m.poster);
          piste.textContent = "";
          metas.slice(0, 20).forEach((m) => { const a = mkd("div", "r-affiche"); a.title = m.name; a._m = m; a.append(mkd("span", "t", m.name)); piste.append(a); peint(a); });
          if (i === 0) {
            const une = metas.filter((m) => m.background).slice(0, 5); let n = 0;
            const montre = () => {
              const m = une[n % une.length]; if (!m || !ov.isConnected) return;
              hero.style.backgroundImage = url(m.background.replace("/w1280/", "/w780/"));
              info.textContent = "";
              info.append(mkd("b", null, m.name), mkd("span", null, [ri(m), (m.genres || []).slice(0, 2).join(", "), m.imdbRating ? "★ " + m.imdbRating : ""].filter(Boolean).join("  ·  ")), mkd("p", aDispo(m) ? "a-dispo" : null, m.description || ""), mkd("i", null, "▶ Lecture"));
              n++;
            };
            montre(); const t = setInterval(() => { if (!ov.isConnected) clearInterval(t); else montre(); }, 6000);
          }
        }).catch(() => {});
        if (i === 0) r._charge(); else io.observe(r);
      });
      collections.filter((c) => c.id !== "plateformes-streaming").forEach((c) => defile.append(rangeeTuiles(c.title, c.folders || [])));
    } catch (e) {
      info.textContent = ""; info.append(mkd("b", null, "Aperçu indisponible"), mkd("p", null, "Vérifie ta connexion et réessaie."));
    }
  };
  document.querySelectorAll("[data-resultat]").forEach((b) => b.addEventListener("click", ouvrir));
  // Arrivée depuis le hall avec « #apercu » : on ouvre directement l'aperçu.
  if (location.hash === "#apercu") { history.replaceState(null, "", location.pathname); setTimeout(ouvrir, 400); }
})();
`;
