const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

test("bootstrap de configuração da V108 passa pela validação de runtime", () => {
  const context = {
    window: {
      addEventListener() {},
      api() {},
      buildSmartFilters() {},
      renderDashboardData() {},
      loadRows() {},
      updateFilterUI() {},
      clearProductivityQueryContextV100() {}
    },
    document: {
      readyState: "complete",
      body: null,
      getElementById() { return null; },
      addEventListener() {}
    },
    console,
    Error,
    Object,
    JSON,
    String
  };
  context.window.window = context.window;
  vm.createContext(context);

  vm.runInContext(read("static/js/app-config.js"), context);

  const core = read("static/js/core.js");
  const end = core.indexOf("function bindBootRecovery");
  assert.ok(end > 0, "função de validação não encontrada");
  vm.runInContext(core.slice(0, end), context);

  assert.equal(context.window.PCM_APP_CONFIG.version, "108.0.0");
  assert.equal(context.window.PCM_APP_CONFIG.assetVersion, "10800");
  assert.doesNotThrow(() => context.validateRuntimeConfiguration());
});

test("runtime não exige funções removidas da seleção de linhas", () => {
  const core = read("static/js/core.js");
  const validationBlock = core.slice(0, core.indexOf("function bindBootRecovery"));
  assert.doesNotMatch(validationBlock, /getSelectedRowsCountV100/);
});
