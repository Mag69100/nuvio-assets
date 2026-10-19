import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, delimiter } from "node:path";

// Lance docker/entrypoint.sh avec un faux « wrangler » qui affiche ses arguments (un par ligne).
function entrypoint(vars) {
  const dir = mkdtempSync(join(tmpdir(), "ep-"));
  writeFileSync(join(dir, "wrangler"), '#!/bin/sh\nfor a in "$@"; do printf "%s\n" "$a"; done\n');
  chmodSync(join(dir, "wrangler"), 0o755);
  const r = spawnSync("sh", ["docker/entrypoint.sh"], { env: { ...process.env, ...vars, APP_DIR: process.cwd(), PATH: dir + delimiter + process.env.PATH }, encoding: "utf8" });
  return r.stdout.trim().split(/\r?\n/);
}

test("adresse_publique_en_https", () => {
  const args = entrypoint({ TMDB_API_KEY: "x", ADRESSE_PUBLIQUE: "https://catalogue.exemple.fr/" });
  const i = args.indexOf("--local-upstream");
  assert.ok(i > 0);
  assert.equal(args[i + 1], "catalogue.exemple.fr");
  assert.equal(args[args.indexOf("--upstream-protocol") + 1], "https");
});

test("sans_adresse_publique", () => {
  assert.ok(!entrypoint({ TMDB_API_KEY: "x" }).includes("--local-upstream"));
});

test("journaux_sans_adresses", () => {
  const args = entrypoint({ TMDB_API_KEY: "x" });
  assert.equal(args[args.indexOf("--log-level") + 1], "warn");
});

test("secrets_tels_quels", () => {
  const args = entrypoint({ TMDB_API_KEY: "x", ADMIN_PASSWORD: 'a "b" #c: d' });
  assert.ok(args.includes('ADMIN_PASSWORD:a "b" #c: d'));
});

// Workers Builds redéploie à chaque « Sync fork » : les variables du tableau de bord doivent rester.
test("variables_gardees_au_deploiement", () => {
  assert.match(readFileSync("wrangler.toml", "utf8"), /^keep_vars = true$/m);
});
