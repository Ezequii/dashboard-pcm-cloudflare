
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createElement(tagName) {
  return {
    tagName: String(tagName).toUpperCase(),
    children: [],
    dataset: {},
    className: "",
    textContent: "",
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); }
  };
}

function loadCore(initialState = {}) {
  const host = createElement("dl");
  const buttons = ["TODAS","FORA_SLA","CRITICO","SEM_LANCAMENTO","SEM_PEDIDO","SEM_NF"]
    .map(kind => ({
      dataset: {quick: kind},
      classList: {toggle() {}},
      setAttribute() {},
      addEventListener() {}
    }));

  const state = {
    filters: {
      FORNECEDOR: [],
      SOLICITANTE: [],
      MES_RECEBIMENTO: [],
      ETAPA: [],
      "SLA STATUS": [],
      "FAIXA ATRASO": []
    },
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
      createElement,
      querySelectorAll(selector) {
        return selector === "#quickChips .quick-chip" ? buttons : [];
      }
    },
    $: id => id === "globalContextList" ? host : null,
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
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "static", "js", "core.js"), "utf8"),
    context,
    {filename: "core.js"}
  );

  return {context, state, host};
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("deriva Geral quando não há filtro operacional", () => {
  const {context} = loadCore();
  assert.deepEqual(
    plain(context.window.deriveOperationalViewV100({})),
    {id: "TODAS", label: "Geral"}
  );
});

test("reconhece todos os presets por correspondência exata", () => {
  const {context} = loadCore();
  const derive = context.window.deriveOperationalViewV100;

  assert.equal(derive({"SLA STATUS": ["CRÍTICO"]}).id, "CRITICO");
  assert.equal(derive({"SLA STATUS": ["CRÍTICO", "ATENÇÃO"]}).id, "FORA_SLA");
  assert.equal(derive({ETAPA: ["SEM LANÇAMENTO"]}).id, "SEM_LANCAMENTO");
  assert.equal(derive({ETAPA: ["SEM PEDIDO"]}).id, "SEM_PEDIDO");
  assert.equal(derive({ETAPA: ["SEM NF"]}).id, "SEM_NF");
});

test("deriva Personalizada para combinações não reconhecidas", () => {
  const {context} = loadCore();
  const derive = context.window.deriveOperationalViewV100;

  assert.equal(derive({ETAPA: ["SEM NF", "SEM PEDIDO"]}).id, "PERSONALIZADA");
  assert.equal(derive({ETAPA: ["SEM NF"], "SLA STATUS": ["CRÍTICO"]}).id, "PERSONALIZADA");
  assert.equal(derive({"FAIXA ATRASO": ["30+ dias"]}).id, "PERSONALIZADA");
  assert.equal(derive({"SLA STATUS": ["ATENÇÃO"]}).id, "PERSONALIZADA");
});

test("normaliza vazios, espaços e duplicados antes de derivar", () => {
  const {context} = loadCore();
  const derive = context.window.deriveOperationalViewV100;

  assert.equal(derive({ETAPA: ["", "  ", " sem nf ", "SEM NF"]}).id, "SEM_NF");
});

test("barra mostra Visão sempre e omite critérios inativos", () => {
  const {context} = loadCore();
  assert.deepEqual(
    plain(context.window.deriveGlobalContextItemsV100({
      filters: {},
      search: " ",
        dateFrom: "",
      dateTo: ""
    })),
    [{key: "view", label: "Visão", value: "Geral"}]
  );
});

test("barra mantém ordem fixa e resume múltiplos valores", () => {
  const {context} = loadCore();
  const items = context.window.deriveGlobalContextItemsV100({
    filters: {
      ETAPA: ["SEM NF"],
      FORNECEDOR: ["ACME", " ACME ", "BETA"],
      SOLICITANTE: ["ANA"],
      MES_RECEBIMENTO: ["MAIO/2026"]
    },
    dateFrom: "2026-05-10",
    dateTo: "2026-05-20",
    search: "NF123"
  });

  assert.deepEqual(
    plain(items),
    [
      {key: "view", label: "Visão", value: "Sem NF"},
      {key: "supplier", label: "Fornecedor", value: "2 selecionados"},
      {key: "requester", label: "Solicitante", value: "ANA"},
      {key: "month", label: "Mês", value: "MAIO/2026"},
      {key: "dates", label: "Datas", value: "10/05/2026–20/05/2026"},
      {key: "search", label: "Busca", value: "NF123"}
    ]
  );
});

test("datas isoladas usam textos aprovados", () => {
  const {context} = loadCore();
  const derive = context.window.deriveGlobalContextItemsV100;

  assert.equal(derive({filters:{}, dateFrom:"2026-05-10"}).find(i => i.key === "dates").value, "A partir de 10/05/2026");
  assert.equal(derive({filters:{}, dateTo:"2026-05-20"}).find(i => i.key === "dates").value, "Até 20/05/2026");
});

test("renderer cria dt e dd com textContent", () => {
  const {context, host, state} = loadCore({
    filters: {FORNECEDOR: ["<img src=x onerror=alert(1)>"]},
    search: "<script>alert(1)</script>"
  });

  context.window.renderGlobalContextV100();

  assert.equal(host.children.length, 3);
  assert.equal(host.children[1].children[1].textContent, "<img src=x onerror=alert(1)>");
  assert.equal(host.children[2].children[1].textContent, "<script>alert(1)</script>");
  assert.equal(host.children[1].children.length, 2);
});
