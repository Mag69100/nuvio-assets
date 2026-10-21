/**
 * La galerie des styles d'affiches (régie de la salle 2) : chacun publie le style de sa régie, tout le monde peut
 * l'essayer d'un clic. On ne publie que le code du style (le paramètre s du lien d'affiches, et sp pour un paysage
 * réglé à part) : aucun texte, aucun nom, rien à modérer. Chaque style se montre en une affiche du même film (Inception,
 * en portrait), dessinée par le service d'affiches et relayée par /affiche/… comme les aperçus de la régie.
 *
 * Base D1 des liens fixes (LIENS), table galerie créée à la première publication : code (unique, sous forme canonique :
 * deux réglages identiques ne font qu'un style), n (nombre d'imports), t (date de publication). Sans base, pas de
 * galerie (le bouton dit pourquoi). Publications limitées par adresse IP (liaison LIMITE_GALERIE, facultative) et
 * réservées aux pages du site (en-tête Origin) ; 5 000 styles au plus.
 *
 *   GET  /galerie/styles.json?tri=populaires|nouveaux&page=1  → { styles: [{ code, n, t }], page, suivante }
 *   POST /galerie/publier   { code }  → { ok, nouveau } ou { ok, deja, n }
 *   POST /galerie/importer  { code }  → { ok }   (compte un import ; la page ne le fait qu'une fois par style)
 */
import { lireReglages, ecrireReglages, MEMOIRES } from "./lien-affiches.js";

export const PAR_PAGE = 24;
const MAX_PAGES = 50;
const MAX_STYLES = 5000;
const CACHE_S = 60;                         // une page de la galerie : 1 min (cache Cloudflare et navigateur)
const PARTIE = /^[0-9A-Za-z]{0,400}$/;
const cacheKey = (tri, page) => new Request(`https://cache.local/galerie/${tri}/${page}`);

const canonique = (s) => ecrireReglages(lireReglages(new URLSearchParams({ s: "1." + s })));

/**
 * Un code de style : « s » ou « s_sp » (portrait, puis paysage réglé à part), tel que la régie l'écrit.
 * → { code } s'il est valide et sous forme canonique, sinon { erreur }.
 */
export function lireCode(code) {
  if (typeof code !== "string" || code.length > 810) return { erreur: "Style illisible." };
  const parts = code.split("_");
  if (parts.length > 2 || !parts.every((p) => PARTIE.test(p))) return { erreur: "Style illisible." };
  const [s, sp] = parts;
  if (canonique(s) !== s || (sp !== undefined && (canonique(sp) !== sp || sp === s))) return { erreur: "Style illisible : recharge la page et réessaie." };
  if (sp === undefined && Object.values(MEMOIRES).some((m) => ecrireReglages(m) === s)) {
    return { erreur: "C'est un style tout prêt de la régie : change un réglage pour en faire le tien." };
  }
  return { code };
}

let ready = null;
const table = (env) => (ready = ready || env.LIENS.batch([
  env.LIENS.prepare("CREATE TABLE IF NOT EXISTS galerie (code TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0, t INTEGER NOT NULL)"),
  env.LIENS.prepare("CREATE INDEX IF NOT EXISTS galerie_n ON galerie (n DESC, t DESC)"),
  env.LIENS.prepare("CREATE INDEX IF NOT EXISTS galerie_t ON galerie (t DESC)"),
]).catch((e) => { ready = null; throw e; }));
const noTable = (e) => /no such table/i.test(String((e && e.message) || e));

export async function galerieRoute(request, env, url, path) {
  const reply = (body, status = 200, cc = "no-store") => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cc } });
  if (!env.LIENS) return reply({ error: "La galerie n'est pas disponible sur ce site." }, 501);

  if (path === "/galerie/styles.json") {
    if (request.method !== "GET") return reply({ error: "Méthode non prise en charge." }, 405);
    const tri = url.searchParams.get("tri") === "nouveaux" ? "nouveaux" : "populaires";
    const page = Math.min(MAX_PAGES, Math.max(1, parseInt(url.searchParams.get("page"), 10) || 1));
    const hit = await caches.default.match(cacheKey(tri, page)).catch(() => null);
    if (hit) return new Response(hit.body, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${CACHE_S}` } });
    let lus = [];
    try {
      const ordre = tri === "nouveaux" ? "t DESC" : "n DESC, t DESC";
      // Un de plus que la page : dit s'il y a une page suivante.
      const r = await env.LIENS.prepare(`SELECT code, n, t FROM galerie ORDER BY ${ordre} LIMIT ? OFFSET ?`).bind(PAR_PAGE + 1, (page - 1) * PAR_PAGE).all();
      lus = (r && r.results) || [];
    } catch (e) {
      if (!noTable(e)) { console.warn("galerie :", String(e)); return reply({ error: "Galerie injoignable pour le moment : réessaie dans quelques minutes." }, 503); }
    }
    const out = reply({ styles: lus.slice(0, PAR_PAGE).map(({ code, n, t }) => ({ code, n, t })), page, suivante: lus.length > PAR_PAGE }, 200, `public, max-age=${CACHE_S}`);
    await caches.default.put(cacheKey(tri, page), out.clone()).catch(() => {});
    return out;
  }

  if (path !== "/galerie/publier" && path !== "/galerie/importer") return reply({ error: "introuvable" }, 404);
  if (request.method !== "POST") return reply({ error: "Méthode non prise en charge." }, 405);
  // Seulement depuis une page du site (un script ou un robot n'envoie pas cet en-tête de lui-même).
  if (request.headers.get("origin") !== url.origin) return reply({ error: "interdit" }, 403);
  const publier = path === "/galerie/publier";
  // Limite par adresse IP (liaison LIMITE_GALERIE de wrangler.toml, facultative : sans elle, pas de limite).
  if (env.LIMITE_GALERIE) {
    const ip = request.headers.get("cf-connecting-ip") || "?";
    const { success } = await env.LIMITE_GALERIE.limit({ key: (publier ? "publier:" : "importer:") + ip }).catch(() => ({ success: true }));
    if (!success) return reply({ error: "Doucement : réessaie dans une minute." }, 429);
  }
  let body;
  try { body = await request.json(); } catch (e) { return reply({ error: "Demande illisible." }, 400); }
  const { code, erreur } = lireCode(body && body.code);
  if (erreur) return reply({ error: erreur }, 400);
  try {
    if (!publier) {
      await env.LIENS.prepare("UPDATE galerie SET n = n + 1 WHERE code = ?").bind(code).run();
      return reply({ ok: true });
    }
    const publie = async () => {
      await table(env);
      const deja = await env.LIENS.prepare("SELECT n FROM galerie WHERE code = ?").bind(code).first();
      if (deja) return reply({ ok: true, deja: true, n: deja.n });
      const total = await env.LIENS.prepare("SELECT COUNT(*) AS c FROM galerie").first();
      if (total && total.c >= MAX_STYLES) return reply({ error: "La galerie est pleine pour le moment : réessaie plus tard." }, 507);
      await env.LIENS.prepare("INSERT OR IGNORE INTO galerie (code, n, t) VALUES (?, 0, ?)").bind(code, Date.now()).run();
      // Ce centre de Cloudflare montre tout de suite le nouveau style en tête des « Nouveaux » ; les autres d'ici 1 min.
      await caches.default.delete(cacheKey("nouveaux", 1)).catch(() => {});
      return reply({ ok: true, nouveau: true });
    };
    // Table disparue depuis sa création dans cette instance (base refaite) : recréée une fois.
    return await publie().catch((e) => { if (!noTable(e)) throw e; ready = null; return publie(); });
  } catch (e) {
    if (!publier && noTable(e)) return reply({ error: "Style inconnu." }, 404);
    console.warn("galerie :", String(e));
    return reply({ error: "Galerie injoignable pour le moment : réessaie dans quelques minutes." }, 503);
  }
}

// Le film de toutes les vignettes : un seul, toujours le même (un dessin par style, gardé par le cache).
export const FILM_GALERIE = { id: "tt1375666", type: "movie", name: "Inception" };

export const GALERIE_BOUTON = `<button type="button" class="mini" id="regie-galerie-btn" aria-expanded="false" aria-controls="regie-galerie">Galerie</button>`;

export const GALERIE_HTML = `
      <section class="regie-galerie" id="regie-galerie" aria-labelledby="galerie-titre" hidden>
        <div class="galerie-tete">
          <div>
            <h3 id="galerie-titre" tabindex="-1">La galerie des styles</h3>
            <p>Les styles des autres spectateurs, tous sur le même film. Clique pour l'essayer dans ta régie : « ↶ Annuler » pour revenir au tien.</p>
          </div>
          <div class="galerie-moi">
            <span class="galerie-moi-cadre" id="galerie-moi-cadre" aria-hidden="true"></span>
            <div>
              <b>Ton style</b>
              <p id="galerie-moi-txt">Seul le style part : aucun nom, aucun texte.</p>
              <button type="button" class="btn solid" id="galerie-publier">Publier mon style</button>
            </div>
          </div>
        </div>
        <div class="regie-onglets galerie-tri" role="tablist" aria-label="Ordre de la galerie">
          <button type="button" role="tab" id="galerie-tri-populaires" data-tri="populaires" aria-selected="true" aria-controls="galerie-grille">Populaires</button><button type="button" role="tab" id="galerie-tri-nouveaux" data-tri="nouveaux" aria-selected="false" aria-controls="galerie-grille" tabindex="-1">Nouveaux</button>
        </div>
        <ul class="galerie-grille" id="galerie-grille" role="tabpanel" aria-labelledby="galerie-tri-populaires" aria-busy="false"></ul>
        <p class="galerie-msg" id="galerie-msg" role="status"></p>
        <div class="galerie-pages">
          <button type="button" class="mini" id="galerie-prec">← Précédents</button>
          <span id="galerie-page"></span>
          <button type="button" class="mini" id="galerie-suiv">Suivants →</button>
        </div>
      </section>`;

export const GALERIE_CSS = `/* ---------- La galerie des styles d'affiches (worker/galerie.js), à la place de la scène et de la console ---------- */
.regie-galerie { min-height: 0; overflow: auto; display: grid; align-content: start; gap: 14px; padding: 16px 20px 20px;
  background: radial-gradient(ellipse 60% 40% at 50% 0, rgba(255,236,190,.1), transparent 70%), #0d0a0c; }
.regie-galerie[hidden] { display: none; }
.galerie-tete { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px 24px; flex-wrap: wrap; }
.galerie-tete > div:first-child { flex: 1 1 320px; }
.galerie-tete h3 { margin: 0 0 6px; font: 400 1.9rem/1 var(--display); letter-spacing: .04em; color: var(--bulb); }
.galerie-tete h3:focus { outline: none; }
.galerie-tete p { margin: 0; color: #cdb8ad; font: 400 1.02rem/1.4 var(--serif); max-width: 56ch; }
.galerie-moi { display: flex; gap: 12px; align-items: center; padding: 10px 12px; border-radius: 12px; border: 1px dashed rgba(255,207,107,.4); background: rgba(255,207,107,.05); }
.galerie-moi-cadre { width: 66px; aspect-ratio: 2 / 3; flex: none; border-radius: 6px; overflow: hidden; background: #1b1418; }
.galerie-moi-cadre img { display: block; width: 100%; height: 100%; object-fit: cover; }
.galerie-moi > div { display: grid; gap: 4px; max-width: 250px; }
.galerie-moi b { font: 400 1.2rem/1 var(--display); letter-spacing: .04em; color: var(--cream); }
.galerie-moi p { font: 600 .76rem/1.35 var(--body); color: var(--dim); }
.galerie-moi .btn { justify-self: start; padding: 8px 12px; font-size: .82rem; border-color: var(--bulb); background: var(--bulb); color: var(--ink); }
.galerie-moi .btn:hover { background: #fff1c9; border-color: #fff1c9; }
.galerie-moi .btn:disabled { opacity: .45; cursor: not-allowed; }
.galerie-tri { max-width: 320px; }
.galerie-grille { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 14px; }
.galerie-grille[aria-busy="true"] { opacity: .5; }
.galerie-style { position: relative; display: grid; gap: 6px; width: 100%; padding: 4px; border-radius: 10px; border: 1.5px solid transparent; background: none; color: var(--dim); cursor: pointer; text-align: center; font: 600 .74rem var(--body); }
.galerie-style img { display: block; width: 100%; aspect-ratio: 2 / 3; height: auto; object-fit: cover; border-radius: 7px; background: linear-gradient(135deg, #1b1418, #2a2126); box-shadow: 0 8px 20px rgba(0,0,0,.45); transition: transform .2s ease; }
.galerie-style:hover img, .galerie-style:focus-visible img { transform: translateY(-3px); }
.galerie-style:hover { border-color: #5a4a53; color: var(--cream); }
.galerie-style:focus-visible { outline: 3px solid var(--bulb); outline-offset: 2px; }
.galerie-style.actuel { border-color: var(--bulb); color: var(--bulb); }
.galerie-style .le-tien { position: absolute; top: 10px; left: 10px; padding: 2px 6px; border-radius: 4px; background: var(--bulb); color: var(--ink); font: 800 .6rem var(--body); letter-spacing: .1em; text-transform: uppercase; }
.galerie-msg { margin: 0; color: var(--dim); font-size: .9rem; }
.galerie-msg:empty { display: none; }
.galerie-msg.erreur { color: #ff8a8a; }
.galerie-pages { display: flex; justify-content: center; align-items: center; gap: 14px; }
.galerie-pages span { font: 700 .8rem var(--type); color: var(--dim); }
.galerie-pages .mini:disabled { opacity: .35; cursor: default; }
#regie-galerie-btn[aria-expanded="true"] { background: var(--bulb); border-color: var(--bulb); color: var(--ink); }
@media (max-width: 760px) {
  .regie-galerie { padding: 14px 12px 20px; }
  .galerie-grille { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .galerie-moi { width: 100%; }
}
@media (min-width: 1700px) { .galerie-grille { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .galerie-style img { transition: none; } .galerie-style:hover img, .galerie-style:focus-visible img { transform: none; } }
`;

export const GALERIE_JS = `// ---------- La galerie des styles d'affiches (worker/galerie.js) : essayer, publier ----------
{
  const FILM = ${JSON.stringify(FILM_GALERIE)};
  const IMPORTES = "galerie-importes";
  let tri = "populaires", page = 1, ouverte = false, demande = 0;
  const msg = (texte, erreur) => { $("galerie-msg").textContent = texte || ""; $("galerie-msg").classList.toggle("erreur", !!erreur); };
  // Le code du style de la régie : le portrait, et le paysage s'il est réglé à part (le même format que le lien).
  const codeDe = (r, rp) => { const s = LA.ecrireReglages(r); if (!rp) return s; const sp = LA.ecrireReglages(rp); return sp === s ? s : s + "_" + sp; };
  const reglagesDe = (code) => {
    const [s, sp] = String(code).split("_"), lit = (x) => LA.lireReglages(new URLSearchParams({ s: "1." + x }));
    return { r: lit(s), rp: sp === undefined ? null : lit(sp) };
  };
  const vignette = (code) => NV.ppSrc(FILM, "poster", reglagesDe(code).r);
  const appel = (chemin, corps) => fetch(D.origin + chemin, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });

  function ouvre(oui) {
    ouverte = oui;
    $("regie-galerie").hidden = !oui;
    document.querySelector(".regie-corps").hidden = oui;
    $("regie-galerie-btn").setAttribute("aria-expanded", String(oui));
    if (oui) {
      // Les petits panneaux de la barre (importer un lien, QR code) se referment.
      $("regie-import").hidden = true; $("regie-importer").setAttribute("aria-expanded", "false");
      $("regie-qr").hidden = true; $("regie-qr-btn").setAttribute("aria-expanded", "false");
      moi(); charge(); $("galerie-titre").focus();
    } else $("regie-galerie-btn").focus();
  }
  // Ton style : sa vignette, et « Publier » seulement s'il n'est pas un style tout prêt de la régie.
  function moi() {
    const code = codeDe(regieR, regieRP), pret = !regieRP && !!LA.memoireDe(regieR);
    const cadre = $("galerie-moi-cadre"), src = vignette(code);
    const img = cadre.querySelector("img") || cadre.appendChild(el("img", { alt: "" }));
    if (src && img.dataset.src !== src) { img.dataset.src = src; img.src = src; }
    $("galerie-publier").disabled = pret;
    $("galerie-moi-txt").textContent = pret ? "C'est un style tout prêt de la régie : change un réglage pour en faire le tien." : "Seul le style part : aucun nom, aucun texte.";
  }
  // frais : redemandée au site (juste après une publication), en gardant le message de la publication.
  async function charge(frais) {
    const n = ++demande, grille = $("galerie-grille");
    grille.setAttribute("aria-busy", "true");
    document.querySelectorAll(".galerie-tri [data-tri]").forEach((b) => { const on = b.dataset.tri === tri; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    grille.setAttribute("aria-labelledby", "galerie-tri-" + tri);
    let j = null, erreur = "";
    try {
      const r = await fetch(D.origin + "/galerie/styles.json?tri=" + tri + "&page=" + page, frais ? { cache: "no-cache" } : {});
      j = await r.json().catch(() => null);
      if (!r.ok || !j || !Array.isArray(j.styles)) erreur = (j && j.error) || "La galerie ne répond pas : réessaie dans un instant.";
    } catch (e) { erreur = "La galerie ne répond pas : vérifie ta connexion."; }
    if (n !== demande) return;
    grille.setAttribute("aria-busy", "false");
    grille.textContent = "";
    if (erreur) { msg(erreur, true); $("galerie-prec").disabled = $("galerie-suiv").disabled = true; $("galerie-page").textContent = ""; return; }
    const actuel = codeDe(regieR, regieRP);
    j.styles.forEach((s) => {
      const fois = s.n === 1 ? "essayé 1 fois" : s.n ? "essayé " + s.n + " fois" : "tout nouveau";
      const img = el("img", { alt: "", loading: "lazy", decoding: "async", width: "118", height: "177" });
      const src = vignette(s.code); if (src) img.src = src;
      const b = el("button", { type: "button", class: "galerie-style" + (s.code === actuel ? " actuel" : ""), "aria-label": "Essayer ce style (" + fois + ")" + (s.code === actuel ? ", c'est le tien" : ""), onclick: () => essaie(s.code) },
        img, s.code === actuel ? el("span", { class: "le-tien", "aria-hidden": "true", text: "Le tien" }) : null, el("span", { text: fois }));
      grille.append(el("li", {}, b));
    });
    if (!frais) msg(j.styles.length ? "" : page > 1 ? "Plus rien par ici." : "La galerie est encore vide : publie le premier style !");
    $("galerie-prec").disabled = page <= 1;
    $("galerie-suiv").disabled = !j.suivante;
    $("galerie-page").textContent = "Page " + page;
  }
  // Essayer un style : il remplace celui de la régie (« ↶ Annuler » revient en arrière), compté une fois par navigateur.
  function essaie(code) {
    const lu = reglagesDe(code);
    regieChange(() => { regieR = lu.r; regieRP = lu.rp; });
    ouvre(false);
    effet("toast", "Style essayé : « ↶ Annuler » pour revenir au tien.");
    let deja = [];
    try { deja = JSON.parse(localStorage.getItem(IMPORTES) || "[]"); if (!Array.isArray(deja)) deja = []; } catch (e) { deja = []; }
    if (deja.includes(code)) return;
    try { localStorage.setItem(IMPORTES, JSON.stringify([...deja, code].slice(-200))); } catch (e) {}
    appel("/galerie/importer", { code }).catch(() => {});
  }
  $("galerie-publier").addEventListener("click", async (e) => {
    const btn = e.currentTarget, label = btn.textContent;
    btn.disabled = true; btn.textContent = "Publication…";
    try {
      const r = await appel("/galerie/publier", { code: codeDe(regieR, regieRP) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Publication impossible : réessaie dans un instant.");
      if (j.deja) msg("Ce style est déjà dans la galerie" + (j.n ? " (essayé " + j.n + " fois)." : "."));
      else { msg("Publié ✓ Ton style est en tête des « Nouveaux »."); effet("popcorn", btn); bruit("punch"); tri = "nouveaux"; page = 1; charge(true); }
    } catch (err) {
      msg(err && err.message && !/fetch|network/i.test(err.message) ? err.message : "Publication impossible : vérifie ta connexion.", true);
    }
    btn.textContent = label; btn.disabled = false; moi();
  });
  $("regie-galerie-btn").addEventListener("click", () => ouvre(!ouverte));
  $("galerie-prec").addEventListener("click", () => { if (page > 1) { page--; charge(); } });
  $("galerie-suiv").addEventListener("click", () => { page++; charge(); });
  // Onglets Populaires / Nouveaux : clic, flèches gauche et droite (rôle tablist).
  const onglets = [...document.querySelectorAll(".galerie-tri [data-tri]")];
  onglets.forEach((b, i) => {
    b.addEventListener("click", () => { if (tri !== b.dataset.tri) { tri = b.dataset.tri; page = 1; charge(); } });
    b.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const autre = onglets[(i + 1) % onglets.length];
      autre.focus(); autre.click();
    });
  });
  // Échap referme d'abord la galerie (avant la régie elle-même).
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !ouverte || $("regie").hidden) return;
    e.stopPropagation(); e.preventDefault(); ouvre(false);
  }, true);
  // La régie refermée (✕, clic à côté, Échap), la galerie l'est aussi : elle rouvrira sur la scène.
  new MutationObserver(() => { if ($("regie").hidden && ouverte) { ouverte = false; $("regie-galerie").hidden = true; document.querySelector(".regie-corps").hidden = false; $("regie-galerie-btn").setAttribute("aria-expanded", "false"); } })
    .observe($("regie"), { attributes: true, attributeFilter: ["hidden"] });
}
`;
