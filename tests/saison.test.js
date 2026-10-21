import { test } from "node:test";
import assert from "node:assert/strict";
import { pickSeason } from "../worker/index.js";
import { saisonDu } from "../affiches/lib/saison.js";

// L'habillage de saison des affiches (service sur Vercel) suit la rangée « Spécial … » de l'addon : les deux
// calendriers (dates à Paris) doivent donner la même fête chaque jour. Hors fête, la rangée montre « À l'affiche ».
test("habillage_et_rangee_de_saison_meme_calendrier", () => {
  for (let t = Date.parse("2024-01-01T12:00:00Z"); t <= Date.parse("2032-12-31T12:00:00Z"); t += 86400000) {
    const jour = new Date(t).toISOString().slice(0, 10);
    assert.equal(saisonDu(jour) || "a-laffiche", pickSeason(jour), jour);
  }
});
