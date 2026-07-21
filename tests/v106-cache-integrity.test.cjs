"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");

test("pacote mantém as garantias de cache introduzidas na V106", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  assert.ok(Number(pkg.version.split(".")[0]) >= 106);
  assert.match(html, /V10[6-9]|V1[1-9]\d/);
  assert.match(sw, /const VERSION = "v(?:10[6-9]|1[1-9]\d)"/);
});

test("ativos sem fingerprint não usam cache immutable", () => {
  const headers = fs.readFileSync(path.join(ROOT, "_headers"), "utf8");
  for (const route of ["/static/js/*", "/static/*.css"]) {
    const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const block = headers.match(new RegExp(`${escaped}\\s+([\\s\\S]*?)(?=\\n/|$)`));
    assert.ok(block, `bloco ausente: ${route}`);
    assert.doesNotMatch(block[1], /immutable/i);
    assert.match(block[1], /max-age=0/i);
    assert.match(block[1], /must-revalidate/i);
  }
});

test("build gera manifesto de integridade com hashes SHA-256 válidos", () => {
  execFileSync(process.execPath, [path.join(ROOT, "tools", "build-dist.cjs")], { cwd: ROOT });
  const manifestPath = path.join(ROOT, "dist", "build-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.equal(manifest.version, pkg.version);
  assert.ok(Object.keys(manifest.files).length >= 50);
  const target = "index.html";
  const buffer = fs.readFileSync(path.join(ROOT, "dist", target));
  const digest = crypto.createHash("sha256").update(buffer).digest("hex");
  assert.equal(manifest.files[target].sha256, digest);
  assert.equal(manifest.files[target].bytes, buffer.byteLength);
});
