import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { parseQuality, qualityOf, resetMemo, tailleMemo } from "../lib/qualite.js";

beforeEach(() => resetMemo());

test("4K DV : DV passe avant HDR", () => {
  assert.deepEqual(parseQuality([{ name: "Torrentio\n4k DV | HDR" }, { name: "Torrentio\n1080p" }]), { uhd: true, extra: "DV", fhd: true, hdr10p: false, atmos: false });
});

test("4K HDR", () => {
  assert.deepEqual(parseQuality([{ name: "Torrentio\n4k HDR10+" }]), { uhd: true, extra: "HDR", fhd: false, hdr10p: true, atmos: false });
});

test("4K seul", () => {
  assert.deepEqual(parseQuality([{ title: "Film.2024.2160p.WEB-DL.mkv" }]), { uhd: true, extra: null, fhd: false, hdr10p: false, atmos: false });
});

test("HDR hors 4K ignoré", () => {
  assert.deepEqual(parseQuality([{ name: "Torrentio\n1080p HDR" }]), { uhd: false, extra: null, fhd: true, hdr10p: false, atmos: false });
  assert.deepEqual(parseQuality([]), { uhd: false, extra: null, fhd: false, hdr10p: false, atmos: false });
});

const reponse = (streams) => async () => new Response(JSON.stringify({ streams }));

test("URL film", async () => {
  const calls = [];
  const f = async (u) => { calls.push(String(u)); return reponse([{ name: "4k" }])(); };
  assert.deepEqual(await qualityOf("movie", "tt1", null, f), { uhd: true, extra: null, fhd: false, hdr10p: false, atmos: false });
  assert.equal(calls[0], "https://torrentio.strem.fun/stream/movie/tt1.json");
});

test("URL série : premier épisode de la dernière saison", async () => {
  const calls = [];
  const f = async (u) => { calls.push(String(u)); return reponse([])(); };
  await qualityOf("series", "tt2", 3, f);
  await qualityOf("series", "tt3", null, f);
  assert.equal(calls[0], "https://torrentio.strem.fun/stream/series/tt2:3:1.json");
  assert.equal(calls[1], "https://torrentio.strem.fun/stream/series/tt3:1:1.json");
});

test("sans IMDb : null sans appel", async () => {
  let n = 0;
  assert.equal(await qualityOf("movie", null, null, async () => { n++; }), null);
  assert.equal(n, 0);
});

test("délai : null en 2,5 s au plus", async () => {
  const f = (u, opts) => new Promise((_, reject) => opts.signal.addEventListener("abort", () => reject(opts.signal.reason)));
  const t0 = Date.now();
  assert.equal(await qualityOf("movie", "tt9", null, f), null);
  assert.ok(Date.now() - t0 <= 3000, `trop long : ${Date.now() - t0} ms`);
});

test("erreur HTTP : null", async () => {
  assert.equal(await qualityOf("movie", "tt8", null, async () => new Response("non", { status: 403 })), null);
});

// Avec un relais (le service lui-même, derrière le cache de Vercel), la qualité lue par une instance
// resservira à toutes les autres : on la demande au relais, pas à Torrentio.
test("relais : qualité lue via le cache partagé", async () => {
  const calls = [];
  const f = async (u) => { calls.push(String(u)); return new Response(JSON.stringify({ uhd: true, extra: "HDR" })); };
  assert.deepEqual(await qualityOf("series", "tt2", 3, f, "https://affiches.test"), { uhd: true, extra: "HDR", fhd: false, hdr10p: false, atmos: false });
  assert.deepEqual(calls, ["https://affiches.test/qualite/series/tt2:3:1.json?v=2"]);
});

// Qualité v2 : 1080p (quand il n'y a pas de 4K), HDR10+ (en 4K) et Dolby Atmos (toute résolution).
test("qualite_v2", async () => {
  assert.deepEqual(parseQuality([{ name: "Torrentio\n4k", title: "Film 2160p HDR10+ DDP5.1 Atmos" }, { name: "Torrentio\n1080p" }]), { uhd: true, extra: "HDR", fhd: true, hdr10p: true, atmos: true });
  assert.deepEqual(parseQuality([{ name: "Torrentio\n1080p", title: "Film.1080p.TrueHD.Atmos" }]), { uhd: false, extra: null, fhd: true, hdr10p: false, atmos: true });
  // HDR10+ hors 4K ne compte pas.
  assert.equal(parseQuality([{ name: "1080p HDR10+" }]).hdr10p, false);
  // Relais au nouveau format : les champs suivent ; ancien format (gardé au CDN) : false.
  const neuf = async () => new Response(JSON.stringify({ uhd: false, extra: null, fhd: true, hdr10p: false, atmos: true }));
  assert.deepEqual(await qualityOf("movie", "tt8", null, neuf, "https://affiches.test"), { uhd: false, extra: null, fhd: true, hdr10p: false, atmos: true });
});

test("relais en panne : null", async () => {
  assert.equal(await qualityOf("movie", "tt7", null, async () => new Response("", { status: 503 }), "https://affiches.test"), null);
});

test("mémoire plafonnée : les plus anciennes sortent", async () => {
  const f = async () => reponse([])();
  for (let i = 0; i < 5005; i++) await qualityOf("movie", "tt" + (100000 + i), null, f);
  assert.ok(tailleMemo() <= 5000, `taille ${tailleMemo()}`);
});

test("mémoire : un seul appel par titre", async () => {
  let n = 0;
  const f = async () => { n++; return reponse([{ name: "4k DV" }])(); };
  await qualityOf("movie", "tt5", null, f);
  assert.deepEqual(await qualityOf("movie", "tt5", null, f), { uhd: true, extra: "DV", fhd: false, hdr10p: false, atmos: false });
  assert.equal(n, 1);
});
