import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { youtubeVf, oublierPauseYoutube } from "../worker/index.js";

// Page de résultats YouTube réduite : une vidéo.
const page = (id, title) => `{"videoRenderer":{"videoId":"${id}","title":{"runs":[{"text":"${title}"}]}}}`;
let calls;
beforeEach(() => {
  calls = [];
  oublierPauseYoutube();
});
const repond = (fn) => { calls = []; globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return fn(); }; };

test("recherche_avec_cookie_sans_suivre_les_redirections", async () => {
  repond(() => new Response(page("abcdefghijk", "Dune - Bande-annonce VF")));
  assert.deepEqual(await youtubeVf("dune bande annonce vf", "Dune"), { key: "abcdefghijk", title: "Dune - Bande-annonce VF" });
  assert.equal(calls[0].init.redirect, "manual");
  assert.equal(calls[0].init.headers.Cookie, "SOCS=CAI");
});

test("redirection_met_youtube_en_pause", async () => {
  repond(() => new Response(null, { status: 302, headers: { Location: "https://consent.youtube.com/m?continue=x" } }));
  assert.equal(await youtubeVf("dune bande annonce vf", "Dune"), undefined);
  // Pendant la pause : plus aucune demande à YouTube.
  repond(() => new Response(page("abcdefghijk", "Dune - Bande-annonce VF")));
  assert.equal(await youtubeVf("dune bande annonce vf", "Dune"), undefined);
  assert.equal(calls.length, 0);
  oublierPauseYoutube();
  assert.equal((await youtubeVf("dune bande annonce vf", "Dune")).key, "abcdefghijk");
});

test("refus_429_met_youtube_en_pause", async () => {
  repond(() => new Response("", { status: 429 }));
  assert.equal(await youtubeVf("dune bande annonce vf", "Dune"), undefined);
  repond(() => new Response(page("abcdefghijk", "Dune - Bande-annonce VF")));
  assert.equal(await youtubeVf("dune bande annonce vf", "Dune"), undefined);
  assert.equal(calls.length, 0);
});

test("panne_sans_pause", async () => {
  // Une erreur réseau ou un 500 : pas de pause, la prochaine fiche réessaie.
  repond(() => { throw new Error("réseau"); });
  assert.equal(await youtubeVf("dune bande annonce vf", "Dune"), undefined);
  repond(() => new Response(page("abcdefghijk", "Dune - Bande-annonce VF")));
  assert.equal((await youtubeVf("dune bande annonce vf", "Dune")).key, "abcdefghijk");
});
