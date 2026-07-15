"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "../..");
const dashboardSource = fs.readFileSync(
  path.join(root, "static/js/dashboard.js"),
  "utf8"
);
const tableSource = fs.readFileSync(
  path.join(root, "static/js/table.js"),
  "utf8"
);
const productivitySource = fs.readFileSync(
  path.join(root, "static/js/productivity-v99.js"),
  "utf8"
);
const visualCss = fs.readFileSync(
  path.join(root, "static/styles_v994a2_visual.css"),
  "utf8"
);
const indexHtml = fs.readFileSync(
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

global.window = global;

const flowBlockMatch = dashboardSource.match(
  /const FLOW_STAGE_ORDER_V994A2[\s\S]*?window\.buildFlowStagesV994a2 = buildFlowStagesV994a2;/
);
check(
  "bloco_fluxo_extraido",
  Boolean(flowBlockMatch),
  flowBlockMatch ? "encontrado" : "ausente"
);

if(flowBlockMatch){
  vm.runInThisContext(flowBlockMatch[0], {
    filename:"flow-helper-v994a2.js"
  });

  const stages = buildFlowStagesV994a2({
    etapas:[
      {
        etapa:"SEM NF",
        qtd:92,
        valor:806000,
        max_dias:69,
        fora_sla:17
      }
    ]
  });

  check(
    "sempre_quatro_etapas",
    stages.length === 4,
    JSON.stringify(stages.map(stage => stage.etapa))
  );
  check(
    "ordem_oficial",
    JSON.stringify(stages.map(stage => stage.etapa)) === JSON.stringify([
      "SEM LANÇAMENTO",
      "SEM PEDIDO",
      "SEM NF",
      "CONCLUÍDO"
    ]),
    JSON.stringify(stages.map(stage => stage.etapa))
  );
  check(
    "etapa_existente_preservada",
    stages[2].qtd === 92
      && stages[2].valor === 806000
      && stages[2].max_dias === 69,
    JSON.stringify(stages[2])
  );
  check(
    "etapas_ausentes_viram_zero",
    stages[0].qtd === 0
      && stages[1].qtd === 0
      && stages[3].qtd === 0,
    JSON.stringify(stages.map(stage => stage.qtd))
  );
}

global.escapeHtml = value => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");
global.formatCurrencyBR = value => Number(value || 0).toLocaleString(
  "pt-BR",
  {style:"currency", currency:"BRL"}
);

const detailBlockMatch = productivitySource.match(
  /function splitDetailValuesV994a2[\s\S]*?(?=\n  function renderDetailV99)/
);
check(
  "bloco_gaveta_extraido",
  Boolean(detailBlockMatch),
  detailBlockMatch ? "encontrado" : "ausente"
);

if(detailBlockMatch){
  vm.runInThisContext(detailBlockMatch[0], {
    filename:"detail-helper-v994a2.js"
  });

  const money = detailDisplayV994a2(
    "VALOR TOTAL",
    5225,
    {_VALOR_TOTAL:5225}
  );
  const documents = detailDisplayV994a2(
    "Nº PEDIDO DE COMPRA",
    "41779605/41779606",
    {}
  );
  const dates = detailDisplayV994a2(
    "DATA LANÇAMENTO NFS",
    "27/01/2026 | 02/03/2026",
    {}
  );

  check(
    "moeda_formatada",
    money.plain.includes("5.225") && money.className.includes("is-money"),
    money.plain
  );
  check(
    "documentos_separados",
    documents.html.includes("41779605")
      && documents.html.includes("41779606")
      && documents.html.includes("detail-token-v994a2"),
    documents.plain
  );
  check(
    "datas_separadas",
    dates.plain === "27/01/2026 · 02/03/2026",
    dates.plain
  );
}

check(
  "grade_desktop_quatro_colunas",
  /#processCards\.process-flow-v991[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/.test(
    visualCss
  ),
  "seletor de alta especificidade"
);

check(
  "quatro_colunas_fixadas_sem_sobrepor",
  tableSource.includes("pinnedColumnClassV994a2")
    && tableSource.includes("pin-col-v994a2-${index}")
    && visualCss.includes("--v994a2-selection-width:46px")
    && visualCss.includes(".pin-col-v994a2-3"),
  "seleção + offsets das quatro primeiras colunas"
);

check(
  "css_carregado_por_ultimo",
  indexHtml.lastIndexOf("styles_v994a3_operational_fix.css?v=9946")
    > indexHtml.lastIndexOf("styles_v994a2_visual.css?v=9946"),
  "ordem dos estilos"
);

check(
  "body_da_revisao_base",
  /<body[^>]*class="[^"]*v994a2-visual/.test(indexHtml),
  "classe v994a2-visual"
);

check(
  "sem_cache_antigo",
  !indexHtml.includes("?v=9942"),
  "somente 9942"
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
  path.join(__dirname, "resultados_visual_v994a2.json"),
  JSON.stringify(tests, null, 2),
  "utf8"
);

if(failed.length){
  process.exit(1);
}
