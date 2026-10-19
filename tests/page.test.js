import { test } from "node:test";
import assert from "node:assert/strict";
import { configurePage } from "../worker/page.js";
import { defaults, decodeConfig, PROVIDERS, REGIONS, GENRES, LANGUAGES, SORTS, SEASON_KEYS, MAX_CUSTOM, COLLECTIONS } from "../worker/config.js";

const rows = [{ id: "a", home: true, name: "A", type: "movie" }];
const KEY = "AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q";
const page = () => configurePage({
  origin: "https://x", cfg: decodeConfig(Buffer.from(JSON.stringify({ k: KEY })).toString("base64url"), rows, []), rows, discover: [],
  providers: PROVIDERS, collections: COLLECTIONS.map((c) => ({ ...c, pos: 0, folders: [] })), defaults: defaults(rows, []),
  regions: REGIONS, genres: GENRES, languages: LANGUAGES, sorts: SORTS, seasons: SEASON_KEYS, maxCustom: MAX_CUSTOM, season: null,
});

// Le billet se partage (bouton « Offrir », QR code, image) : jamais avec la clé Gemini de l'utilisateur.
test("partage_sans_cle", () => {
  const html = page();
  assert.match(html, /const shared = compact\(\{ \.\.\.state, k: "" \}\);\s*shareUrl = D\.origin \+ .*enc\(shared\)/);
  assert.doesNotMatch(html, /addData\(configureUrl\)/);
  assert.doesNotMatch(html, /url: configureUrl/);
  assert.doesNotMatch(html, /writeText\(configureUrl\)/);
});

// L'indication sous le champ accepte les mêmes clés que le serveur (nouveau format « AQ.… » compris).
test("indication_meme_format_que_serveur", () => {
  assert.ok(page().includes("/^[A-Za-z0-9._~+/=:-]{20,200}$/.test(k)"));
});

// Pas de champ « mot de passe » : Chrome proposerait d'enregistrer la clé. Elle est masquée en CSS.
test("cle_masquee_sans_champ_mot_de_passe", () => {
  const html = page();
  assert.doesNotMatch(html, /type="password"/);
  assert.match(html, /<input type="text" id="ai-key" class="plain masque"/);
  assert.match(html, /-webkit-text-security: disc/);
});
