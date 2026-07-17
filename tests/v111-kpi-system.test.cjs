const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

const html = read("index.html");
const css = read("static/styles_v111_kpi_system.css");
const pkg = JSON.parse(read("package.json"));
const config = read("static/js/app-config.js");
const core = read("static/js/core.js");
const sw = read("sw.js");

test("V111 aplica uma anatomia comum aos cinco KPIs", () => {
  const cardClasses = [...html.matchAll(/class="([^"]*kpi-card-v111[^"]*)"/g)];
  assert.equal(cardClasses.length, 5);
  assert.match(html, /id="kpiValorAndamentoCard"[^>]*kpi-card-v111/);
  assert.match(html, /id="kpiPendenciasCard"[^>]*kpi-card-v111/);
  assert.match(html, /id="kpiConcluidoCard"[^>]*kpi-card-v111/);
  assert.match(html, /id="firstFocusV991"[^>]*kpi-card-v111[^>]*kpi-focus-v111/);
  assert.match(html, /id="kpiMaisParadoCard"[^>]*kpi-card-v111[^>]*kpi-oldest-v111/);
  assert.equal((html.match(/kpi-copy-v111/g) || []).length, 5);
});

test("grid dos KPIs controla altura, ícones e eixos internos de forma uniforme", () => {
  assert.match(css, /\.executive-primary-v991[\s\S]*grid-auto-rows:\s*var\(--v111-kpi-height\)/);
  assert.match(css, /\.executive-primary-v991 > \.kpi-card-v111[\s\S]*height:\s*var\(--v111-kpi-height\)/);
  assert.match(css, /\.kpi-card-v111 > \.hero-icon-v991[\s\S]*align-self:\s*center/);
  assert.match(css, /\.kpi-copy-v111[\s\S]*grid-template-rows:\s*24px 32px 46px 12px/);
  assert.match(css, /\.kpi-copy-v111 > small[\s\S]*height:\s*24px/);
  assert.match(css, /\.kpi-copy-v111 > strong[\s\S]*height:\s*32px/);
});

test("pendência mais antiga segue a mesma estrutura dos demais indicadores", () => {
  assert.match(html, /id="kpiMaisParadoCard"[^>]*hero-metric-v991/);
  assert.match(html, /class="[^"]*hero-icon-v991[^"]*alert-icon-v991[^"]*oldest-icon-v111/);
  assert.match(html, /class="[^"]*hero-copy-v991[^"]*oldest-copy-v111/);
  assert.match(css, /#kpiMaisParadoCard\.kpi-oldest-v111[\s\S]*grid-template-areas:\s*none/);
  assert.match(css, /#kpiMaisParadoCard \.oldest-context-v96[\s\S]*grid-template-rows:\s*13px 18px 13px/);
  assert.match(css, /#kpiMaisParadoCard \.oldest-open-v994a5[\s\S]*justify-self:\s*start/);
});

test("responsividade mantém cartões alinhados e libera altura no celular", () => {
  assert.match(css, /@media \(min-width:\s*1100px\) and \(max-width:\s*1279px\)/);
  assert.match(css, /@media \(min-width:\s*561px\) and \(max-width:\s*1099px\)/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*grid-auto-rows:\s*auto/);
  assert.match(css, /@media \(max-width:\s*560px\)[\s\S]*height:\s*auto\s*!important/);
  assert.match(css, /\.kpi-focus-v111 > \.hero-open-v991[\s\S]*grid-column:\s*2/);
});

test("V111 mantém identificadores de versão e cache sincronizados", () => {
  assert.equal(pkg.version, "111.0.0");
  assert.match(html, />V111<\/span>/);
  assert.match(html, /styles_v111_kpi_system\.css\?v=11100/);
  assert.match(html, /app-config\.js\?v=11100/);
  assert.match(html, /core\.js\?v=11100/);
  assert.match(html, /v111-kpi-system/);
  assert.match(config, /version:\s*"111\.0\.0"/);
  assert.match(config, /assetVersion:\s*"11100"/);
  assert.match(core, /assetVersion \|\| ""\) !== "11100"/);
  assert.match(sw, /const VERSION = "v111"/);
});
