
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const filters = fs.readFileSync(
  path.join(__dirname, "..", "static", "js", "filters.js"),
  "utf8"
);
const core = fs.readFileSync(
  path.join(__dirname, "..", "static", "js", "core.js"),
  "utf8"
);
const productivity = fs.readFileSync(
  path.join(__dirname, "..", "static", "js", "productivity-v99.js"),
  "utf8"
);
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("sincronização da barra ocorre no ponto central updateFilterUI", () => {
  assert.match(
    filters,
    /function updateFilterUI\(\)[\s\S]*window\.syncQuickChips\?\.\(\);[\s\S]*window\.renderGlobalContextV100\?\.\(\);/
  );
});

test("chips e barra compartilham o mesmo derivador de Visão", () => {
  assert.match(core, /function quickFilterKindFromState\(\)[\s\S]*deriveOperationalViewV100\(state\.filters\)/);
  assert.match(core, /function deriveGlobalContextItemsV100[\s\S]*deriveOperationalViewV100\(filters\)/);
  assert.equal((core.match(/function deriveOperationalViewV100/g) || []).length, 1);
});

test("normalizador da busca múltipla é compartilhado e usado na restauração", () => {
  assert.match(productivity, /function normalizeMultiSearchTermsV100/);
  assert.match(productivity, /multiSearchTerms:\s*normalizeMultiSearchTermsV100\(view\.multiSearchTerms\)/);
  assert.match(productivity, /window\.normalizeMultiSearchTermsV100\s*=/);
  assert.match(core, /window\.normalizeMultiSearchTermsV100/);
});

test("barra é única e fica fora dos painéis das abas", () => {
  const barIndex = html.indexOf('id="globalContextBar"');
  const firstPanelIndex = html.indexOf('data-panel="visao"');
  assert.ok(barIndex > 0);
  assert.ok(firstPanelIndex > barIndex);
  assert.equal((html.match(/id="globalContextBar"/g) || []).length, 1);
});

test("derivação e renderização não chamam API nem segurança", () => {
  const start = core.indexOf("function deriveGlobalContextItemsV100");
  const end = core.indexOf("function switchTab", start);
  const contextBlock = core.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(contextBlock, /\bapi\s*\(/);
  assert.doesNotMatch(contextBlock, /Security|permission|role/i);
});
