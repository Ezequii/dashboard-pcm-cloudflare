"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "../..");
const xlsxOutput = path.join(__dirname, "amostra_exportacao_v99.xlsx");
const jsonOutput = path.join(__dirname, "resultados_funcoes_v99.json");

global.window = global;
global.localStorage = {
  getItem: () => null,
  setItem: () => undefined,
};
global.sessionStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};
global.state = {
  activeTab: "base",
  filters: {"ETAPA":["SEM LANÇAMENTO"]},
  search: "",
  searchScope: "ALL",
  multiSearchTerms: [],
  multiSearchMode: "ANY",
  dateFrom: "",
  dateTo: "",
  valueMin: "",
  valueMax: "",
  sortCol: "DIAS PARADO",
  sortDir: "desc",
  pageSize: 200,
  columns: ["ETAPA","Nº REQUISIÇÃO","FORNECEDOR","DIAS PARADO","VALOR TOTAL"],
};
global.escapeAttr = value => String(value ?? "");
global.escapeHtml = value => String(value ?? "");
global.showToast = () => undefined;
global.debounce = fn => fn;

vm.runInThisContext(
  fs.readFileSync(path.join(root, "static/js/xlsx-v99.js"), "utf8"),
  {filename:"xlsx-v99.js"}
);
vm.runInThisContext(
  fs.readFileSync(path.join(root, "static/js/productivity-v99.js"), "utf8"),
  {filename:"productivity-v99.js"}
);

const tests = [];
function check(name, condition, detail){
  tests.push({name, passed:Boolean(condition), detail});
}

const numericTerms = parseMultiSearchInputV99("14031 36657 26730", "REQUISICAO");
check(
  "busca_multipla_codigos",
  JSON.stringify(numericTerms) === JSON.stringify(["14031","36657","26730"]),
  JSON.stringify(numericTerms)
);

const names = parseMultiSearchInputV99(
  "CAMPO ERE\nASTER MÁQUINAS;RZK AGRO",
  "FORNECEDOR"
);
check(
  "busca_multipla_nomes",
  names.length === 3 &&
    names[0] === "CAMPO ERE" &&
    names[2] === "RZK AGRO",
  JSON.stringify(names)
);

const rows = [
  {
    _ROW_ID:1,
    ETAPA:"SEM LANÇAMENTO",
    "Nº REQUISIÇÃO":"1001",
    FORNECEDOR:"CAMPO ERE",
    "DIAS PARADO":42,
    _DIAS_PARADO:42,
    "VALOR TOTAL":"10003,95",
    _VALOR_TOTAL:10003.95
  },
  {
    _ROW_ID:2,
    ETAPA:"SEM NF",
    "Nº REQUISIÇÃO":"1002",
    FORNECEDOR:"ASTER MÁQUINAS",
    "DIAS PARADO":18,
    _DIAS_PARADO:18,
    "VALOR TOTAL":"27672,76",
    _VALOR_TOTAL:27672.76
  },
  {
    _ROW_ID:3,
    ETAPA:"SEM NF",
    "Nº REQUISIÇÃO":"1003",
    FORNECEDOR:"ASTER MÁQUINAS",
    "DIAS PARADO":11,
    _DIAS_PARADO:11,
    "VALOR TOTAL":"52500,00",
    _VALOR_TOTAL:52500
  }
];

const summary = buildOperationalSummaryV99(rows, "Teste automatizado");
check("resumo_quantidade", summary.count === 3, String(summary.count));
check(
  "resumo_valor",
  Math.abs(summary.totalValue - 90176.71) < 0.01,
  String(summary.totalValue)
);
check(
  "resumo_etapas",
  summary.stages["SEM NF"].count === 2 && summary.maxDays === 42,
  JSON.stringify(summary.stages)
);
check(
  "resumo_texto",
  summary.text.includes("ASTER MÁQUINAS") &&
    summary.text.includes("SEM LANÇAMENTO"),
  summary.text
);

const columns = [
  "ETAPA",
  "Nº REQUISIÇÃO",
  "FORNECEDOR",
  "DIAS PARADO",
  "VALOR TOTAL"
];
const bytes = __buildXlsxBytesV99(rows, columns, summary);
fs.writeFileSync(xlsxOutput, Buffer.from(bytes));

check(
  "xlsx_assinatura_zip",
  bytes[0] === 0x50 && bytes[1] === 0x4B,
  `${bytes[0]},${bytes[1]}`
);
check("xlsx_tamanho", bytes.length > 5000, String(bytes.length));

fs.writeFileSync(
  jsonOutput,
  JSON.stringify(tests, null, 2),
  "utf8"
);

for(const test of tests){
  console.log(
    `${test.passed ? "OK" : "FALHOU"} ${test.name} — ${test.detail}`
  );
}

const failed = tests.filter(test => !test.passed);
console.log(
  `RESULTADO: ${tests.length - failed.length}/${tests.length} testes aprovados.`
);
if(failed.length) process.exit(1);
