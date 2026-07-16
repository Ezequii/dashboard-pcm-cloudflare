const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(path.join(ROOT, "static", "styles_v100_executive_composed.css"), "utf8");

test("carrega a camada executiva consolidada", () => {
  assert.match(INDEX, /styles_v100_executive_composed\.css\?v=10110/);
  assert.match(INDEX, /v100-executive-composed/);
});

test("KPIs preservam os cinco componentes existentes em grade explícita", () => {
  assert.match(INDEX, /id="kpiValorAndamentoCard"/);
  assert.match(INDEX, /id="kpiPendenciasCard"/);
  assert.match(INDEX, /id="kpiConcluidoCard"/);
  assert.match(INDEX, /id="firstFocusV991"/);
  assert.match(INDEX, /id="kpiMaisParadoCard"/);
  assert.match(CSS, /\.executive-primary-v991\s*\{[\s\S]*grid-template-columns:/);
});

test("fila prioritária recebe destaque sem alteração estrutural", () => {
  assert.match(INDEX, /id="topPrioridades"/);
  assert.match(CSS, /\.queue-panel-v991\s*\{[\s\S]*box-shadow:/);
});
