const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(
  path.join(ROOT, "static", "styles_v117_header_compact_preview.css"),
  "utf8"
);
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const APP_CONFIG = fs.readFileSync(path.join(ROOT, "static", "js", "app-config.js"), "utf8");
const CORE = fs.readFileSync(path.join(ROOT, "static", "js", "core.js"), "utf8");
const SW = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");

test("V117 etapa 1 fica isolada em uma folha experimental carregada por último", () => {
  const styles = [...INDEX.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)]
    .map(match => match[1]);
  assert.equal(
    styles.at(-1),
    "/static/styles_v117_header_compact_preview.css?v=11700"
  );
  assert.match(INDEX, /<body[^>]+class="[^"]*\bv117-header-preview\b/);
});

test("V117 etapa 1 altera somente seletores do cabeçalho", () => {
  for (const forbidden of [
    "executive-primary-v991",
    "hero-metric-v991",
    "hero-focus-v991",
    "kpiMaisParadoCard",
    "global-context",
    "base-toolbar",
    "table",
  ]) {
    assert.doesNotMatch(CSS, new RegExp(forbidden));
  }
  for (const required of [
    "topbar-main-v994a4",
    "tabs-v994a4",
    "top-actions-v994a4",
    "data-status-group-v994a4",
    "meta-inline-v95",
    "data-freshness-v97",
    "action-cluster-v994a4",
  ]) {
    assert.match(CSS, new RegExp(required));
  }
});

test("V117 etapa 1 reduz o desktop sem reduzir áreas de toque", () => {
  assert.match(CSS, /--v117-header-control-height:\s*38px/);
  assert.match(CSS, /--v117-header-tab-height:\s*42px/);
  assert.match(CSS, /max-width:\s*300px\s*!important/);
  assert.match(CSS, /min-width:\s*88px\s*!important/);
  assert.match(CSS, /@media\s*\(pointer:\s*coarse\)/);
  assert.match(CSS, /min-height:\s*44px\s*!important/);
});

test("V117 etapa 1 mantém versão e cache sincronizados", () => {
  assert.equal(PACKAGE.version, "117.0.0");
  assert.match(INDEX, />V117<\/span>/);
  assert.match(INDEX, /app-config\.js\?v=11700/);
  assert.match(INDEX, /core\.js\?v=11700/);
  assert.match(APP_CONFIG, /version:\s*"117\.0\.0"/);
  assert.match(APP_CONFIG, /assetVersion:\s*"11700"/);
  assert.match(CORE, /assetVersion \|\| ""\) !== "11700"/);
  assert.match(SW, /const VERSION = "v117"/);
});
