const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const APP_CONFIG = fs.readFileSync(path.join(ROOT, "static", "js", "app-config.js"), "utf8");
const CORE = fs.readFileSync(path.join(ROOT, "static", "js", "core.js"), "utf8");
const SW = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const HEADER_CSS = fs.readFileSync(path.join(ROOT, "static", "styles_v110_header_kpi.css"), "utf8");

const PREVIEW_FILE = path.join(ROOT, "static", "styles_v117_header_compact_preview.css");

test("V118+ mantém o topo aprovado consolidado sem a camada experimental antiga", () => {
  const major = Number(String(PACKAGE.version || "").split(".")[0]);
  assert.ok(major >= 118);

  assert.equal(fs.existsSync(PREVIEW_FILE), false);
  assert.doesNotMatch(INDEX, /styles_v117_header_compact_preview\.css/);
  assert.doesNotMatch(INDEX, /v117-header-preview/);
  assert.match(INDEX, /styles_v110_header_kpi\.css\?v=\d+/);

  const packageVersionPattern = new RegExp(
    `version:\\s*"${PACKAGE.version.replace(/\./g, "\\.")}"`
  );
  assert.match(APP_CONFIG, packageVersionPattern);
  assert.match(APP_CONFIG, /assetVersion:\s*"\d+"/);
  assert.match(CORE, /!==\s*"\d+"/);
  assert.match(SW, /const VERSION = "v\d+"/);
});

test("V118 mantém no CSS principal as proporções aprovadas na etapa experimental", () => {
  assert.match(HEADER_CSS, /--v110-control-height:\s*38px/);
  assert.match(HEADER_CSS, /minmax\(280px,\s*300px\)/);
  assert.match(HEADER_CSS, /min-height:\s*68px\s*!important/);
  assert.match(HEADER_CSS, /max-width:\s*300px\s*!important/);
  assert.match(HEADER_CSS, /min-height:\s*42px\s*!important/);
  assert.match(HEADER_CSS, /width:\s*min\(100%,\s*500px\)\s*!important/);
  assert.match(HEADER_CSS, /min-width:\s*88px\s*!important/);
});

test("V118 preserva conforto de toque em tablet e dispositivos coarse", () => {
  assert.match(HEADER_CSS, /@media \(max-width:\s*800px\)/);
  assert.match(HEADER_CSS, /@media \(pointer:\s*coarse\)/);
  assert.match(HEADER_CSS, /min-height:\s*44px\s*!important/);
});
