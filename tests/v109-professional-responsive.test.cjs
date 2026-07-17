const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

const html = read("index.html");
const css = read("static/styles_v109_professional_responsive.css");
const pkg = JSON.parse(read("package.json"));
const config = read("static/js/app-config.js");
const core = read("static/js/core.js");
const sw = read("sw.js");

test("V109 usa uma área fluida com limite profissional para monitores", () => {
  assert.match(css, /--v109-layout-max:\s*1600px/);
  assert.match(css, /--v109-layout-width:\s*min\(/);
  assert.match(css, /\.topbar-row,[\s\S]*\.page-v41[\s\S]*width:\s*var\(--v109-layout-width\)\s*!important/);
  assert.match(css, /@media \(min-width:\s*1680px\)/);
});

test("filtros e KPIs possuem grades próprias para desktop", () => {
  assert.match(css, /#mainFilters[\s\S]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  assert.match(css, /\.executive-primary-v991[\s\S]*minmax\(0,\s*1\.18fr\)/);
  assert.match(css, /\.hero-metric-v991,[\s\S]*height:\s*auto\s*!important/);
  assert.match(css, /\.focus-copy strong[\s\S]*-webkit-line-clamp:\s*2/);
});

test("notebook, tablet e celular têm composições responsivas distintas", () => {
  assert.match(css, /@media \(min-width:\s*1100px\) and \(max-width:\s*1279px\)/);
  assert.match(css, /@media \(min-width:\s*768px\) and \(max-width:\s*1099px\)/);
  assert.match(css, /@media \(max-width:\s*767px\)/);
  assert.match(css, /@media \(max-width:\s*560px\)/);
  assert.match(css, /@media \(min-width:\s*561px\) and \(max-width:\s*1099px\)[\s\S]*#kpiMaisParadoCard[\s\S]*order:\s*4[\s\S]*\.hero-focus-v991[\s\S]*order:\s*5/);
  assert.match(css, /@media \(max-width:\s*900px\)[\s\S]*ranking-grid-v994a6[\s\S]*grid-template-columns:\s*1fr\s*!important/);
});

test("fluxo e fila permanecem lado a lado quando há largura útil", () => {
  assert.match(css, /\.operations-grid-v991[\s\S]*minmax\(0,\s*1\.38fr\)[\s\S]*minmax\(420px,\s*\.82fr\)/);
  assert.match(css, /@media \(min-width:\s*768px\) and \(max-width:\s*1099px\)[\s\S]*\.operations-grid-v991[\s\S]*grid-template-columns:\s*1fr\s*!important/);
});

test("V109 está sincronizada nos arquivos críticos", () => {
  assert.equal(pkg.version, "109.0.0");
  assert.match(html, />V109<\/span>/);
  assert.match(html, /styles_v109_professional_responsive\.css\?v=10900/);
  assert.match(html, /v109-professional-responsive/);
  assert.match(config, /version:\s*"109\.0\.0"/);
  assert.match(config, /assetVersion:\s*"10900"/);
  assert.match(core, /assetVersion \|\| ""\) !== "10900"/);
  assert.match(sw, /const VERSION = "v109"/);
});
