"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "../..");
const apiSource = fs.readFileSync(
  path.join(root, "static/js/api.js"),
  "utf8"
);
const dashboardSource = fs.readFileSync(
  path.join(root, "static/js/dashboard.js"),
  "utf8"
);
const filtersSource = fs.readFileSync(
  path.join(root, "static/js/filters.js"),
  "utf8"
);
const productivitySource = fs.readFileSync(
  path.join(root, "static/js/productivity-v99.js"),
  "utf8"
);
const payloadSource = fs.readFileSync(
  path.join(root, "tools/services/payload.py"),
  "utf8"
);
const css = fs.readFileSync(
  path.join(root, "static/styles_v994a5_lapidacao.css"),
  "utf8"
);
const index = fs.readFileSync(
  path.join(root, "index.html"),
  "utf8"
);

const tests = [];

function check(name, condition, detail=""){
  tests.push({
    name,
    passed:Boolean(condition),
    detail:String(detail)
  });
}

function extractFunction(source, name){
  const token = `function ${name}`;
  const start = source.indexOf(token);
  if(start < 0) return "";
  const open = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for(let index = open; index < source.length; index += 1){
    const char = source[index];

    if(quote){
      if(escaped){
        escaped = false;
        continue;
      }
      if(char === "\\"){
        escaped = true;
        continue;
      }
      if(char === quote){
        quote = "";
      }
      continue;
    }

    if(char === "'" || char === '"' || char === "`"){
      quote = char;
      continue;
    }

    if(char === "{") depth += 1;
    if(char === "}"){
      depth -= 1;
      if(depth === 0){
        return source.slice(start, index + 1);
      }
    }
  }
  return "";
}

global.window = {
  BUSINESS_RULES:{
    aging:{critical:30}
  }
};
global.pendingRows = rows => rows.filter(row => row.ETAPA !== "CONCLUÍDO");
global.n = value => Number(value || 0);
global.cleanStatic = value => String(value ?? "").trim();
global.compactMoney = value => `R$ ${Number(value || 0).toFixed(0)}`;
global.brMoney = value => `R$ ${Number(value || 0).toFixed(2)}`;

const apiFunctions = [
  "splitDocumentCodesV994a5",
  "firstDocumentCodeV994a5",
  "oldestPending",
  "topSum"
].map(name => extractFunction(apiSource, name)).join("\n");

check(
  "funcoes_api_extraidas",
  apiFunctions.split("function ").length >= 5,
  apiFunctions.length
);

vm.runInThisContext(apiFunctions, {
  filename:"api-v994a5-extract.js"
});

const sampleRows = [
  {
    ETAPA:"SEM PEDIDO",
    FORNECEDOR:"CAMPO ERE",
    SOLICITANTE:"JOSE EDUARDO",
    "Nº ORÇAMENTO FINAL":"14031/14032",
    "Nº ORDEM SERVIÇO":"8712",
    _DIAS_PARADO:96,
    _VALOR_TOTAL:260000
  },
  {
    ETAPA:"SEM NF",
    FORNECEDOR:"CAMPO ERE",
    SOLICITANTE:"JOSE EDUARDO",
    "Nº ORÇAMENTO FINAL":"15000",
    "Nº ORDEM SERVIÇO":"9000",
    _DIAS_PARADO:35,
    _VALOR_TOTAL:100000
  },
  {
    ETAPA:"SEM LANÇAMENTO",
    FORNECEDOR:"ASTER MÁQUINAS",
    SOLICITANTE:"EDUARDO PALMA",
    "Nº ORÇAMENTO FINAL":"16000",
    "Nº ORDEM SERVIÇO":"",
    _DIAS_PARADO:5,
    _VALOR_TOTAL:517000
  }
];

const oldest = oldestPending(sampleRows);
check(
  "mais_antigo_orc",
  oldest.orc === "14031",
  JSON.stringify(oldest)
);
check(
  "mais_antigo_os",
  oldest.os === "8712",
  JSON.stringify(oldest)
);
check(
  "mais_antigo_busca_documento",
  oldest.search_value === "14031"
    && oldest.search_scope === "DOCUMENTO",
  JSON.stringify(oldest)
);
check(
  "mais_antigo_texto_duplo",
  oldest.reference_text === "ORC 14031 · OS 8712",
  oldest.reference_text
);

const suppliers = topSum(sampleRows, "FORNECEDOR", 3);
const campo = suppliers.find(item => item.label === "CAMPO ERE");
check(
  "ranking_dias_maximos",
  campo?.max_days === 96,
  JSON.stringify(campo)
);
check(
  "ranking_criticas",
  campo?.critical_count === 2,
  JSON.stringify(campo)
);
check(
  "ranking_meta_operacional",
  String(campo?.meta || "").includes("ORCs/OS")
    && String(campo?.meta || "").includes("máx. 96 dias"),
  campo?.meta
);

check(
  "payload_executivo_tem_orc_os",
  payloadSource.includes('"Nº ORÇAMENTO FINAL"')
    && payloadSource.includes('"Nº ORDEM SERVIÇO"'),
  "whitelist executiva"
);

check(
  "clique_mais_antigo_limpa_conflitos",
  dashboardSource.includes("resetOperationalContextForExactCaseV994a5")
    && dashboardSource.includes("state.filters.FORNECEDOR = [supplier]")
    && dashboardSource.includes("state.searchScope = searchScope"),
  "contexto exato"
);

check(
  "filtros_ativos_enriquecidos",
  filtersSource.includes("filter-scope-badges-v994a5")
    && filtersSource.includes("Visão: contexto geral")
    && filtersSource.includes("active-filter-controls-v994a5"),
  "escopos e chips"
);

check(
  "gaveta_orc_os",
  productivitySource.includes("documentReferenceV994a5")
    && productivitySource.includes("ORC ${orc}")
    && productivitySource.includes("OS ${serviceOrder}"),
  "título e cópia"
);

check(
  "topo_lapidado",
  css.includes(".topbar-main-v994a4")
    && css.includes("grid-template-columns:minmax(390px,1.08fr)")
    && css.includes(".data-status-group-v994a4"),
  "layout do topo"
);

check(
  "rankings_lapidados",
  css.includes(".ranking-row-v994a5")
    && css.includes(".ranking-name-v994a5")
    && css.includes(".ranking-value-v994a5"),
  "layout do ranking"
);

check(
  "css_carregado_por_ultimo",
  index.lastIndexOf("styles_v994a5_lapidacao.css?v=9945")
    > index.lastIndexOf("styles_v994a4_top_base_flow.css?v=9945"),
  "ordem dos estilos"
);

check(
  "sem_rotulo_rcs_em_andamento",
  !index.includes("RCs em andamento")
    && index.includes("ORCs/OSs em andamento"),
  "semântica executiva"
);

const failed = tests.filter(test => !test.passed);
for(const test of tests){
  console.log(
    `${test.passed ? "OK" : "FALHOU"} ${test.name} — ${test.detail}`
  );
}
console.log(
  `RESULTADO: ${tests.length - failed.length}/${tests.length} testes aprovados.`
);

fs.writeFileSync(
  path.join(__dirname, "resultados_v994a5.json"),
  JSON.stringify(tests, null, 2),
  "utf8"
);

if(failed.length){
  process.exit(1);
}
