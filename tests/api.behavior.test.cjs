const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SOURCE = fs.readFileSync(
  path.join(__dirname, "..", "static", "js", "api.js"),
  "utf8"
);

function loadApi() {
  const context = {
    console: { error() {}, warn() {}, log() {} },
    window: {
      PCM_APP_CONFIG: {},
      beginRequestV994a() {
        const controller = new AbortController();
        return {
          signal: controller.signal,
          finish() {},
        };
      },
      SecurityV994a: {
        canViewOperationalData: () => true,
        assertOperationalAccess() {},
      },
    },
    state: {},
    fetch: async () => {
      throw new Error("fetch não esperado neste teste");
    },
    AbortController,
    Blob,
    URLSearchParams,
    setTimeout,
    clearTimeout,
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(SOURCE, context, { filename: "api.js" });
  return context;
}

test("applyStaticQuery mantém funcionamento para consulta válida", () => {
  const runtime = loadApi();
  const rows = [
    { ETAPA: "ORÇAMENTO", PREFIXO: "ABC", _VALOR_TOTAL: 10 },
    { ETAPA: "CONCLUÍDO", PREFIXO: "XYZ", _VALOR_TOTAL: 20 },
  ];
  const result = runtime.applyStaticQuery(rows, { filters: { ETAPA: ["ORÇAMENTO"] } });
  assert.equal(result.length, 1);
  assert.equal(result[0].PREFIXO, "ABC");
});

test("applyStaticQuery falha fechado e não devolve toda a base", () => {
  const runtime = loadApi();
  assert.throws(
    () => runtime.applyStaticQuery(null, {}),
    (error) =>
      error &&
      error.name === "DataSchemaError" &&
      /filtros com segurança/i.test(error.message)
  );
});
