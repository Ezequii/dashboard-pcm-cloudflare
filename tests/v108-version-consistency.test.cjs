const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

test("V108 mantém versão e token de ativos sincronizados nos arquivos críticos", () => {
  const pkg = JSON.parse(read("package.json"));
  const html = read("index.html");
  const config = read("static/js/app-config.js");
  const core = read("static/js/core.js");
  const sw = read("sw.js");
  const build = read("tools/build-dist.cjs");

  const appVersion = config.match(/\bversion:\s*"([^"]+)"/)?.[1];
  const assetVersion = config.match(/\bassetVersion:\s*"([^"]+)"/)?.[1];
  const coreAssetVersion = core.match(/String\(config\.assetVersion \|\| ""\) !== "([^"]+)"/)?.[1];
  const appConfigQuery = html.match(/\/static\/js\/app-config\.js\?v=([^"]+)/)?.[1];
  const coreQuery = html.match(/\/static\/js\/core\.js\?v=([^"]+)/)?.[1];
  const visualVersion = html.match(/aria-label="Versão atual">V([^<]+)<\/span>/)?.[1];
  const swVersion = sw.match(/const VERSION = "v([^"]+)"/)?.[1];

  assert.equal(pkg.version, "108.0.0");
  assert.equal(appVersion, pkg.version);
  assert.equal(assetVersion, "10800");
  assert.equal(coreAssetVersion, assetVersion);
  assert.equal(appConfigQuery, assetVersion);
  assert.equal(coreQuery, assetVersion);
  assert.equal(visualVersion, "108");
  assert.equal(swVersion, "108");
  assert.match(build, /version:\s*PACKAGE\.version/);
});

test("auditoria bloqueia futuras divergências de versão", () => {
  const audit = read("tools/audit-project.cjs");
  assert.match(audit, /Token de ativos divergente/);
  assert.match(audit, /Cache-busting divergente/);
  assert.match(audit, /Versão do service worker divergente/);
  assert.match(audit, /Manifesto de build não deriva a versão diretamente do package\.json/);
});
