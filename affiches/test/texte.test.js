import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import satori from "satori";
import { lignesDeTexte, sansTexte, choisirSansTexte, resetMemo } from "../lib/texte.js";

beforeEach(() => resetMemo());

const INTER = readFileSync(new URL("../fonts/Inter-SemiBold.ttf", import.meta.url));
const h = (type, style, children) => ({ type, props: { style, children } });

/** Une affiche 342×513 en dégradé, avec des lignes de texte blanc (titre, accroche, générique) ou sans. */
async function affiche(lignes = []) {
  const fond = h("div", { width: 342, height: 513, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", padding: 20,
    background: "linear-gradient(#2a3b4c, #6b4a2a)", color: "#fff", fontFamily: "Inter" },
  lignes.map(([texte, taille]) => h("div", { display: "flex", fontSize: taille, marginTop: 6 }, texte)));
  const svg = await satori(fond, { width: 342, height: 513, fonts: [{ name: "Inter", data: INTER, weight: 600, style: "normal" }] });
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}
const AVEC = await affiche([["LES DOSSIERS WARREN", 30], ["D'APRÈS UNE HISTOIRE VRAIE", 14], ["UN FILM DE JAMES WAN AVEC VERA FARMIGA PATRICK WILSON", 9]]);
const SANS = await affiche();

test("texte_trouve", async () => {
  assert.ok(await lignesDeTexte(AVEC) >= 1);
  assert.equal(await lignesDeTexte(SANS), 0);
});

/** Faux TMDB : chaque chemin d'image renvoie l'affiche demandée, en w342. */
function images(table) {
  const calls = [];
  const f = async (url) => {
    const u = String(url);
    calls.push(u);
    const chemin = u.replace("https://image.tmdb.org/t/p/w342", "");
    return table[chemin] ? new Response(table[chemin]) : new Response(null, { status: 404 });
  };
  f.calls = calls;
  return f;
}

// La première image vraiment sans texte parmi les candidates ; aucune : null (l'affiche normale servira).
test("sans_texte_choisit_la_premiere_propre", async () => {
  const f = images({ "/lt.jpg": AVEC, "/propre.jpg": SANS });
  assert.equal(await sansTexte(["/lt.jpg", "/propre.jpg"], f), "/propre.jpg");
  assert.equal(await sansTexte(["/lt.jpg"], f), null);
  assert.equal(await sansTexte([], f), null);
  // Image injoignable : écartée, comme une image à texte.
  assert.equal(await sansTexte(["/absente.jpg", "/propre.jpg"], f), "/propre.jpg");
});

// Image pas lue (réseau, TMDB en panne) : ni gardée en mémoire (on réessaiera), ni comptée comme « avec texte » pour
// de bon ; le choix est incertain, et l'affiche prend le cache court.
test("sans_texte_panne_passagere_pas_gardee", async () => {
  let panne = true;
  const calls = [];
  const f = async (url) => {
    calls.push(String(url));
    if (panne) throw new Error("réseau");
    return new Response(SANS);
  };
  assert.deepEqual(await choisirSansTexte(["/a.jpg"], f), { chemin: null, incertain: true });
  panne = false;
  assert.deepEqual(await choisirSansTexte(["/a.jpg"], f), { chemin: "/a.jpg", incertain: false });
  assert.equal(calls.length, 2);
  // TMDB en panne (5xx) : incertain aussi ; image absente (404) : écartée pour de bon, sans incertitude.
  const g = async (url) => (String(url).includes("/panne") ? new Response(null, { status: 503 }) : String(url).includes("/propre") ? new Response(SANS) : new Response(null, { status: 404 }));
  assert.deepEqual(await choisirSansTexte(["/panne.jpg", "/propre.jpg"], g), { chemin: "/propre.jpg", incertain: true });
  assert.deepEqual(await choisirSansTexte(["/absente.jpg", "/propre.jpg"], g), { chemin: "/propre.jpg", incertain: false });
  // Une image illisible (pas une image) : écartée et gardée.
  const h = async () => new Response("pas une image");
  assert.deepEqual(await choisirSansTexte(["/casse.jpg"], h), { chemin: null, incertain: false });
});

test("sans_texte_garde_en_memoire", async () => {
  const f = images({ "/lt.jpg": AVEC, "/propre.jpg": SANS });
  await sansTexte(["/lt.jpg", "/propre.jpg"], f);
  const avant = f.calls.length;
  assert.equal(await sansTexte(["/lt.jpg", "/propre.jpg"], f), "/propre.jpg");
  assert.equal(f.calls.length, avant);
});
