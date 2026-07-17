const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

const html = read("index.html");
const css = read("static/styles_v113_kpi_content_alignment.css");
const pkg = JSON.parse(read("package.json"));
const config = read("static/js/app-config.js");
const core = read("static/js/core.js");
const sw = read("sw.js");

test("V113 mantém dimensões externas e altera somente o alinhamento interno", () => {
  assert.match(html, /v113-kpi-content-alignment/);
  assert.match(html, /styles_v113_kpi_content_alignment\.css\?v=11300/);
  assert.doesNotMatch(css, /--v113-kpi-height/);
  assert.doesNotMatch(css, /grid-auto-rows:\s*var\(--v113/);
  assert.match(css, /Mantém dimensões externas da V112/);
});

test("os cinco KPIs usam quatro faixas internas idênticas", () => {
  assert.match(css, /--v113-title-row:\s*24px/);
  assert.match(css, /--v113-value-row:\s*32px/);
  assert.match(css, /--v113-detail-row:\s*28px/);
  assert.match(css, /--v113-footer-row:\s*24px/);
  assert.match(css, /\.kpi-copy-v111[\s\S]*grid-template-rows:[\s\S]*var\(--v113-title-row\)[\s\S]*var\(--v113-value-row\)[\s\S]*var\(--v113-detail-row\)[\s\S]*var\(--v113-footer-row\)/);
  assert.match(css, /\.kpi-copy-v111[\s\S]*align-content:\s*center/);
});

test("progresso, botão e link ocupam a mesma faixa inferior", () => {
  assert.match(css, /\.hero-progress-v991[\s\S]*grid-row:\s*4/);
  assert.match(css, /#focusMetaV991[\s\S]*grid-row:\s*4/);
  assert.match(css, /\.kpi-focus-v111 > \.hero-open-v991[\s\S]*bottom:\s*var\(--v113-content-offset\)/);
  assert.match(css, /#kpiMaisParadoCard \.oldest-context-v96[\s\S]*grid-row:\s*3\s*\/\s*5/);
  assert.match(css, /#kpiMaisParadoCard \.oldest-open-v994a5[\s\S]*min-height:\s*var\(--v113-footer-row\)/);
});

test("tablet e celular preservam legibilidade sem corte", () => {
  assert.match(css, /@media \(min-width:\s*561px\) and \(max-width:\s*1099px\)/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*grid-template-rows:\s*auto/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.kpi-focus-v111 > \.hero-open-v991[\s\S]*position:\s*static/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.oldest-context-v96[\s\S]*overflow:\s*visible/);
});

test("V113 mantém versão, ativos e cache sincronizados", () => {
  assert.equal(pkg.version, "113.0.0");
  assert.match(html, />V113<\/span>/);
  assert.match(html, /app-config\.js\?v=11300/);
  assert.match(html, /core\.js\?v=11300/);
  assert.match(config, /version:\s*"113\.0\.0"/);
  assert.match(config, /assetVersion:\s*"11300"/);
  assert.match(core, /assetVersion \|\| ""\) !== "11300"/);
  assert.match(sw, /const VERSION = "v113"/);
});
