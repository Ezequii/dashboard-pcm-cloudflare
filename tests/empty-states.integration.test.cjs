const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const CORE_SOURCE = fs.readFileSync(
  path.join(__dirname, "..", "static", "js", "core.js"),
  "utf8"
);
const PRODUCTIVITY_SOURCE = fs.readFileSync(
  path.join(__dirname, "..", "static", "js", "productivity-v99.js"),
  "utf8"
);

function element(id, document) {
  return {
    id,
    hidden: false,
    disabled: false,
    isConnected: true,
    value: "",
    attributes: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    focus() {
      document.activeElement = this;
    },
  };
}

function loadCore() {
  const elements = new Map();
  const document = {
    activeElement: null,
    body: null,
    documentElement: null,
    querySelectorAll() { return []; },
    getElementById(id) { return elements.get(id) || null; },
  };
  document.body = element("body", document);
  document.documentElement = element("html", document);
  document.activeElement = document.body;

  [
    "globalSearch",
    "basePanelTitle",
    "baseTableRegion",
    "emptyStateReloadButton",
  ].forEach(id => elements.set(id, element(id, document)));

  const calls = {
    productivityClear: 0,
    dashboard: 0,
    rows: 0,
    apiRefresh: 0,
    busy: [],
  };

  const state = {
    filters: {
      FORNECEDOR: ["A"],
      ETAPA: ["SEM NF"],
    },
    search: "RC",
    dateFrom: "2026-01-01",
    dateTo: "2026-01-31",
    valueMin: "0",
    valueMax: "100",
    page: 4,
    pageSize: 200,
    sortCol: "ETAPA",
    sortDir: "asc",
    activeTab: "base",
    dashboardSeq: 0,
    rowsSeq: 0,
    refreshPromise: null,
    refreshQueued: false,
    isRefreshing: false,
  };

  const context = {
    console: { error() {}, warn() {}, log() {} },
    state,
    window: {
      clearProductivityQueryContextV100() {
        calls.productivityClear += 1;
      },
      syncEmptyStateReloadUiV100(active) {
        calls.busy.push(Boolean(active));
      },
    },
    document,
    debounce(fn) { return fn; },
    $: id => elements.get(id) || null,
    savePreferences() {},
    updateFilterUI() {},
    hydrateAdvancedSearch() {},
    loadDashboard: async () => { calls.dashboard += 1; },
    loadRows: async () => { calls.rows += 1; },
    updateDataFreshness() {},
    clearDataError() {},
    showToast() {},
    showDataStatus() {},
    cacheClear() {},
    api: async route => {
      if(route === "/api/refresh") {
        calls.apiRefresh += 1;
        return {
          data_version: "1",
          generated_at: "",
          publication_status: {},
          metadata: {},
          linhas: 0,
          message: "Atualizado",
        };
      }
      return {};
    },
    closeAllPopovers() {},
    closeFilterDrawer() {},
    setTimeout,
    clearTimeout,
    setInterval() {},
    requestAnimationFrame(fn) { fn(); },
  };
  context.window.window = context.window;

  vm.createContext(context);
  vm.runInContext(CORE_SOURCE, context, { filename: "core.js" });

  return { context, state, document, elements, calls };
}

test("limpeza ampla remove somente o contexto aprovado e preserva preferências", async () => {
  const runtime = loadCore();
  const { state, context, document, elements, calls } = runtime;
  const origin = element("emptyStateClearContextButton", document);
  document.activeElement = origin;

  await context.window.clearQueryContextEmptyStateV100();

  assert.deepEqual(JSON.parse(JSON.stringify(state.filters)), {
    FORNECEDOR: [],
    ETAPA: [],
  });
  assert.equal(state.search, "");
  assert.equal(state.dateFrom, "");
  assert.equal(state.dateTo, "");
  assert.equal(state.valueMin, "");
  assert.equal(state.valueMax, "");
  assert.equal(state.page, 1);
  assert.equal(state.pageSize, 200);
  assert.equal(state.sortCol, "ETAPA");
  assert.equal(state.sortDir, "asc");
  assert.equal(calls.productivityClear, 1);
  assert.equal(document.activeElement, elements.get("basePanelTitle"));
});

test("troca para outra aba cancela restauração automática de foco", async () => {
  const runtime = loadCore();
  const { context, state, document } = runtime;
  const origin = element("emptyStateClearContextButton", document);
  document.activeElement = origin;

  const operation = context.window.clearQueryContextEmptyStateV100();
  state.activeTab = "visao";
  context.window.cancelBaseFocusIntentV100();
  await operation;

  assert.notEqual(document.activeElement?.id, "basePanelTitle");
});

test("recargas repetidas reutilizam a mesma operação", async () => {
  const runtime = loadCore();
  const { context, calls } = runtime;

  const first = context.window.reloadEmptyStateDataV100();
  const second = context.window.reloadEmptyStateDataV100();

  assert.equal(first, second);
  await first;
  assert.equal(calls.apiRefresh, 1);
  assert.deepEqual(calls.busy, [true, false]);
});

test("função restrita de produtividade não altera drawer nem preferências", () => {
  const match = PRODUCTIVITY_SOURCE.match(
    /function clearProductivityQueryContextV100\(\)\s*\{([\s\S]*?)\n  \}/
  );
  assert.ok(match, "Função restrita não encontrada.");
  assert.match(match[1], /state\.multiSearchTerms\s*=\s*\[\]/);
  assert.match(match[1], /selectedRowsV99\.clear\(\)/);
  assert.doesNotMatch(match[1], /detailRowsV99|activeDetailRowV99|columnPreferencesV99|localStorage/);
});
