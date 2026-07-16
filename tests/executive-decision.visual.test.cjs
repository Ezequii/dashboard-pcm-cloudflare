const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(
  path.join(ROOT, "static", "styles_v100_executive_decision.css"),
  "utf8"
);

test("carrega o polimento executivo após os estilos existentes", () => {
  assert.match(
    INDEX,
    /styles_v100_top_hierarchy\.css\?v=10060"[\s\S]*styles_v100_executive_decision\.css\?v=10070"/
  );
  assert.match(INDEX, /<body[^>]*\bv100-executive-decision\b/);
});

test("preserva os IDs e elementos interativos dos KPIs", () => {
  [
    "kpiValorAndamentoCard",
    "kpiPendenciasCard",
    "kpiConcluidoCard",
    "firstFocusV991",
    "kpiFocoPcmCard",
    "farolRegional",
    "kpiMaisParadoCard",
    "openAllPrioritiesV991",
  ].forEach(id => {
    assert.match(INDEX, new RegExp(`id="${id}"`));
  });
});

test("o escopo visual permanece restrito à classe da entrega", () => {
  assert.match(CSS, /body\.v100-executive-decision \.executive-primary-v991/);
  assert.match(CSS, /body\.v100-executive-decision \.hero-metric-v991/);
  assert.match(CSS, /body\.v100-executive-decision \.queue-panel-v991/);
});

test("mantém foco visível e suporte a movimento reduzido", () => {
  assert.match(CSS, /:focus-visible[\s\S]*outline:\s*3px solid #1d4ed8/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(CSS, /transition:\s*none !important/);
});

test("possui layouts responsivos sem alterar a marcação dos componentes", () => {
  assert.match(CSS, /@media \(max-width: 1280px\)/);
  assert.match(CSS, /@media \(max-width: 900px\)/);
  assert.match(CSS, /@media \(max-width: 640px\)/);
  assert.match(CSS, /grid-template-columns:\s*1fr !important/);
});
