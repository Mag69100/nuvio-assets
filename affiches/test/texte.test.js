import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import satori from "satori";
import { lignesDeTexte, sansTexte, resetMemo } from "../lib/texte.js";

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

test("sans_texte_garde_en_memoire", async () => {
  const f = images({ "/lt.jpg": AVEC, "/propre.jpg": SANS });
  await sansTexte(["/lt.jpg", "/propre.jpg"], f);
  const avant = f.calls.length;
  assert.equal(await sansTexte(["/lt.jpg", "/propre.jpg"], f), "/propre.jpg");
  assert.equal(f.calls.length, avant);
});
