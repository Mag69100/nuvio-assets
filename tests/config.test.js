import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeConfig, contentKey } from "../worker/config.js";

const rows = [{ id: "a", home: true }];
const discover = [];
const seg = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const KEY = "AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q";

test("cle_valide", () => {
  assert.equal(decodeConfig(seg({ k: KEY }), rows, discover).k, KEY);
});

test("cle_avec_espaces", () => {
  assert.equal(decodeConfig(seg({ k: `  ${KEY}\n` }), rows, discover).k, KEY);
});

test("cle_invalide", () => {
  for (const k of ["<script>", 42, "court"]) {
    const cfg = decodeConfig(seg({ k, n: "Mon addon" }), rows, discover);
    assert.equal(cfg.k, "");
    assert.equal(cfg.custom, true);
    assert.equal(cfg.n, "Mon addon");
  }
});

test("sans_config", () => {
  assert.equal(decodeConfig("", rows, discover).k, "");
});

test("cle_hors_cache", () => {
  const cfg = decodeConfig(seg({ k: KEY }), rows, discover);
  assert.ok(!contentKey(cfg).includes(KEY));
});

test("cle_nouveau_format", () => {
  const k = "AQ.Ab8RN6LxYz0123456789abcdefGHIJKLmnopqrstu-_";
  assert.equal(decodeConfig(seg({ k }), rows, discover).k, k);
});

test("cle_caracteres_interdits", () => {
  for (const k of ["AIzaSyA1b2C3d4E5f6G7h8I9 j0K1l2M3n4O5p6Q", "AIzaSyA1b2C3d4E5f6G7h8I9\nj0K1l2M3n4O5p6Q", 'AIzaSyA1b2C3d4E5f6G7h8I9"j0K1l2M3n4O5p6Q'])
    assert.equal(decodeConfig(seg({ k }), rows, discover).k, "");
});

test("jeton_alerte", () => {
  const al = "a".repeat(24);
  const cfg = decodeConfig(seg({ al }), rows, discover);
  assert.equal(cfg.al, al);
  assert.ok(!contentKey(cfg).includes(al));
  assert.equal(decodeConfig(seg({ al: "zz" }), rows, discover).al, "");
  assert.equal(decodeConfig("", rows, discover).al, "");
});

test("ordre_des_tuiles", () => {
  const cfg = decodeConfig(seg({ to: { 2: [3, 0, 3, "x", -1, 1] }, t: { 2: [1] } }), rows, discover);
  assert.deepEqual(cfg.to, { genres: [3, 0, 1] });
  assert.deepEqual(cfg.t, { genres: [1] });
  assert.deepEqual(decodeConfig(seg({ to: [1, 2] }), rows, discover).to, {});
  assert.deepEqual(decodeConfig("", rows, discover).to, {});
});
