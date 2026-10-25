/**
 * Les affiches maison en fichiers statiques, dessinées sur une machine GitHub (workflow affiches-statiques.yml).
 * Vercel n'a plus de calcul (offre Hobby : 4 h de CPU actif par mois) et Cloudflare gratuit ne donne que 10 ms par
 * requête : le dessin se fait ici, et Cloudflare sert les fichiers (gratuit, sans limite, hors des 100 000 requêtes
 * par jour). Adresse : https://<worker>/<style>/{type}/{shape}/{id}.jpg (styles : affiches/lib/styles.js).
 *   node scripts/affiches-statiques.mjs file   les affiches demandées et absentes (table demandes), toutes les 10 min
 *   node scripts/affiches-statiques.mjs tout   en plus, toutes celles déjà publiées (statuts du jour), chaque nuit
 * Base nuvio-affiches (D1) : demandes (la file, remplie par affiches/statique/worker.js) et fichiers (ce qui est en
 * ligne : chemin, empreinte, taille). Publication par l'API de Cloudflare (envoi direct des fichiers statiques) :
 * Cloudflare répond les empreintes qu'il n'a pas, on n'envoie que celles-là, puis on remet le Worker en ligne.
 * Environnement : CLOUDFLARE_API_TOKEN (Workers Scripts et D1 en écriture), CLOUDFLARE_ACCOUNT_ID, D1_AFFICHES (id
 * de la base), TMDB_API_KEY ; RELAIS_KEY (avis de StreamFusion sur la VF, chez l'addon) et MDBLIST_API_KEY facultatifs ;
 * AFFICHES_WORKER (nom du Worker, « affiches » par défaut).
 */
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { makeHandler } from "../affiches/api/affiche.js";
import { makeTendances } from "../affiches/api/tendances.js";
import { makeNotes } from "../affiches/api/notes.js";
import { makeVf } from "../affiches/api/vf.js";
import { makeQualite } from "../affiches/api/qualite.js";
import { STYLES, parametresDuStyle } from "../affiches/lib/styles.js";

const mode = process.argv[2] || "file";
const E = process.env;
for (const v of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "D1_AFFICHES", "TMDB_API_KEY"]) if (!E[v]) throw new Error(`${v} manquante`);
const WORKER = E.AFFICHES_WORKER || "affiches";
const API = `https://api.cloudflare.com/client/v4/accounts/${E.CLOUDFLARE_ACCOUNT_ID}`;
const PORT = 8791, EN_MEME_TEMPS = 8;
// Offre gratuite : 20 000 fichiers par version du Worker (dont _headers). Au-delà, les plus anciens partent ; une
// affiche retirée et redemandée revient par la file.
const FICHIERS_MAX = 19000;
const ADRESSE = /^\/([a-z]+)\/(movie|series)\/(poster|landscape)\/(tt\d{1,10}|tmdb:\d{1,10})\.jpg$/;
// Une heure dans Nuvio, puis revérifiée par son ETag (304 si rien n'a changé) : les N° et statuts du jour suivent.
const ENTETES = "/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=3600, stale-while-revalidate=86400\n";

// ---- Cloudflare ----
async function cf(chemin, init = {}) {
  const res = await fetch(API + chemin, { ...init, headers: { Authorization: `Bearer ${E.CLOUDFLARE_API_TOKEN}`, ...(init.headers || {}) } });
  const corps = await res.json().catch(() => ({}));
  if (!res.ok || corps.success === false) throw new Error(`Cloudflare ${chemin} : ${res.status} ${JSON.stringify(corps.errors || corps).slice(0, 300)}`);
  return corps.result;
}
async function sql(requete, params = []) {
  const r = await cf(`/d1/database/${E.D1_AFFICHES}/query`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sql: requete, params }) });
  return (r && r[0] && r[0].results) || [];
}
// Valeurs écrites en clair dans les insertions groupées : chemins vérifiés par ADRESSE, empreintes en hexadécimal.
const texte = (v) => `'${String(v).replace(/'/g, "''")}'`;

// ---- Le service d'affiches, sur cette machine ----
// Aucune réserve (rien à relire), aucun disjoncteur ni budget : ils protègent Vercel, pas cette machine.
const envAffiche = { TMDB_API_KEY: E.TMDB_API_KEY, MDBLIST_API_KEY: E.MDBLIST_API_KEY, RELAIS_KEY: E.RELAIS_KEY, RESERVE: "off", RENDUS_MINUTE: "1000000", RENDUS_HEURE: "1000000", CPU_BUDGET_MIN: "1000000" };
// Le compteur de calcul de Vercel (POST /cpu chez l'addon) ne doit pas compter ce qui tourne ici.
const sansCompteur = (url, init) => (/\/cpu\?/.test(String(url)) ? Promise.resolve(Response.json({ ms: 0 })) : fetch(url, init));
const affiche = makeHandler({ env: envAffiche, fetchImpl: sansCompteur });
// Les relais lus par le service (qualité, notes, VF, tendances) : ici, sans clé (appels de cette machine seulement).
const envRelais = { ...envAffiche, RELAIS_KEY: undefined };
const relais = { tendances: makeTendances({ env: envRelais }), notes: makeNotes({ env: envRelais }), vf: makeVf({ env: envRelais }),
  // StreamFusion : demandé à l'addon avec RELAIS_KEY, d'où la clé ici seulement.
  qualite: makeQualite({ env: { ...envRelais, RELAIS_KEY: E.RELAIS_KEY } }) };

const serveur = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  let r;
  try {
    const t = /^\/tendances\/(movie|series)\.json$/.exec(url.pathname);
    const q = /^\/qualite\/(movie|series)\/([^/]+)\.json$/.exec(url.pathname);
    if (t) r = await relais.tendances(new Request(`${url.origin}/api/tendances?type=${t[1]}`));
    else if (q) r = await relais.qualite(new Request(`${url.origin}/api/qualite?type=${q[1]}&video=${decodeURIComponent(q[2])}${url.searchParams.get("sf") === "1" ? "&sf=1" : ""}`));
    else if (/^\/notes\/tt\d{1,10}\.json$/.test(url.pathname)) r = await relais.notes(new Request(`${url.origin}/api/notes?imdb=${url.pathname.slice(7, -5)}`));
    else if (url.pathname === "/vf.json") r = await relais.vf(new Request(`${url.origin}/api/vf${url.search}`));
    else r = new Response("introuvable", { status: 404 });
  } catch (e) { r = new Response(String(e), { status: 500 }); }
  const entetes = Object.fromEntries([...r.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k)));
  res.writeHead(r.status, entetes);
  res.end(Buffer.from(await r.arrayBuffer()));
});

/** Dessine une affiche : { jpg, retard } ou { statut } (404 : titre inconnu ; autre : à réessayer). */
async function dessiner(chemin) {
  const [, style, type, shape, id] = ADRESSE.exec(chemin);
  let p = parametresDuStyle(style);
  // Le service renvoie (308) vers l'adresse canonique de ces réglages : on la suit, deux fois au plus.
  for (let i = 0; i < 3; i++) {
    p.set("type", type); p.set("shape", shape); p.set("id", id);
    const r = await affiche(new Request(`http://127.0.0.1:${PORT}/api/affiche?${p}`));
    if (r.status === 308) { p = new URLSearchParams((r.headers.get("Location") || "").split("?")[1] || ""); continue; }
    if (r.status === 200 && (r.headers.get("Content-Type") || "").startsWith("image/")) {
      return { jpg: Buffer.from(await r.arrayBuffer()), retard: r.headers.get("X-Affiche-Etat") === "retard" };
    }
    return { statut: r.status };
  }
  return { statut: 508 };
}

// Empreinte d'un fichier statique : 32 caractères hexadécimaux, au choix de l'envoyeur (comme wrangler : contenu en
// base64 suivi de l'extension).
const empreinte = (jpg) => createHash("sha256").update(jpg.toString("base64") + "jpg").digest("hex").slice(0, 32);

async function publier(fichiers, nouveaux) {
  const manifest = {};
  for (const f of fichiers) manifest[f.chemin] = { hash: f.hash, size: f.taille };
  const session = await cf(`/workers/scripts/${WORKER}/assets-upload-session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manifest }) });
  let jeton = session.jwt;
  const parChemin = new Map(fichiers.map((f) => [f.hash, f.chemin]));
  for (const lot of session.buckets || []) {
    const form = new FormData();
    for (const hash of lot) {
      // Pas dessinée par ce passage : Cloudflare la redemande (rare), on la relit en ligne.
      let jpg = nouveaux.get(hash);
      if (!jpg) {
        const r = await fetch(`https://${WORKER}.${(await cf("/workers/subdomain")).subdomain}.workers.dev${parChemin.get(hash)}`);
        if (!r.ok) throw new Error(`fichier ${parChemin.get(hash)} introuvable en ligne (${r.status})`);
        jpg = Buffer.from(await r.arrayBuffer());
      }
      form.append(hash, new File([jpg.toString("base64")], hash, { type: "image/jpeg" }));
    }
    // Trois essais : Cloudflare refuse parfois un envoi (vu le 2026-10-25, le suivant passe).
    for (let essai = 1; ; essai++) {
      const res = await fetch(`${API}/workers/assets/upload?base64=true`, { method: "POST", headers: { Authorization: `Bearer ${jeton}` }, body: form });
      const corps = await res.json().catch(() => ({}));
      if (res.ok && corps.success !== false) { if (corps.result && corps.result.jwt) jeton = corps.result.jwt; break; }
      const erreur = `envoi des fichiers : ${res.status} ${JSON.stringify(corps.errors || corps).slice(0, 300)}`;
      if (essai === 3) throw new Error(erreur);
      console.warn(`${erreur}, nouvel essai`);
      await new Promise((ok) => setTimeout(ok, 3000 * essai));
    }
  }
  const code = readFileSync(new URL("../affiches/statique/worker.js", import.meta.url), "utf8").replace("__STYLES__", JSON.stringify(Object.keys(STYLES)));
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({
    main_module: "worker.js",
    compatibility_date: "2026-10-01",
    bindings: [{ type: "d1", name: "DB", id: E.D1_AFFICHES }],
    assets: { jwt: jeton, config: { not_found_handling: "none", _headers: ENTETES } },
  })], { type: "application/json" }));
  form.append("worker.js", new Blob([code], { type: "application/javascript+module" }), "worker.js");
  await cf(`/workers/scripts/${WORKER}`, { method: "PUT", body: form });
  await cf(`/workers/scripts/${WORKER}/subdomain`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: true }) });
  return (session.buckets || []).reduce((n, l) => n + l.length, 0);
}

// ---- Le passage ----
await sql("CREATE TABLE IF NOT EXISTS demandes (chemin TEXT PRIMARY KEY, vu TEXT NOT NULL, essais INTEGER NOT NULL DEFAULT 0, apres TEXT)");
await sql("CREATE TABLE IF NOT EXISTS fichiers (chemin TEXT PRIMARY KEY, hash TEXT NOT NULL, taille INTEGER NOT NULL, dessine TEXT NOT NULL, cree TEXT NOT NULL)");
const maintenant = new Date().toISOString();
const file = await sql("SELECT chemin, essais FROM demandes WHERE apres IS NULL OR apres <= ? ORDER BY vu LIMIT 3000", [maintenant]);
const enLigne = await sql("SELECT chemin, hash, taille, cree FROM fichiers");
const parChemin = new Map(enLigne.map((f) => [f.chemin, f]));
const aFaire = new Map(file.filter((d) => ADRESSE.test(d.chemin) && STYLES[ADRESSE.exec(d.chemin)[1]]).map((d) => [d.chemin, d.essais]));
if (mode === "tout") for (const f of enLigne) if (!aFaire.has(f.chemin)) aFaire.set(f.chemin, null);
console.log(`${mode} : ${aFaire.size} affiches à dessiner (${file.length} dans la file, ${enLigne.length} en ligne)`);
if (!aFaire.size) process.exit(0);

await new Promise((ok) => serveur.listen(PORT, "127.0.0.1", ok));
const t0 = Date.now(), cpu0 = process.cpuUsage();
const nouveaux = new Map(), faits = [], reessais = [], bilan = { dessinees: 0, inchangees: 0, retard: 0, inconnues: 0, ratees: 0 };
const liste = [...aFaire];
let i = 0;
async function ouvrier() {
  while (i < liste.length) {
    const [chemin, essais] = liste[i++];
    let r;
    try { r = await dessiner(chemin); } catch (e) { console.warn(`${chemin} : ${e.message}`); r = { statut: 500 }; }
    if (r.jpg) {
      const hash = empreinte(r.jpg), avant = parChemin.get(chemin);
      if (avant && avant.hash === hash) bilan.inchangees++;
      else { bilan.dessinees++; nouveaux.set(hash, r.jpg); }
      parChemin.set(chemin, { chemin, hash, taille: r.jpg.length, cree: avant ? avant.cree : maintenant, change: !avant || avant.hash !== hash });
      // Torrentio trop lent : publiée sans badge de qualité, et redessinée au prochain passage.
      if (r.retard) { bilan.retard++; reessais.push([chemin, (essais || 0) + 1, 10]); } else if (essais !== null) faits.push(chemin);
    } else if (essais !== null) {
      // Titre inconnu : redemandé dans un jour seulement (Nuvio redemande l'affiche à chaque passage sur la carte).
      if (r.statut === 404) { bilan.inconnues++; reessais.push([chemin, essais + 1, 24 * 60]); } else { bilan.ratees++; reessais.push([chemin, essais + 1, Math.min(24 * 60, 10 * 2 ** essais)]); }
    } else bilan.ratees++;
  }
}
await Promise.all(Array.from({ length: EN_MEME_TEMPS }, ouvrier));
serveur.close();
const ms = (c) => Math.round((c.user + c.system) / 1000);
console.log(`${liste.length} affiches en ${Math.round((Date.now() - t0) / 1000)} s, CPU ${ms(process.cpuUsage(cpu0))} ms : ${JSON.stringify(bilan)}`);

// Plafond de fichiers : les plus anciennes partent (redemandées, elles reviendront par la file).
let tous = [...parChemin.values()].sort((a, b) => (a.cree < b.cree ? 1 : -1));
const retirees = tous.slice(FICHIERS_MAX);
tous = tous.slice(0, FICHIERS_MAX);
const changees = tous.filter((f) => f.change);
if (changees.length || retirees.length) {
  const envoyes = await publier(tous, nouveaux);
  console.log(`publié : ${tous.length} fichiers en ligne, ${envoyes} envoyés, ${retirees.length} retirés`);
  for (let j = 0; j < changees.length; j += 200) {
    const lot = changees.slice(j, j + 200).map((f) => `(${texte(f.chemin)}, ${texte(f.hash)}, ${Number(f.taille)}, ${texte(maintenant)}, ${texte(f.cree)})`);
    await sql(`INSERT INTO fichiers (chemin, hash, taille, dessine, cree) VALUES ${lot.join(", ")} ON CONFLICT (chemin) DO UPDATE SET hash = excluded.hash, taille = excluded.taille, dessine = excluded.dessine`);
  }
  for (let j = 0; j < retirees.length; j += 200) await sql(`DELETE FROM fichiers WHERE chemin IN (${retirees.slice(j, j + 200).map((f) => texte(f.chemin)).join(", ")})`);
}
// La file, seulement une fois publié : une affiche absente reste demandée tant qu'elle n'est pas en ligne.
for (let j = 0; j < faits.length; j += 200) await sql(`DELETE FROM demandes WHERE chemin IN (${faits.slice(j, j + 200).map(texte).join(", ")})`);
for (const [chemin, essais, minutes] of reessais) {
  await sql("UPDATE demandes SET essais = ?, apres = ? WHERE chemin = ?", [essais, new Date(Date.now() + minutes * 60000).toISOString(), chemin]);
}
process.exit(0);
