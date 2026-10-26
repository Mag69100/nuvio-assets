/**
 * Page « Connecter Nuvio » (servie sur /compte-nuvio), à l'essai : les collections arrivent dans Nuvio sans rien
 * coller. La page se connecte au compte Nuvio de la personne comme une TV (code à approuver sur nuvio.tv/link),
 * puis écrit les collections de son lien dans ce compte ; Nuvio les reprend tout seul (synchronisation du compte).
 * Tout se passe dans le navigateur : la session Nuvio n'est jamais envoyée à ce site, ni gardée dans sa base.
 * Le serveur de Nuvio publie son adresse et sa clé publique (/.well-known/nuvio) et accepte les appels des pages
 * web (CORS ouvert). Fonctions appelées, celles de l'appli NuvioTV (AuthManager, CollectionSyncService) :
 * start_device_login_session, poll_tv_login_session, tv-logins-exchange, sync_pull_profiles, sync_pull_collections,
 * sync_push_collections. Porte non officielle : une mise à jour de Nuvio peut la changer, l'import du JSON reste.
 */
import { feuilles, scripts } from "./statique.js";

export const NUVIO_DECOUVERTE = "https://api.nuvio.tv/.well-known/nuvio";
export const NUVIO_LIEN = "https://nuvio.tv/link";   // page où l'on approuve un appareil (DEVICE_LOGIN_WEB_BASE_URL)

/**
 * Les collections du compte, avec les nôtres à la place des anciennes : Nuvio remplace toute sa liste par celle du
 * compte, il faut donc garder celles que la personne a faites elle-même. Les nôtres (ids de `nosIds`, toutes celles
 * que le site peut fournir, même masquées depuis) sont retirées, puis celles du lien passent devant, dans leur ordre.
 */
export function fusionCollections(distantes, nos, nosIds) {
  const ids = new Set([...nosIds, ...nos.map((c) => c.id)]);
  return [...nos, ...(Array.isArray(distantes) ? distantes : []).filter((c) => !(c && ids.has(c.id)))];
}

export function compteNuvioPage({ origin }) {
  const LOGO = origin + "/logo.png";
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Connecter Nuvio · Nuvio en français</title>
<meta name="robots" content="noindex">
<link rel="icon" href="${LOGO}">
${feuilles("polices.css")}
<style>
:root { --velvet: #170c12; --velvet-2: #22121b; --seat: #3d2230; --cream: #f5ead8; --dim: #b9a59c; --bulb: #ffcf6b; --ink: #2a1a14; color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; color: var(--cream); font: 16px/1.5 "Figtree", system-ui, sans-serif;
  background: radial-gradient(ellipse 90% 40% at 50% -5%, rgba(229,65,58,.25), transparent 70%), var(--velvet);
  padding: max(24px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
main { max-width: 560px; margin: 0 auto; display: grid; gap: 16px; }
.ticket { display: grid; gap: 4px; padding: 16px 18px; border-radius: 14px; background: var(--cream); color: var(--ink); }
.ticket small { font: 800 .72rem "Figtree"; letter-spacing: .16em; text-transform: uppercase; color: #7a5a4c; }
h1 { margin: 0; font: 400 2rem/1 "Bebas Neue", Impact, sans-serif; letter-spacing: .03em; }
.bloc { display: grid; gap: 10px; padding: 16px; border-radius: 14px; border: 1px solid var(--seat); background: var(--velvet-2); }
.bloc[hidden] { display: none; }
label { font-weight: 800; }
input, select { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--seat); background: #0f080c; color: var(--cream); font: .9rem "Figtree", system-ui, sans-serif; }
button { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--seat); background: var(--velvet-2); color: var(--cream); font: 800 1rem "Figtree", system-ui, sans-serif; cursor: pointer; }
button.principal { background: var(--bulb); border-color: var(--bulb); color: var(--ink); }
button:disabled { opacity: .5; cursor: default; }
.code { margin: 0; text-align: center; font: 400 2.6rem/1 "Bebas Neue", Impact, sans-serif; letter-spacing: .18em; color: var(--bulb); }
.qr { width: 200px; margin: 0 auto; }
.qr svg { display: block; width: 100%; height: auto; border-radius: 8px; }
.aide { margin: 0; font-size: .9rem; color: var(--dim); }
.aide a, .bloc a { color: var(--bulb); }
.etat { min-height: 1.4em; margin: 0; font-weight: 800; color: var(--bulb); text-align: center; }
/* Les erreurs : le même encadré rouge que sur le reste du site. */
.erreur { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; border: 1.5px solid #e5413a; background: #3b1216; color: #ffe1d8; font-weight: 600; text-align: left; box-shadow: 0 0 0 3px rgba(229,65,58,.15); }
.erreur::before { content: "!"; flex: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: #e5413a; color: #fff; font: 800 .85rem/1 "Figtree", system-ui, sans-serif; }
a, button { touch-action: manipulation; }
</style>
</head>
<body>
<main>
  <div class="ticket"><small>À l'essai</small><h1>Connecter Nuvio</h1></div>
  <p class="aide">Tes collections arrivent dans Nuvio toutes seules, sur tous tes appareils connectés au même compte Nuvio : plus rien à coller. Ton compte Nuvio reste dans ce navigateur, ce site ne le voit jamais.</p>
  <section class="bloc" id="b-lien">
    <label for="lien">Ton lien d'addon</label>
    <input id="lien" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="${origin}/…/manifest.json">
    <p class="aide">Celui de ton billet : les collections suivront ses réglages (pays, genres, tuiles).</p>
  </section>
  <section class="bloc" id="b-connexion">
    <button type="button" class="principal" id="connecter">Connecter mon compte Nuvio</button>
    <p class="aide">Il te faut un compte Nuvio (gratuit), connecté dans l'appli.</p>
  </section>
  <section class="bloc" id="b-code" hidden>
    <p class="aide">Sur ton téléphone, scanne le QR code, ou ouvre <a id="ouvrir" target="_blank" rel="noopener">nuvio.tv/link</a> et tape ce code. Connecte-toi à ton compte Nuvio si on te le demande, puis approuve.</p>
    <p class="code" id="code"></p>
    <div class="qr" id="qr"></div>
    <button type="button" id="annuler">Annuler</button>
  </section>
  <section class="bloc" id="b-compte" hidden>
    <label for="profil">Profil Nuvio</label>
    <select id="profil"></select>
    <button type="button" class="principal" id="envoyer">Envoyer mes collections</button>
    <p class="aide">Les collections que tu as faites toi-même dans Nuvio restent. Les nôtres sont remplacées par celles de ton lien.</p>
    <button type="button" id="deconnecter">Déconnecter Nuvio</button>
  </section>
  <p class="etat" id="etat" role="status"></p>
  <p class="aide"><a href="${origin}/guide">Retour au guide</a></p>
</main>
${scripts("outils.js")}
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const etat = (t, err) => { $("etat").textContent = t; $("etat").className = "etat" + (err ? " erreur" : ""); };
  const CLE = "compte-nuvio";
  const lire = () => { try { return JSON.parse(localStorage.getItem(CLE) || "{}"); } catch (e) { return {}; } };
  const garder = (o) => { try { localStorage.setItem(CLE, JSON.stringify(o)); } catch (e) {} };
  let memo = lire(), serveur = null, attente = null;
  const fusion = ${fusionCollections.toString()};

  // Le lien d'addon : dans l'ancre (#lien=…), sinon le dernier utilisé ici.
  const p = new URLSearchParams(location.hash.slice(1));
  $("lien").value = p.get("lien") || memo.lien || "";
  const collectionsDu = (lien) => {
    const u = new URL(lien.trim());
    if (u.origin !== location.origin) throw new Error("Ce n'est pas un lien de ce site.");
    return u.origin + u.pathname.replace(/[/](manifest[.]json|configure)?$/, "") + "/collections.json";
  };

  // Le serveur de Nuvio, tel qu'il se décrit lui-même (adresse et clé publique).
  const decouvrir = async () => {
    if (serveur) return serveur;
    const d = await fetch(${JSON.stringify(NUVIO_DECOUVERTE)}).then((r) => r.json());
    if (!d.backend_url || !d.publishable_key) throw new Error("Nuvio ne répond pas comme prévu.");
    return (serveur = { url: d.backend_url.replace(/[/]$/, ""), cle: d.publishable_key });
  };
  const appel = async (chemin, corps, jeton) => {
    const s = await decouvrir();
    const h = { apikey: s.cle, "Content-Type": "application/json", Accept: "application/json" };
    if (jeton) h.Authorization = "Bearer " + jeton;
    const r = await fetch(s.url + chemin, { method: "POST", headers: h, body: JSON.stringify(corps || {}) });
    const t = await r.text();
    let d = null; try { d = t ? JSON.parse(t) : null; } catch (e) {}
    if (!r.ok) { const err = new Error((d && (d.message || d.error_description || d.error)) || ("Nuvio a répondu " + r.status)); err.status = r.status; throw err; }
    return d;
  };
  // Appel avec la session ; jeton expiré : on le renouvelle une fois (refresh_token), comme l'appli.
  const appelCompte = async (rpc, corps) => {
    try { return await appel("/rest/v1/rpc/" + rpc, corps, memo.acces); }
    catch (e) {
      if (e.status !== 401 || !memo.renouv) throw e;
      const t = await appel("/auth/v1/token?grant_type=refresh_token", { refresh_token: memo.renouv });
      memo.acces = t.access_token; memo.renouv = t.refresh_token || memo.renouv; garder(memo);
      return appel("/rest/v1/rpc/" + rpc, corps, memo.acces);
    }
  };
  const hasard = () => { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, (x) => x.toString(16).padStart(2, "0")).join(""); };

  const montrer = (quoi) => { $("b-connexion").hidden = quoi !== "connexion"; $("b-code").hidden = quoi !== "code"; $("b-compte").hidden = quoi !== "compte"; };
  const profils = async () => {
    const liste = await appelCompte("sync_pull_profiles").catch(() => null);
    const sel = $("profil"); sel.textContent = "";
    const rangs = Array.isArray(liste) && liste.length ? liste : [{ profile_index: 1, name: "Profil principal" }];
    for (const pr of rangs.sort((a, b) => a.profile_index - b.profile_index)) {
      const o = document.createElement("option"); o.value = pr.profile_index; o.textContent = pr.name || ("Profil " + pr.profile_index);
      if (String(pr.profile_index) === String(memo.profil || 1)) o.selected = true;
      sel.append(o);
    }
  };
  const connecte = async () => { montrer("compte"); await profils(); etat("Compte Nuvio connecté."); };

  // Connexion « comme une TV » : un code, approuvé par la personne sur nuvio.tv/link.
  $("connecter").addEventListener("click", async () => {
    $("connecter").disabled = true; etat("");
    try {
      const nonce = hasard();
      const r = await appel("/rest/v1/rpc/start_device_login_session", { p_device_nonce: nonce, p_redirect_base_url: ${JSON.stringify(NUVIO_LIEN)}, p_device_type: "tv", p_device_name: "Nuvio en français (site)" });
      const s = Array.isArray(r) ? r[0] : r;
      $("code").textContent = s.user_code; $("ouvrir").href = s.verification_uri_complete;
      chargerQr().then((qrcode) => { $("qr").innerHTML = qrSvg(qrcode, s.verification_uri_complete, "QR code de connexion à Nuvio", true); }, () => {});
      montrer("code");
      const fin = Date.parse(s.expires_at) || Date.now() + 600000, pas = Math.max(2, s.poll_interval_seconds || 3) * 1000;
      const tour = async () => {
        if (Date.now() > fin) { montrer("connexion"); etat("Le code a expiré : recommence.", true); return; }
        try {
          const q = await appel("/rest/v1/rpc/poll_tv_login_session", { p_code: s.device_code, p_device_nonce: nonce });
          const st = (Array.isArray(q) ? q[0] : q || {}).status;
          if (st === "approved") {
            const t = await appel("/functions/v1/tv-logins-exchange", { code: s.device_code, device_nonce: nonce });
            memo.acces = t.access_token; memo.renouv = t.refresh_token; garder(memo);
            return connecte();
          }
          if (st === "expired" || st === "used" || st === "cancelled") { montrer("connexion"); etat("Connexion refusée ou expirée : recommence.", true); return; }
        } catch (e) { /* réseau : on réessaie au tour suivant */ }
        attente = setTimeout(tour, pas);
      };
      attente = setTimeout(tour, pas);
    } catch (e) { etat("Connexion impossible : " + e.message, true); }
    $("connecter").disabled = false;
  });
  $("annuler").addEventListener("click", () => { clearTimeout(attente); montrer("connexion"); etat(""); });

  $("envoyer").addEventListener("click", async () => {
    const b = $("envoyer"); b.disabled = true; etat("Envoi…");
    try {
      const adresse = collectionsDu($("lien").value);
      memo.lien = $("lien").value.trim(); memo.profil = +$("profil").value; garder(memo);
      const [nos, toutes] = await Promise.all([adresse, location.origin + "/collections.json"].map((u) =>
        fetch(u).then((r) => r.ok ? r.json() : r.json().then((d) => { throw new Error((d && d.error) || ("réponse " + r.status)); }, () => { throw new Error("réponse " + r.status); }))));
      if (!Array.isArray(nos) || !nos.length) throw new Error("ton lien ne donne aucune collection.");
      const distant = await appelCompte("sync_pull_collections", { p_profile_id: memo.profil });
      const avant = (Array.isArray(distant) && distant[0] && distant[0].collections_json) || [];
      const liste = fusion(avant, nos, (Array.isArray(toutes) ? toutes : []).map((c) => c.id));
      if (!memo.client) { memo.client = "site-" + hasard(); garder(memo); }
      await appelCompte("sync_push_collections", { p_profile_id: memo.profil, p_collections_json: liste, p_origin_client_id: memo.client });
      const perso = liste.length - nos.length;
      etat("Envoyé ✓ " + nos.length + " collection(s)" + (perso ? ", et tes " + perso + " à toi gardées" : "") + ". Nuvio les affiche à sa prochaine ouverture.");
    } catch (e) { etat("Envoi impossible : " + e.message, true); }
    b.disabled = false;
  });

  $("deconnecter").addEventListener("click", async () => {
    if (memo.acces) await appel("/auth/v1/logout", {}, memo.acces).catch(() => {});
    memo = { lien: memo.lien }; garder(memo); montrer("connexion"); etat("Nuvio déconnecté de ce navigateur.");
  });

  if (memo.renouv) connecte().catch(() => { montrer("connexion"); });
})();
</script>
</body>
</html>`;
}
