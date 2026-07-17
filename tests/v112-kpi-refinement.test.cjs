const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

const html = read("index.html");
const css = read("static/styles_v112_kpi_refinement.css");
const pkg = JSON.parse(read("package.json"));
const config = read("static/js/app-config.js");
const core = read("static/js/core.js");
const sw = read("sw.js");

test("V112 mantém os cinco KPIs no mesmo sistema de eixos", () => {
  assert.match(html, /v112-kpi-refinement/);
  assert.match(css, /\.executive-primary-v991[\s\S]*grid-auto-rows:\s*var\(--v112-kpi-height\)/);
  assert.match(css, /\.kpi-copy-v111[\s\S]*var\(--v112-title-row\)[\s\S]*var\(--v112-value-row\)[\s\S]*var\(--v112-detail-row\)[\s\S]*var\(--v112-support-row\)/);
  assert.match(css, /\.kpi-copy-v111 > small,[\s\S]*height:\s*var\(--v112-title-row\)/);
  assert.match(css, /\.kpi-copy-v111 > strong,[\s\S]*height:\s*var\(--v112-value-row\)/);
});

test("primeiro foco preserva largura do valor e ancora a ação no rodapé", () => {
  assert.match(css, /\.executive-primary-v991 > \.kpi-focus-v111[\s\S]*grid-template-columns:[\s\S]*var\(--v111-kpi-icon\)[\s\S]*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.kpi-focus-v111 #focusSupplierV991[\s\S]*padding-right:\s*0/);
  assert.match(css, /\.kpi-focus-v111 > \.hero-open-v991[\s\S]*position:\s*absolute/);
  assert.match(css, /\.kpi-focus-v111 > \.hero-open-v991[\s\S]*bottom:\s*var\(--v112-card-padding\)/);
  assert.match(css, /\.kpi-focus-v111 #focusMetaV991[\s\S]*padding-right:\s*102px/);
});

test("pendência mais antiga usa detalhe e apoio sem comprimir título e valor", () => {
  assert.match(css, /#kpiMaisParadoCard \.oldest-context-v96[\s\S]*grid-row:\s*3\s*\/\s*5/);
  assert.match(css, /#kpiMaisParadoCard \.oldest-context-v96[\s\S]*grid-template-rows:\s*16px 19px minmax\(20px,\s*1fr\)/);
  assert.match(css, /#kpiMaisParadoCard \.oldest-open-v994a5[\s\S]*align-self:\s*end/);
  assert.match(css, /#kpiMaisParadoCard \.oldest-open-v994a5[\s\S]*min-height:\s*20px/);
});

test("celular devolve a ação ao fluxo e remove qualquer sobreposição", () => {
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.kpi-focus-v111 > \.hero-open-v991[\s\S]*position:\s*static/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*#focusMetaV991[\s\S]*padding-right:\s*0/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*\.oldest-context-v96[\s\S]*grid-row:\s*auto/);
});

test("V112 permanece integrada como camada histórica do sistema de KPIs", () => {
  assert.match(html, /v112-kpi-refinement/);
  assert.match(html, /styles_v112_kpi_refinement\.css\?v=11200/);
  assert.ok(Number.parseInt(String(pkg.version).split(".")[0], 10) >= 112);
  assert.match(config, /assetVersion:\s*"\d+"/);
  assert.match(core, /assetVersion \|\| ""\) !== "\d+"/);
  assert.match(sw, /const VERSION = "v\d+"/);
});
