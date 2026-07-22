const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("V102 expõe manifesto, service worker e versão visual", () => {
  const html = read("index.html");
  const pkg = JSON.parse(read("package.json"));
  const major = Number(String(pkg.version).split(".")[0]);
  assert.ok(major >= 102);
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, new RegExp(`>V${major}<\\/span>`));
  assert.ok(html.includes("/static/js/pwa-v103.js") || /navigator\.serviceWorker\.register\("\/sw\.js"\)/.test(html));
  assert.match(html, /noscript-banner-v102/);
});

test("build inclui imagens e artefatos PWA obrigatórios", () => {
  const build = read("tools/build-dist.cjs");
  for (const asset of [
    "manifest.webmanifest",
    "sw.js",
    "static/favicon.png",
    "static/logo_amaggi.png",
  ]) {
    assert.ok(build.includes(`"${asset}"`), `${asset} deve ser validado pelo build`);
  }
});

test("service worker não prioriza cache para dados operacionais", () => {
  const sw = read("sw.js");
  assert.match(sw, /pathname\.startsWith\("\/static\/data\/"\)/);
  assert.match(sw, /event\.respondWith\(fetch\(request\)\)/);
});
