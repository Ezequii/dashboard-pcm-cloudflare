const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

test("V105 mantém pacote, interface e cache sincronizados", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const major = Number(String(pkg.version).split(".")[0]);
  assert.ok(major >= 105);
  assert.match(html, new RegExp(`>V${major}<\\/span>`));
  assert.match(sw, new RegExp(`const VERSION = "v${major}"`));
});

test("V105 possui auditoria consolidada e comando verify", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.scripts["audit:project"], "node tools/audit-project.cjs");
  assert.match(pkg.scripts.verify, /audit:project/);
  assert.ok(fs.existsSync(path.join(root, "tools", "audit-project.cjs")));
});

test("build gera precache a partir das referências reais do HTML", () => {
  const build = fs.readFileSync(path.join(root, "tools", "build-dist.cjs"), "utf8");
  assert.match(build, /expandServiceWorkerPrecache/);
  assert.match(build, /matchAll/);
  assert.match(build, /precache/);
});

test("PWA pode ser testado com segurança em localhost", () => {
  const pwa = fs.readFileSync(path.join(root, "static/js/pwa-v103.js"), "utf8");
  assert.match(pwa, /localhost/);
  assert.match(pwa, /127\.0\.0\.1/);
});
