const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

global.window = global;
global.window.addEventListener = function(){};
global.document = {
  readyState: "complete",
  body: {classList: {add(){}, remove(){}}},
  addEventListener(){},
  getElementById(){ return null; }
};
global.state = {dataVersion: "", generatedAt: ""};
global.localStorage = {getItem(){ return null; }, setItem(){}};
global.fetch = async () => { throw new Error("fetch não deve ser usado neste teste"); };

function runFile(relativePath){
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  vm.runInThisContext(source, {filename: relativePath});
}

runFile("static/js/app-config.js");
runFile("static/js/api.js");

const now = new Date();
function isoDaysAgo(days){
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

const rows = [
  {
    _ROW_ID: 1,
    ETAPA: "CONCLUÍDO",
    _VALOR_TOTAL: 1000,
    _VALOR_SERVICO: 600,
    _VALOR_PECAS: 400,
    _DIAS_PARADO: 0,
    FORNECEDOR: "A",
    SOLICITANTE: "X",
    "Nº REQUISIÇÃO": "1",
    "SLA STATUS": "CONCLUÍDO"
  },
  {
    _ROW_ID: 2,
    ETAPA: "SEM LANÇAMENTO",
    _VALOR_TOTAL: 2000,
    _VALOR_SERVICO: 1200,
    _VALOR_PECAS: 800,
    _DIAS_PARADO: 35,
    _AGING_BASE_ISO: isoDaysAgo(35),
    FORNECEDOR: "B",
    SOLICITANTE: "Y",
    "Nº REQUISIÇÃO": "2",
    "Nº ORÇAMENTO FINAL": "O2",
    "SLA STATUS": "CRÍTICO"
  },
  {
    _ROW_ID: 3,
    ETAPA: "SEM PEDIDO",
    _VALOR_TOTAL: 3000,
    _VALOR_SERVICO: 1800,
    _VALOR_PECAS: 1200,
    _DIAS_PARADO: 10,
    _AGING_BASE_ISO: isoDaysAgo(10),
    FORNECEDOR: "B",
    SOLICITANTE: "Y",
    "Nº REQUISIÇÃO": "3",
    "Nº ORÇAMENTO FINAL": "O3",
    "SLA STATUS": "ATENÇÃO"
  },
  {
    _ROW_ID: 4,
    ETAPA: "SEM NF",
    _VALOR_TOTAL: 4000,
    _VALOR_SERVICO: 2400,
    _VALOR_PECAS: 1600,
    _DIAS_PARADO: 61,
    _AGING_BASE_ISO: isoDaysAgo(61),
    FORNECEDOR: "C",
    SOLICITANTE: "Z",
    "Nº REQUISIÇÃO": "4",
    "Nº ORÇAMENTO FINAL": "O4",
    "SLA STATUS": "CRÍTICO"
  }
];

rows.forEach((row) => {
  row["DIAS PARADO"] = row._DIAS_PARADO;
  row["FAIXA ATRASO"] = agingBand(row._DIAS_PARADO);
});

const result = staticDashboard(rows, {filters: {}});

const assertions = [
  [result.kpis.critical_pending === 2, "critical_pending deve ser 2"],
  [result.kpis.critical_pending_value === 6000, "valor crítico deve ser 6000"],
  [result.etapas.some((item) => item.etapa === "SEM NF" && item.max_dias >= 61), "SEM NF deve ter idade máxima"],
  [result.charts.top_fornecedores_pendentes.length === 2, "ranking pendente deve ter dois fornecedores"],
  [result.top5_prioridades.length === 3, "fila deve agrupar três pendências"]
];

const failures = assertions.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error("SMOKE V98: FALHOU");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("SMOKE V98: OK");
console.log(JSON.stringify({
  critical: result.kpis.critical_pending,
  stages: result.etapas.length,
  priorities: result.top5_prioridades.length
}));
