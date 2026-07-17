const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");

const html = read("index.html");
const coreSource = read("static/js/core.js");
const dashboard = read("static/js/dashboard.js");
const filters = read("static/js/filters.js");
const css = read("static/styles_v115_context_base.css");
const pkg = JSON.parse(read("package.json"));
const config = read("static/js/app-config.js");
const sw = read("sw.js");

function loadCore(initialState = {}) {
  const state = {
    filters: {
      FORNECEDOR: [],
      SOLICITANTE: [],
      MES_RECEBIMENTO: [],
      ETAPA: [],
      "SLA STATUS": [],
      "FAIXA ATRASO": []
    },
    operationalViewContext: null,
    search: "",
    dateFrom: "",
    dateTo: "",
    page: 1,
    ...initialState
  };
  const context = {
    console,
    state,
    window: {},
    document: {
      querySelectorAll() { return []; },
      createElement() {
        return {
          dataset: {},
          className: "",
          textContent: "",
          append() {},
          appendChild() {},
          setAttribute() {}
        };
      }
    },
    $() { return null; },
    debounce: fn => fn,
    savePreferences() {},
    updateFilterUI() {},
    loadDashboard: async () => {},
    loadRows: async () => {},
    setLoading() {},
    updateDataFreshness() {},
    clearDataError() {},
    showToast() {},
    showDataStatus() {},
    setInterval() {},
    setTimeout() {},
    clearTimeout() {},
    requestAnimationFrame: fn => fn()
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(coreSource, context, {filename: "core.js"});
  return {context, state};
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("V114 reconhece a origem dos KPIs sem alterar os filtros", () => {
  const {context, state} = loadCore();
  state.filters.ETAPA = ["SEM LANÇAMENTO", "SEM PEDIDO", "SEM NF"];
  context.window.setOperationalViewContextV114(
    "VALOR_ANDAMENTO",
    "Valor em andamento",
    state.filters
  );

  assert.deepEqual(
    plain(context.window.resolveOperationalViewV114(state)),
    {id: "VALOR_ANDAMENTO", label: "Valor em andamento"}
  );
  assert.deepEqual(
    plain(state.filters.ETAPA),
    ["SEM LANÇAMENTO", "SEM PEDIDO", "SEM NF"]
  );
});

test("filtros complementares preservam o nome da visão conhecida", () => {
  const {context, state} = loadCore();
  state.filters.ETAPA = ["SEM LANÇAMENTO", "SEM PEDIDO", "SEM NF"];
  context.window.setOperationalViewContextV114(
    "ORCS_OSS_ANDAMENTO",
    "ORÇs/OSs em andamento",
    state.filters
  );
  state.filters.SOLICITANTE = ["JOSE EDUARDO"];
  state.filters.FORNECEDOR = ["CAMPO ERE"];

  assert.equal(
    context.window.resolveOperationalViewV114(state).label,
    "ORÇs/OSs em andamento"
  );
});

test("mudança operacional manual invalida a origem e volta à derivação real", () => {
  const {context, state} = loadCore();
  state.filters.ETAPA = ["SEM LANÇAMENTO", "SEM PEDIDO", "SEM NF"];
  context.window.setOperationalViewContextV114(
    "VALOR_ANDAMENTO",
    "Valor em andamento",
    state.filters
  );

  state.filters.ETAPA = ["SEM NF"];
  assert.equal(context.window.resolveOperationalViewV114(state).label, "Sem NF");

  context.window.invalidateOperationalViewContextV114("ETAPA");
  assert.equal(state.operationalViewContext, null);
});

test("KPIs e etapas registram nomes de contexto explícitos", () => {
  for (const label of [
    "Valor em andamento",
    "ORÇs/OSs em andamento",
    "Processo concluído",
    "Primeiro foco recomendado",
    "Pendência mais antiga"
  ]) {
    assert.match(dashboard, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(dashboard, /stageViewContextV114/);
  assert.match(filters, /invalidateOperationalViewContextV114\?\.\(definition\.key\)/);
  assert.match(filters, /invalidateOperationalViewContextV114\?\.\(key\)/);
});

test("atalhos de visão foram removidos das duas abas", () => {
  assert.doesNotMatch(html, /id="quickChips"/);
  assert.doesNotMatch(html, />Atalhos de visão</);
  assert.doesNotMatch(css, /#quickChips/);
});

test("Base inicia pela busca sem o card Registros operacionais", () => {
  assert.doesNotMatch(html, /class="base-overview-v991"/);
  assert.doesNotMatch(html, />Registros operacionais<\/strong>/);
  assert.match(
    html,
    /id="baseTableRegion"[\s\S]*id="basePanelTitle"[^>]*>Registros<\/h3>[\s\S]*id="baseOverviewHintV991"[\s\S]*id="globalSearch"/
  );
  assert.match(css, /table-search input[\s\S]*border-color:\s*var\(--v114-search-border\)/);
  assert.match(css, /table-search input:focus[\s\S]*box-shadow:/);
});

test("V115 mantém pacote, configuração, runtime e cache sincronizados", () => {
  assert.equal(pkg.version, "115.0.0");
  assert.match(html, />V115<\/span>/);
  assert.match(html, /styles_v115_context_base\.css\?v=11500/);
  assert.match(html, /app-config\.js\?v=11500/);
  assert.match(html, /core\.js\?v=11500/);
  assert.match(config, /version:\s*"115\.0\.0"/);
  assert.match(config, /assetVersion:\s*"11500"/);
  assert.match(coreSource, /assetVersion \|\| ""\) !== "11500"/);
  assert.match(sw, /const VERSION = "v115"/);
});
