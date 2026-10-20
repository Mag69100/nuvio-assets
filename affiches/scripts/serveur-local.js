/**
 * Le service d'affiches sur cet ordinateur, pour essayer avant de mettre en ligne (ne fait pas partie du service).
 *   node scripts/serveur-local.js <fichier contenant TMDB_API_KEY=…> [port, 8791 par défaut]
 * Mêmes adresses que sur Vercel (vercel.json) : /{type}/{shape}/{id}.jpg, /tendances/{type}.json, /notes/{tt…}.json,
 * /qualite/…. Les notes MDBList demandent MDBLIST_API_KEY dans le même fichier que la clé TMDB.
 * La qualité est lue chez le service en ligne (Torrentio refuse souvent les appels venus de France).
 * Pour que le site local s'en serve : wrangler dev … --var AFFICHES_URL:http://127.0.0.1:8791
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { makeHandler } from "../api/affiche.js";
import { makeTendances } from "../api/tendances.js";
import { makeNotes } from "../api/notes.js";

const [fichierCle, port = "8791"] = process.argv.slice(2);
const cle = /TMDB_API_KEY\s*=\s*"?([A-Za-z0-9]+)/.exec(readFileSync(fichierCle, "utf8"));
if (!cle) throw new Error("TMDB_API_KEY introuvable dans " + fichierCle);
const mdb = /MDBLIST_API_KEYs*=s*"?([A-Za-z0-9]+)/.exec(readFileSync(fichierCle, "utf8"));
const env = { TMDB_API_KEY: cle[1], ...(mdb ? { MDBLIST_API_KEY: mdb[1] } : {}) };
const EN_LIGNE = "https://affiches-catalogue-fr.vercel.app";

const affiche = makeHandler({ env }), tendances = makeTendances({ env }), notes = makeNotes({ env });

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  let reponse;
  try {
    const a = /^\/(movie|series)\/(poster|landscape)\/([^/]+)\.jpg$/.exec(url.pathname);
    const t = /^\/tendances\/(movie|series)\.json$/.exec(url.pathname);
    if (a) {
      const q = new URLSearchParams(url.search);
      q.set("type", a[1]); q.set("shape", a[2]); q.set("id", decodeURIComponent(a[3]));
      reponse = await affiche(new Request(`${url.origin}/api/affiche?${q}`, { headers: req.headers["if-none-match"] ? { "If-None-Match": req.headers["if-none-match"] } : {} }));
    } else if (t) {
      reponse = await tendances(new Request(`${url.origin}/api/tendances?type=${t[1]}`));
    } else if (/^/notes/(ttd{1,10}).json$/.test(url.pathname)) {
      reponse = await notes(new Request(`${url.origin}/api/notes?imdb=${url.pathname.slice(7, -5)}`));
    } else if (url.pathname.startsWith("/qualite/")) {
      reponse = await fetch(EN_LIGNE + url.pathname);
    } else {
      reponse = new Response("introuvable", { status: 404 });
    }
  } catch (e) {
    reponse = new Response(String(e), { status: 500 });
  }
  // Le corps est relu en clair : on ne recopie ni sa compression ni sa longueur d'origine.
  const entetes = Object.fromEntries([...reponse.headers].filter(([k]) => !["content-encoding", "content-length", "transfer-encoding"].includes(k)));
  res.writeHead(reponse.status, entetes);
  res.end(Buffer.from(await reponse.arrayBuffer()));
}).listen(Number(port), "127.0.0.1", () => console.log(`Affiches locales sur http://127.0.0.1:${port}`));
