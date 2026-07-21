
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createButton(kind) {
  const classes = new Set(["quick-chip"]);
  return {
    dataset: { quick: kind },
    attributes: { "aria-pressed": "false" },
    classList: {
      toggle(name, active) {
        if(active) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      }
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    addEventListener() {}
  };
}

function loadCore(initialFilters = {}) {
  const buttons = [
    "TODAS",
    "FORA_SLA",
    "CRITICO",
    "SEM_LANCAMENTO",
    "SEM_PEDIDO",
    "SEM_NF"
  ].map(createButton);

  const counters = {
    saves: 0,
    updates: 0,
    schedules: 0
  };

  const state = {
    filters: {
      SOLICITANTE: [],
      FORNECEDOR: [],
      ETAPA: [],
      MES_RECEBIMENTO: [],
      "SLA STATUS": [],
      "FAIXA ATRASO": [],
      ...initialFilters
    },
    page: 3
  };

  const context = {
    console,
    state,
    window: {},
    document: {
      querySelectorAll(selector) {
        return selector === "#quickChips .quick-chip" ? buttons : [];
      }
    },
    debounce(fn) {
      return (...args) => {
        counters.schedules += 1;
        return fn(...args);
      };
    },
    savePreferences() {
      counters.saves += 1;
    },
    updateFilterUI() {
      counters.updates += 1;
      context.window.syncQuickChips();
    },
    loadDashboard() {
      return Promise.resolve();
    },
    loadRows() {
      return Promise.resolve();
    },
    setLoading() {},
    updateDataFreshness() {},
    clearDataError() {},
    showToast() {},
    showDataStatus() {},
    $() {
      return null;
    },
    setInterval() {},
    setTimeout() {},
    clearTimeout() {},
    requestAnimationFrame(fn) {
      return fn();
    }
  };
  context.window.window = context.window;

  vm.createContext(context);
  const source = fs.readFileSync(
    path.join(__dirname, "..", "static", "js", "core.js"),
    "utf8"
  );
  vm.runInContext(source, context, { filename: "core.js" });

  return { context, state, buttons, counters };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function activeKinds(buttons) {
  return buttons
    .filter(button => button.attributes["aria-pressed"] === "true")
    .map(button => button.dataset.quick);
}

test("Visão geral limpa apenas o contexto operacional e preserva filtros globais", () => {
  const { context, state, buttons } = loadCore({
    SOLICITANTE: ["ANA"],
    FORNECEDOR: ["FORNECEDOR A"],
    MES_RECEBIMENTO: ["JULHO"],
    ETAPA: ["SEM NF"],
    "SLA STATUS": ["CRÍTICO"],
    "FAIXA ATRASO": ["30+ dias"]
  });

  context.window.applyQuickFilter("TODAS");

  assert.deepEqual(plain(state.filters.SOLICITANTE), ["ANA"]);
  assert.deepEqual(plain(state.filters.FORNECEDOR), ["FORNECEDOR A"]);
  assert.deepEqual(plain(state.filters.MES_RECEBIMENTO), ["JULHO"]);
  assert.deepEqual(plain(state.filters.ETAPA), []);
  assert.deepEqual(plain(state.filters["SLA STATUS"]), []);
  assert.deepEqual(plain(state.filters["FAIXA ATRASO"]), []);
  assert.equal(state.page, 1);
  assert.deepEqual(activeKinds(buttons), ["TODAS"]);
});

test("Fora do SLA aplica ATENÇÃO e CRÍTICO como preset exclusivo", () => {
  const { context, state, buttons } = loadCore({
    ETAPA: ["SEM NF"]
  });

  context.window.applyQuickFilter("FORA_SLA");

  assert.deepEqual(plain(state.filters.ETAPA), []);
  assert.deepEqual(plain(state.filters["SLA STATUS"]), ["ATENÇÃO", "CRÍTICO"]);
  assert.deepEqual(plain(state.filters["FAIXA ATRASO"]), []);
  assert.deepEqual(activeKinds(buttons), ["FORA_SLA"]);
});

test("Críticos aplica somente SLA CRÍTICO", () => {
  const { context, state, buttons } = loadCore();
  context.window.applyQuickFilter("CRITICO");

  assert.deepEqual(plain(state.filters["SLA STATUS"]), ["CRÍTICO"]);
  assert.deepEqual(activeKinds(buttons), ["CRITICO"]);
});

for (const [kind, etapa] of [
  ["SEM_LANCAMENTO", "SEM LANÇAMENTO"],
  ["SEM_PEDIDO", "SEM PEDIDO"],
  ["SEM_NF", "SEM NF"]
]) {
  test(`${kind} aplica a etapa correspondente`, () => {
    const { context, state, buttons } = loadCore({
      "SLA STATUS": ["CRÍTICO"]
    });

    context.window.applyQuickFilter(kind);

    assert.deepEqual(plain(state.filters.ETAPA), [etapa]);
    assert.deepEqual(plain(state.filters["SLA STATUS"]), []);
    assert.deepEqual(plain(state.filters["FAIXA ATRASO"]), []);
    assert.deepEqual(activeKinds(buttons), [kind]);
  });
}

test("combinação manual não representável deixa todos os presets desmarcados", () => {
  const { context, buttons } = loadCore({
    ETAPA: ["SEM NF", "SEM PEDIDO"]
  });

  context.window.syncQuickChips();

  assert.deepEqual(activeKinds(buttons), []);
});

test("sincronização atualiza classe visual e aria-pressed", () => {
  const { context, buttons } = loadCore({
    ETAPA: ["SEM NF"]
  });

  context.window.syncQuickChips();

  const semNf = buttons.find(button => button.dataset.quick === "SEM_NF");
  const geral = buttons.find(button => button.dataset.quick === "TODAS");
  assert.equal(semNf.attributes["aria-pressed"], "true");
  assert.equal(semNf.classList.contains("active"), true);
  assert.equal(geral.attributes["aria-pressed"], "false");
  assert.equal(geral.classList.contains("active"), false);
});

test("preset desconhecido falha de forma segura para Visão geral", () => {
  const { context, state, buttons } = loadCore({
    ETAPA: ["SEM NF"]
  });

  context.window.applyQuickFilter("15_DIAS");

  assert.deepEqual(plain(state.filters.ETAPA), []);
  assert.deepEqual(plain(state.filters["SLA STATUS"]), []);
  assert.deepEqual(plain(state.filters["FAIXA ATRASO"]), []);
  assert.deepEqual(activeKinds(buttons), ["TODAS"]);
});

test("aplicação do preset salva preferências, atualiza UI e agenda recálculo", () => {
  const { context, counters } = loadCore();

  context.window.applyQuickFilter("SEM_NF");

  assert.equal(counters.updates, 2);
  assert.equal(counters.saves, 1);
  assert.equal(counters.schedules, 1);
});
