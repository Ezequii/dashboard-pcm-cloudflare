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

test("carrega a versão visual clean consolidada", () => {
  assert.match(INDEX, /styles_v100_executive_composed\.css\?v=10110/);
  assert.match(INDEX, /v100-executive-composed/);
});

test("botão de filtros permanece funcional e sem card textual na visão executiva", () => {
  assert.match(INDEX, /id="btnOpenFilters"[\s\S]*<span>Filtros<\/span>/);
  assert.match(
    CSS,
    /\.filters-summary-button-v97\s*>\s*span\s*\{[\s\S]*clip:\s*rect\(0,0,0,0\)\s*!important/
  );
  assert.match(
    CSS,
    /\.filters-summary-button-v97\s*\{[\s\S]*width:\s*36px[\s\S]*border-radius:\s*9px/
  );
});

test("contexto executivo é uma faixa compacta de uma linha", () => {
  assert.match(
    CSS,
    /active-tab-visao\s+\.global-context-v100\s*\{[\s\S]*grid-template-areas:\s*"title summary filters clear"[\s\S]*min-height:\s*62px/
  );
});

test("pipeline remove cartões individuais e usa eixo contínuo", () => {
  assert.match(
    CSS,
    /active-tab-visao\s+\.process-flow-v991::before\s*\{[\s\S]*height:\s*2px[\s\S]*linear-gradient/
  );
  assert.match(
    CSS,
    /active-tab-visao\s+\.flow-step-v994a2\s*\{[\s\S]*border:\s*0\s*!important[\s\S]*background:\s*transparent\s*!important/
  );
});

test("rankings exibem três linhas compactas completas em duas colunas", () => {
  assert.match(
    CSS,
    /active-tab-visao\s+\.ranking-grid-v991\s*\{[\s\S]*grid-template-columns:\s*1fr\s+1fr/
  );
  assert.match(
    CSS,
    /active-tab-visao\s+\.ranking-row-v994a5\s*\{[\s\S]*min-height:\s*48px/
  );
});

test("mantém acessibilidade de foco e redução de movimento", () => {
  assert.match(CSS, /focus-visible[\s\S]*outline:\s*3px\s+solid\s+#1d4ed8/);
  assert.match(CSS, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
