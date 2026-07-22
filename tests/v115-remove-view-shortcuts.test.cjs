const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");

const html = read("index.html");
const css = read("static/styles_v115_context_base.css");
const dashboard = read("static/js/dashboard.js");
const core = read("static/js/core.js");

test("V115 remove completamente o bloco Atalhos de visão da interface", () => {
  assert.doesNotMatch(html, /id="quickChips"/);
  assert.doesNotMatch(html, /id="quickFiltersTitle"/);
  assert.doesNotMatch(html, />Atalhos de visão</);
  assert.doesNotMatch(html, /class="quick-chip"/);
  assert.doesNotMatch(css, /#quickChips/);
});

test("a remoção não afeta os KPIs nem o contexto atual", () => {
  for (const id of [
    "globalContextBar",
    "kpiValorAndamentoCard",
    "kpiPendenciasCard",
    "kpiConcluidoCard",
    "firstFocusV991",
    "kpiMaisParadoCard"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(core, /resolveOperationalViewV114/);
  assert.match(dashboard, /setOperationalViewContextV114/);
});

test("a Base de Tratativa continua começando pela busca", () => {
  assert.match(
    html,
    /id="baseTableRegion"[\s\S]*id="basePanelTitle"[^>]*>Registros<\/h3>[\s\S]*id="globalSearch"/
  );
  assert.doesNotMatch(html, /class="base-overview-v991"/);
});
