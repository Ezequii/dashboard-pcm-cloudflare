const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(
  path.join(ROOT, "static", "styles_v100_executive_composed.css"),
  "utf8"
);

test("usa uma única camada visual consolidada para topo e visão executiva", () => {
  assert.match(INDEX, /styles_v100_executive_composed\.css\?v=10100/);
  assert.doesNotMatch(INDEX, /styles_v100_top_hierarchy\.css/);
  assert.doesNotMatch(INDEX, /styles_v100_executive_decision\.css/);
  assert.doesNotMatch(INDEX, /styles_v100_executive_no_redundancy\.css/);
  assert.doesNotMatch(INDEX, /styles_v100_executive_final_polish\.css/);
  assert.match(INDEX, /v100-executive-composed/);
});

test("cabeçalho não é sticky e não sobrepõe o conteúdo ao rolar", () => {
  assert.match(
    CSS,
    /\.topbar-v994a4\s*\{[\s\S]*position:\s*relative\s*!important[\s\S]*top:\s*auto\s*!important/
  );
});

test("atalhos ficam ocultos somente na visão executiva", () => {
  assert.match(
    CSS,
    /active-tab-visao\s+#quickChips\s*\{[\s\S]*display:\s*none\s*!important/
  );
});

test("KPIs, fluxo, fila e rankings usam grades explícitas", () => {
  assert.match(CSS, /\.executive-primary-v991\s*\{[\s\S]*grid-template-columns:/);
  assert.match(CSS, /\.operations-grid-v991\s*\{[\s\S]*grid-template-columns:/);
  assert.match(CSS, /\.ranking-grid-v991\s*\{[\s\S]*grid-template-columns:\s*1fr\s+1fr/);
});

test("fluxo é apresentado como pipeline contínuo", () => {
  assert.match(CSS, /\.process-flow-v991::before\s*\{[\s\S]*height:\s*2px/);
  assert.match(CSS, /\.flow-step-v994a2\s*\{[\s\S]*border:\s*0\s*!important/);
});

test("mantém foco visível e redução de movimento", () => {
  assert.match(CSS, /focus-visible[\s\S]*outline:\s*3px\s+solid\s+#1d4ed8/);
  assert.match(CSS, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
