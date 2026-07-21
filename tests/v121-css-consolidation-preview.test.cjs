const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const BUNDLE_PATH = path.join(ROOT, "static", "styles_v121_consolidated_preview.css");
const BUNDLE = fs.readFileSync(BUNDLE_PATH, "utf8");
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

const sourceHrefs = [...INDEX.matchAll(
  /<link rel="stylesheet" href="(\/static\/[^"]+\.css\?v=[^"]+)" media="not all" data-v121-css-source="true" \/>/g
)].map((match) => match[1]);

test("V121 usa uma única folha CSS ativa para a prévia consolidada", () => {
  assert.equal(sourceHrefs.length, 28);
  assert.match(
    INDEX,
    /<link rel="stylesheet" href="\/static\/styles_v121_consolidated_preview\.css\?v=12100" data-v121-css-preview="active" \/>/
  );
  const activeStylesheets = [...INDEX.matchAll(/<link rel="stylesheet"[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => !/media="not all"/.test(tag));
  assert.equal(activeStylesheets.length, 1);
});

test("V121 preserva no bundle a ordem exata das 28 folhas CSS da V120", () => {
  let cursor = -1;
  for (const href of sourceHrefs) {
    const relative = href.split("?")[0].replace(/^\//, "");
    const marker = `/* >>> BEGIN SOURCE: ${relative} >>> */`;
    const position = BUNDLE.indexOf(marker);
    assert.ok(position > cursor, `Fonte fora de ordem no bundle: ${relative}`);
    cursor = position;
  }
});

test("V121 mantém as folhas originais preservadas para rollback", () => {
  for (const href of sourceHrefs) {
    const relative = href.split("?")[0].replace(/^\//, "");
    assert.equal(fs.existsSync(path.join(ROOT, relative)), true, relative);
  }
});

test("V121 mantém no bundle os refinamentos definitivos do topo e do drawer", () => {
  assert.match(BUNDLE, /V110 — topo executivo e KPI de pendência/);
  assert.match(BUNDLE, /\.detail-field-v994a2\[data-detail-priority="true"\]/);
  assert.match(BUNDLE, /v113-kpi-content-alignment/);
});

test("V121 preserva sincronização de versão nas versões posteriores", () => {
  const major = Number(String(PACKAGE.version).split(".")[0]);
  assert.ok(major >= 121);
  const token = `${major}00`;
  assert.match(INDEX, new RegExp(`>V${major}<\\/span>`));
  assert.match(INDEX, new RegExp(`app-config\\.js\\?v=${token}`));
  assert.match(INDEX, new RegExp(`core\\.js\\?v=${token}`));
  const appConfig = fs.readFileSync(path.join(ROOT, "static", "js", "app-config.js"), "utf8");
  const core = fs.readFileSync(path.join(ROOT, "static", "js", "core.js"), "utf8");
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  assert.match(appConfig, new RegExp(`version: "${major}\\.0\\.0"`));
  assert.match(appConfig, new RegExp(`assetVersion: "${token}"`));
  assert.match(core, new RegExp(`!== "${token}"`));
  assert.match(sw, new RegExp(`const VERSION = "v${major}"`));
});
