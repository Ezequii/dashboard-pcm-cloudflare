const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const LOCK = fs.readFileSync(path.join(ROOT, "package-lock.json"), "utf8");
const NPMRC = fs.readFileSync(path.join(ROOT, ".npmrc"), "utf8");
const NODE_VERSION = fs.readFileSync(path.join(ROOT, ".node-version"), "utf8").trim();

test("V123 Pages usa registry público e lock portátil", () => {
  assert.match(NPMRC, /registry=https:\/\/registry\.npmjs\.org\//);
  assert.doesNotMatch(LOCK, /packages\.applied-caas-gateway1\.internal\.api\.openai\.org/);
  assert.doesNotMatch(LOCK, /artifactory\/api\/npm\/npm-public/);
});

test("V123 Pages mantém instalação enxuta", () => {
  assert.equal(PACKAGE.devDependencies["@cloudflare/vite-plugin"], undefined);
  assert.equal(PACKAGE.devDependencies.wrangler, undefined);
  assert.ok(PACKAGE.devDependencies.vite);
  assert.ok(PACKAGE.devDependencies["@vitejs/plugin-react"]);
  assert.equal(PACKAGE.packageManager, "npm@10.9.8");
  assert.equal(NODE_VERSION, "22.23.1");
});
