const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const table = fs.readFileSync(path.join(ROOT, "static", "js", "table.js"), "utf8");
const productivity = fs.readFileSync(
  path.join(ROOT, "static", "js", "productivity-v99.js"),
  "utf8"
);
const state = fs.readFileSync(path.join(ROOT, "static", "js", "state.js"), "utf8");
const api = fs.readFileSync(path.join(ROOT, "static", "js", "api.js"), "utf8");
const css = fs.readFileSync(
  path.join(ROOT, "static", "styles_v107_base_cleanup.css"),
  "utf8"
);

test("remove os controles solicitados da interface", () => {
  [
    "btnOpenFilters",
    "btnOpenMultiSearchV99",
    "btnSavedViewsV99",
    "btnShareViewV99",
    "selectionBarV99",
    "multiSearchDialogV99",
    "savedViewsDialogV99",
  ].forEach(id => assert.doesNotMatch(html, new RegExp(`id="${id}"`)));
});

test("remove a seleção por checkbox da renderização e do runtime", () => {
  assert.doesNotMatch(table, /renderSelectionHeaderV99|renderRowCheckboxV99|isRowSelectedV99/);
  assert.doesNotMatch(productivity, /selectedRowsV99|row-select-v99|selectPageV99|selectAllFilteredV99/);
  assert.doesNotMatch(html, /type="checkbox"[^>]*data-row-id|selectedCountV99/);
});

test("busca múltipla não é restaurada, persistida ou enviada", () => {
  assert.match(state, /state\.multiSearchTerms\s*=\s*\[\]/);
  assert.doesNotMatch(state, /multiSearchTerms:\s*state\.multiSearchTerms/);
  assert.doesNotMatch(api.match(/function baseQuery\(\)[\s\S]*?\n\}/)?.[0] || "", /multi_search_terms/);
  assert.match(productivity, /function restoreProductivityStateV99\(\)\{[\s\S]*?return false;/);
});

test("filtros avançados ficam junto à busca principal", () => {
  const searchStart = html.indexOf('class="smart-search-v89"');
  const searchEnd = html.indexOf("</div>", html.indexOf('class="search-actions-v107"', searchStart)) + 6;
  const searchBlock = html.slice(searchStart, searchEnd);
  assert.match(searchBlock, /class="search-actions-v107"/);
  assert.match(searchBlock, /id="btnToggleAdvancedSearch"/);
  assert.match(css, /\.search-actions-v107[\s\S]*grid-row:1/);
  assert.match(css, /\.advanced-toggle[\s\S]*height:44px/);
});
