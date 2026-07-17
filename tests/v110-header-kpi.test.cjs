const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

const html = read("index.html");
const css = read("static/styles_v110_header_kpi.css");
const pkg = JSON.parse(read("package.json"));
const config = read("static/js/app-config.js");
const core = read("static/js/core.js");
const sw = read("sw.js");

test("V110 remove a faixa colorida sem perder a separação do cabeçalho", () => {
  assert.match(css, /\.topbar,[\s\S]*border-top:\s*0\s*!important/);
  assert.match(css, /border-image:\s*none\s*!important/);
  assert.match(css, /border-bottom:\s*1px solid var\(--v110-header-line\)\s*!important/);
  assert.match(css, /box-shadow:\s*var\(--v110-header-shadow\)\s*!important/);
});

test("topo mantém navegação, status e uma única ação proporcional", () => {
  assert.doesNotMatch(html, /id="exportMenu"/);
  assert.doesNotMatch(html, /id="btnExportMenu"/);
  assert.doesNotMatch(html, /id="exportDropdown"/);
  assert.match(html, /id="btnRefresh"/);
  assert.match(html, /id="btnExportExcelTableV99"/);
  assert.match(css, /--v110-control-height:\s*42px/);
  assert.match(css, /\.top-actions-v994a4[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.match(css, /\.action-cluster-v994a4 \.btn[\s\S]*height:\s*var\(--v110-control-height\)/);
});

test("card de pendência usa estrutura equivalente aos demais KPIs", () => {
  assert.match(html, /id="kpiMaisParadoCard"[^>]*oldest-kpi-v110/);
  assert.match(html, /class="oldest-copy-v110"/);
  assert.match(html, /class="oldest-label-v110">Pendência mais antiga/);
  assert.match(css, /#kpiMaisParadoCard\.oldest-kpi-v110[\s\S]*grid-template-columns:\s*38px minmax\(0,\s*1fr\)/);
  assert.match(css, /\.oldest-context-v96[\s\S]*display:\s*grid\s*!important/);
  assert.match(css, /\.oldest-open-v994a5[\s\S]*margin:\s*1px 0 0\s*!important/);
});

test("cabeçalho e KPIs possuem composições próprias por faixa de tela", () => {
  assert.match(css, /@media \(max-width:\s*1179px\)/);
  assert.match(css, /grid-template-areas:[\s\S]*"brand tabs"[\s\S]*"actions actions"/);
  assert.match(css, /@media \(max-width:\s*800px\)/);
  assert.match(css, /grid-template-areas:[\s\S]*"brand"[\s\S]*"tabs"[\s\S]*"actions"/);
  assert.match(css, /@media \(min-width:\s*1100px\) and \(max-width:\s*1279px\)[\s\S]*repeat\(3,/);
  assert.match(css, /@media \(min-width:\s*561px\) and \(max-width:\s*1099px\)[\s\S]*repeat\(2,/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*grid-template-columns:\s*1fr/);
});

test("V110 mantém todos os identificadores de versão sincronizados", () => {
  assert.equal(pkg.version, "110.0.0");
  assert.match(html, />V110<\/span>/);
  assert.match(html, /styles_v110_header_kpi\.css\?v=11000/);
  assert.match(html, /app-config\.js\?v=11000/);
  assert.match(html, /core\.js\?v=11000/);
  assert.match(html, /v110-header-kpi/);
  assert.match(config, /version:\s*"110\.0\.0"/);
  assert.match(config, /assetVersion:\s*"11000"/);
  assert.match(core, /assetVersion \|\| ""\) !== "11000"/);
  assert.match(sw, /const VERSION = "v110"/);
});
