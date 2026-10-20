import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { parseQuality, qualityOf, resetMemo } from "../lib/qualite.js";

beforeEach(() => resetMemo());

test("4K DV : DV passe avant HDR", () => {
  assert.deepEqual(parseQuality([{ name: "Torrentio\n4k DV | HDR" }, { name: "Torrentio\n1080p" }]), { uhd: true, extra: "DV" });
});

test("4K HDR", () => {
  assert.deepEqual(parseQuality([{ name: "Torrentio\n4k HDR10+" }]), { uhd: true, extra: "HDR" });
});

test("4K seul", () => {
  assert.deepEqual(parseQuality([{ title: "Film.2024.2160p.WEB-DL.mkv" }]), { uhd: true, extra: null });
});

test("HDR hors 4K ignoré", () => {
  assert.deepEqual(parseQuality([{ name: "Torrentio\n1080p HDR" }]), { uhd: false, extra: null });
  assert.deepEqual(parseQuality([]), { uhd: false, extra: null });
});

const reponse = (streams) => async () => new Response(JSON.stringify({ streams }));

test("URL film", async () => {
  const calls = [];
  const f = async (u) => { calls.push(String(u)); return reponse([{ name: "4k" }])(); };
  assert.deepEqual(await qualityOf("movie", "tt1", null, f), { uhd: true, extra: null });
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

test("mémoire : un seul appel par titre", async () => {
  let n = 0;
  const f = async () => { n++; return reponse([{ name: "4k DV" }])(); };
  await qualityOf("movie", "tt5", null, f);
  assert.deepEqual(await qualityOf("movie", "tt5", null, f), { uhd: true, extra: "DV" });
  assert.equal(n, 1);
});
