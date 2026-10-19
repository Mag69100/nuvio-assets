import { test } from "node:test";
import assert from "node:assert/strict";
import { copiePage } from "../worker/copie.js";
import { hallPage } from "../worker/hall.js";

const O = "https://nuvio-assets.xnzxflix.workers.dev";

test("page_copie_explique_les_deux_facons", () => {
  const html = copiePage({ origin: O });
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.ok(html.includes("https://github.com/xnzx07/nuvio-assets/fork"));
  assert.ok(html.includes("https://dash.cloudflare.com"));
  assert.ok(html.includes("docker compose up -d"));
  assert.ok(html.includes("ghcr.io/xnzx07/nuvio-assets:latest"));
  assert.ok(html.includes("ADMIN_PASSWORD"));
  assert.ok(html.includes("https://github.com/xnzx07/nuvio-assets#héberger-ta-propre-copie"));
  assert.ok(html.includes(`href="${O}/"`));
  for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new Function(m[1]));
});

test("hall_mene_a_la_page_copie_seulement_sur_la_source", () => {
  assert.ok(hallPage({ origin: O, season: null, copy: false }).includes(`href="${O}/copie"`));
  assert.ok(!hallPage({ origin: "https://copie.exemple", season: null, copy: true }).includes("/copie\""));
});
