const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(
  path.join(__dirname, "..", "static", "js", "table.js"),
  "utf8"
);

function loadTable() {
  const context = {
    console,
    window: {},
    state: { activeTab: "base" },
    document: {
      createElement() {
        throw new Error("DOM não esperado neste teste");
      },
      createTextNode() {
        throw new Error("DOM não esperado neste teste");
      },
    },
    $() { return null; },
    setTimeout,
    clearTimeout,
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(SOURCE, context, { filename: "table.js" });
  return context.window;
}

function query(overrides = {}) {
  return {
    filters: {},
    search: "",
    search_scope: "ALL",
    multi_search_terms: [],
    page: 1,
    page_size: 200,
    date_from: "",
    date_to: "",
    value_min: null,
    value_max: null,
    ...overrides,
  };
}

test("matriz determinística classifica todas as combinações", () => {
  const runtime = loadTable();
  const cases = [
    [query(), "BASE_EMPTY"],
    [query({ search: "RC-123" }), "SIMPLE_SEARCH"],
    [query({ multi_search_terms: ["A", "B"] }), "MULTI_SEARCH"],
    [query({ filters: { ETAPA: ["SEM NF"] } }), "FILTERS"],
    [query({ search: "RC", multi_search_terms: ["A"] }), "COMBINATION"],
    [query({ search: "RC", filters: { ETAPA: ["SEM NF"] } }), "COMBINATION"],
    [query({ multi_search_terms: ["A"], filters: { ETAPA: ["SEM NF"] } }), "COMBINATION"],
    [query({
      search: "RC",
      multi_search_terms: ["A"],
      filters: { ETAPA: ["SEM NF"] },
    }), "COMBINATION"],
  ];

  for (const [input, expected] of cases) {
    const snapshot = runtime.createTableQuerySnapshotV100(input);
    assert.equal(runtime.classifyEmptyStateV100(snapshot, 0), expected);
  }
});

test("normalização descarta critérios vazios e preserva zero válido", () => {
  const runtime = loadTable();
  const empty = runtime.createTableQuerySnapshotV100(query({
    search: "   ",
    multi_search_terms: [" ", "", null],
    filters: { ETAPA: ["", "   ", null] },
    value_min: Number.NaN,
  }));
  assert.equal(runtime.classifyEmptyStateV100(empty, 0), "BASE_EMPTY");

  const zero = runtime.createTableQuerySnapshotV100(query({ value_min: 0 }));
  assert.equal(runtime.classifyEmptyStateV100(zero, 0), "FILTERS");
});

test("snapshot é independente de mutações posteriores da consulta", () => {
  const runtime = loadTable();
  const input = query({ filters: { ETAPA: ["SEM NF"] } });
  const snapshot = runtime.createTableQuerySnapshotV100(input);

  input.filters.ETAPA[0] = "CONCLUÍDO";
  input.search = "ALTERADO";

  assert.equal(snapshot.search, "");
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot.filters)), {
    ETAPA: ["SEM NF"],
  });
});

test("total maior que zero nunca é classificado como estado vazio", () => {
  const runtime = loadTable();
  const snapshot = runtime.createTableQuerySnapshotV100(
    query({ filters: { ETAPA: ["SEM NF"] } })
  );
  assert.equal(runtime.classifyEmptyStateV100(snapshot, 1), null);
});


test("assinatura considera escopo, modo múltiplo e ignora datas inválidas", () => {
  const runtime = loadTable();
  const first = runtime.createTableQuerySnapshotV100(query({
    search: "ABC",
    search_scope: "FORNECEDOR",
    multi_search_terms: ["A", "B"],
    multi_search_mode: "ANY",
    date_from: "data-inválida",
  }));
  const second = runtime.createTableQuerySnapshotV100(query({
    search: "ABC",
    search_scope: "SOLICITANTE",
    multi_search_terms: ["A", "B"],
    multi_search_mode: "ALL",
    date_from: "data-inválida",
  }));

  assert.notEqual(first.signature, second.signature);
  assert.equal(first.dateFrom, "");
  assert.equal(runtime.classifyEmptyStateV100(
    runtime.createTableQuerySnapshotV100(query({ date_from: "data-inválida" })),
    0
  ), "BASE_EMPTY");
});

test("limpeza ampla não menciona a seleção de linhas removida", () => {
  const runtime = loadTable();
  const snapshot = runtime.createTableQuerySnapshotV100(
    query({ filters: { ETAPA: ["SEM NF"] } })
  );
  const descriptor = runtime.createEmptyStateDescriptorV100(snapshot, 0);

  assert.equal(descriptor.action, "clear-context");
  assert.equal(descriptor.actionLabel, "Limpar filtros e buscas");
  assert.doesNotMatch(descriptor.description, /seleção/i);
});

test("busca simples limpa apenas a busca", () => {
  const runtime = loadTable();
  const snapshot = runtime.createTableQuerySnapshotV100(
    query({ search: "RC-123" })
  );
  const descriptor = runtime.createEmptyStateDescriptorV100(snapshot, 0);

  assert.equal(descriptor.kind, "SIMPLE_SEARCH");
  assert.equal(descriptor.action, "clear-search");
  assert.equal(descriptor.actionLabel, "Limpar busca");
});
