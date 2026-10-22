/**
 * Banc d'essai de la recherche : ~280 recherches courantes (animes, titres d'un mot, titres français, acteurs,
 * réalisateurs) lancées sur la vraie recherche de l'addon (worker local, vrai TMDB, sans Gemini : comme un lien sans
 * clé). Chaque cas de scripts/banc-recherche.json = [type, requête, titre attendu (a|b|…), "ia" si seul Gemini le
 * trouve] : le titre attendu doit être dans les 3 premiers. À relancer avant de toucher à la recherche (search.js,
 * runSearch) ; une recherche qui tombe mal signalée par quelqu'un s'ajoute au fichier.
 *
 *   node --import ./tests/support/register.mjs scripts/banc-recherche.mjs [mot pour ne lancer que ces cas]
 *
 * Clé TMDB : TMDB_API_KEY, sinon celle de .dev.vars. Sort avec le code 1 si un cas (hors « ia ») tombe mal.
 */
import { readFileSync } from "node:fs";

const racine = new URL("..", import.meta.url);
const cle = process.env.TMDB_API_KEY || (/^TMDB_API_KEY=["']?([^"'\r\n]+)/m.exec(readFileSync(new URL(".dev.vars", racine), "utf8")) || [])[1];
if (!cle) throw new Error("TMDB_API_KEY manquante (variable d'environnement ou .dev.vars)");

// Cache de Cloudflare en mémoire ; Gemini toujours en échec (une recherche sans clé).
const store = new Map();
globalThis.caches = { default: { match: async (r) => (store.has(r.url) ? new Response(store.get(r.url)) : undefined), put: async (r, res) => { store.set(r.url, await res.text()); } } };
const vraiFetch = globalThis.fetch;
globalThis.fetch = (u, o) => (String(u).includes("generativelanguage") ? Promise.resolve(new Response("{}", { status: 400 })) : vraiFetch(u, o));
console.warn = () => {};
const worker = (await import(new URL("worker/index.js", racine))).default;
// /debug demande une clé Gemini, celle du lien égale à celle de l'instance : une fausse, jamais envoyée à Google.
const G = "AIzaSyBancDEssai0123456789abcdefghijkl";
const seg = Buffer.from(JSON.stringify({ k: G })).toString("base64url");
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const filtre = process.argv[2];
const cas = JSON.parse(readFileSync(new URL("scripts/banc-recherche.json", racine), "utf8")).filter((c) => !filtre || c[1].includes(filtre));
const lignes = [];
let rates = 0, ia = 0;
for (let i = 0; i < cas.length; i += 4) {
  await Promise.all(cas.slice(i, i + 4).map(async ([type, q, attendu, seulIa]) => {
    const res = await worker.fetch(new Request(`https://x/${seg}/debug/search/${type}/${encodeURIComponent(q)}`), { TMDB_API_KEY: cle, GEMINI_API_KEY: G }, { waitUntil: () => {} });
    const t = await res.json();
    const top = (t.final || []).slice(0, 3);
    const ok = attendu.split("|").some((a) => top.some((f) => norm(f).includes(norm(a))));
    if (ok) return;
    if (seulIa) ia++; else rates++;
    lignes.push(`${seulIa ? "IA " : "KO "} ${type.padEnd(6)} ${q.padEnd(28)} tête=${t.head || "-"} gemini=${(t.ai && t.ai.why) || "-"} → ${top.join(" | ")}`);
  }));
}
console.log(lignes.sort().join("\n"));
console.log(`\n${cas.length - rates - ia}/${cas.length} bons${ia ? `, ${ia} trouvés seulement avec Gemini` : ""}${rates ? `, ${rates} qui tombent mal` : ""}`);
process.exitCode = rates ? 1 : 0;
