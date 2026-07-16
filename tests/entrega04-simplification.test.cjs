const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CORE = fs.readFileSync(path.join(ROOT, "static", "js", "core.js"), "utf8");
const FILTERS = fs.readFileSync(path.join(ROOT, "static", "js", "filters.js"), "utf8");
const CSS = fs.readFileSync(path.join(ROOT, "static", "styles_v100_global_context.css"), "utf8");

test("Contexto Aplicado foi removido da interface", () => {
  assert.doesNotMatch(INDEX, /id="activeFilters"/);
  assert.doesNotMatch(INDEX, />\s*Contexto aplicado\s*</i);
  assert.doesNotMatch(FILTERS, /active-filter-chip-v97|filter-scope-badge-v994a5/);
});

test("Barra possui uma única ação global de limpeza", () => {
  assert.match(INDEX, /id="globalContextClearAll"/);
  assert.match(INDEX, />\s*Limpar tudo\s*</);
  assert.match(CORE, /globalContextClearAll[\s\S]*clearAll\(\)/);
});

test("limpeza redefine contexto e atualiza a interface", () => {
  assert.match(CORE, /Object\.keys\(state\.filters\)\.forEach/);
  assert.match(CORE, /state\.search\s*=\s*''/);
  assert.match(CORE, /state\.dateFrom\s*=\s*state\.dateTo\s*=\s*state\.valueMin\s*=\s*state\.valueMax\s*=\s*''/);
  assert.match(CORE, /window\.resetProductivityStateV99\?\.\(\)/);
  assert.match(CORE, /await refreshAll\(true\)/);
  assert.match(CORE, /updateFilterUI\(\);[\s\S]*showToast\('Filtros redefinidos\.'\)/);
});

test("Barra volta ao estado Geral e desabilita limpeza sem contexto ativo", () => {
  assert.match(CORE, /view\.id\s*!==\s*"GERAL"/);
  assert.match(CORE, /clearButton\.disabled\s*=\s*!active/);
  assert.match(CORE, /deriveGlobalContextItemsV100/);
});

test("botão possui foco visível e comportamento responsivo", () => {
  assert.match(CSS, /\.global-context-clear-v100:focus-visible[\s\S]*outline:\s*3px\s+solid\s+#1d4ed8/);
  assert.match(CSS, /@media \(max-width:\s*640px\)[\s\S]*\.global-context-v100[\s\S]*flex-wrap:\s*wrap/);
});
