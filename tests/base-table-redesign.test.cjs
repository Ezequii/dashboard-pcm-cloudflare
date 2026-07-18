const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const TABLE = fs.readFileSync(path.join(ROOT, "static", "js", "table.js"), "utf8");
const PRODUCTIVITY = fs.readFileSync(path.join(ROOT, "static", "js", "productivity-v99.js"), "utf8");
const OPERATIONAL = JSON.parse(
  fs.readFileSync(path.join(ROOT, "static", "data", "operational-data.json"), "utf8")
);
const CSS = fs.readFileSync(path.join(ROOT, "static", "styles_v100_base_table.css"), "utf8");

test("carrega o CSS e os scripts versionados do redesign", () => {
  assert.match(INDEX, /styles_v100_base_table\.css\?v=10050/);
  assert.match(INDEX, /table\.js\?v=10050/);
  assert.match(INDEX, /productivity-v99\.js\?v=10050/);
  assert.match(INDEX, /v100-base-redesign/);
});

test("define somente as oito colunas aprovadas como padrão", () => {
  const match = TABLE.match(/const V100_DEFAULT_BASE_COLUMNS = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(match, "Lista padrão não encontrada.");
  const columns = Array.from(match[1].matchAll(/"([^"]+)"/g), item => item[1]);
  assert.deepEqual(columns, [
    "ETAPA",
    "DIAS PARADO",
    "SLA STATUS",
    "DATA DE RECEBIMENTO",
    "DATA LANÇAMENTO",
    "Nº ORÇAMENTO FINAL",
    "FORNECEDOR",
    "SOLICITANTE"
  ]);
});

test("mantém colunas avançadas disponíveis somente por personalização", () => {
  assert.ok(OPERATIONAL.columns.includes("Nº PEDIDO DE COMPRA"));
  assert.ok(OPERATIONAL.columns.includes("Nº NFS/DANFE"));
  assert.match(PRODUCTIVITY, /openColumnsV99/);
  assert.match(PRODUCTIVITY, /available\.filter\(column => !defaults\.includes\(column\)\)/);
});

test("renderiza agrupamentos Prioridade, Tempo e Identificação", () => {
  assert.match(TABLE, /priority:\s*"Prioridade"/);
  assert.match(TABLE, /time:\s*"Tempo"/);
  assert.match(TABLE, /identity:\s*"Identificação"/);
  assert.match(TABLE, /scope="colgroup"/);
});

test("CSS estabelece hierarquia e larguras controladas", () => {
  assert.match(CSS, /table-layout:\s*fixed/);
  assert.match(CSS, /\.group-priority-v100/);
  assert.match(CSS, /\.col-etapa/);
  assert.match(CSS, /\.col-n-orcamento-final/);
  assert.match(CSS, /\.col-fornecedor/);
  assert.match(CSS, /\.col-solicitante/);
});
