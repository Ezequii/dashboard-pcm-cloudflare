"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "../..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const index = read("index.html");
const stateSource = read("static/js/state.js");
const apiSource = read("static/js/api.js");
const tableSource = read("static/js/table.js");
const generatorSource = read("tools/gerar_json_planilha.py");
const css = read("static/styles_v994a4_top_base_flow.css");

const tests = [];
function check(name, condition, detail=""){
  tests.push({name, passed:Boolean(condition), detail:String(detail)});
}

function extractFunction(source, functionName){
  const marker = `function ${functionName}(`;
  const start = source.indexOf(marker);
  if(start < 0) throw new Error(`Função ausente: ${functionName}`);
  const braceStart = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for(let index = braceStart; index < source.length; index += 1){
    const character = source[index];

    if(quote){
      if(escaped){
        escaped = false;
      }else if(character === "\\"){
        escaped = true;
      }else if(character === quote){
        quote = "";
      }
      continue;
    }

    if(character === "'" || character === '"' || character === "`"){
      quote = character;
      continue;
    }

    if(character === "{") depth += 1;
    if(character === "}"){
      depth -= 1;
      if(depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Função incompleta: ${functionName}`);
}

check(
  "topo_em_tres_zonas",
  index.includes("brand-v994a4")
    && index.includes("tabs-v994a4")
    && index.includes("status-cluster-v994a4")
    && index.includes("action-cluster-v994a4"),
  "marca, navegação e status/ações separados"
);

check(
  "css_novo_por_ultimo",
  index.lastIndexOf("styles_v994a4_top_base_flow.css?v=9945")
    > index.lastIndexOf("styles_v994a3_operational_fix.css?v=9945"),
  "camada V99.4A.5 é a última"
);

check(
  "sem_resumo_duplicado",
  !index.includes('id="processCardsBase"'),
  "painel duplicado removido do HTML"
);

check(
  "default_fluxo",
  stateSource.includes("sortCol: 'ETAPA'")
    && stateSource.includes("sortDir: 'asc'")
    && stateSource.includes("pcm-dashboard-preferences-v994a4-flow-default"),
  "ETAPA asc e armazenamento novo"
);

check(
  "sem_colunas_fixas",
  /function pinnedColumnClassV994a2\(index\)\{\s*return '';\s*\}/.test(tableSource)
    && css.includes("position:static!important")
    && css.includes("Nenhuma coluna fica presa") === false,
  "classes de pin desativadas e CSS estático"
);

const flowColumns = [
  "'ETAPA'",
  "'DATA DE RECEBIMENTO'",
  "'DATA LANÇAMENTO'",
  "'Nº PEDIDO DE COMPRA'",
  "'DATA DO PEDIDO'",
  "'Nº NFS/DANFE'",
  "'DATA LANÇAMENTO NFS'"
];
let lastPosition = -1;
let orderedColumns = true;
for(const column of flowColumns){
  const position = tableSource.indexOf(column, lastPosition + 1);
  if(position < 0 || position <= lastPosition){
    orderedColumns = false;
    break;
  }
  lastPosition = position;
}
check(
  "colunas_seguem_fluxo",
  orderedColumns,
  flowColumns.join(" → ")
);

check(
  "gerador_segue_fluxo",
  generatorSource.indexOf('"ETAPA"')
    < generatorSource.indexOf('"DATA DE RECEBIMENTO"')
    && generatorSource.indexOf('"DATA DE RECEBIMENTO"')
      < generatorSource.indexOf('"DATA LANÇAMENTO"')
    && generatorSource.indexOf('"DATA LANÇAMENTO"')
      < generatorSource.indexOf('"Nº PEDIDO DE COMPRA"')
    && generatorSource.indexOf('"Nº PEDIDO DE COMPRA"')
      < generatorSource.indexOf('"DATA DO PEDIDO"')
    && generatorSource.indexOf('"DATA DO PEDIDO"')
      < generatorSource.indexOf('"Nº NFS/DANFE"')
    && generatorSource.indexOf('"Nº NFS/DANFE"')
      < generatorSource.indexOf('"DATA LANÇAMENTO NFS"'),
  "contrato operacional cronológico"
);

const functionNames = [
  "normalizeText",
  "n",
  "etapaRank",
  "sortValue",
  "compareStaticValuesV994a4",
  "compareWithinStageV994a4",
  "sortStaticRows"
];

const source = functionNames
  .map(name => extractFunction(apiSource, name))
  .join("\n");

vm.runInThisContext(source, {filename:"sort-flow-v994a4.js"});

const sample = [
  {
    ETAPA:"CONCLUÍDO",
    _DIAS_PARADO:0,
    _VALOR_TOTAL:900,
    "Nº REQUISIÇÃO":"4"
  },
  {
    ETAPA:"SEM NF",
    _DIAS_PARADO:9,
    _VALOR_TOTAL:800,
    "Nº REQUISIÇÃO":"3"
  },
  {
    ETAPA:"SEM LANÇAMENTO",
    _DIAS_PARADO:4,
    _VALOR_TOTAL:100,
    "Nº REQUISIÇÃO":"1"
  },
  {
    ETAPA:"SEM PEDIDO",
    _DIAS_PARADO:20,
    _VALOR_TOTAL:500,
    "Nº REQUISIÇÃO":"2"
  },
  {
    ETAPA:"SEM LANÇAMENTO",
    _DIAS_PARADO:30,
    _VALOR_TOTAL:50,
    "Nº REQUISIÇÃO":"5"
  }
];

const sorted = sortStaticRows(sample, "ETAPA", "asc");
check(
  "linhas_seguem_fluxo",
  JSON.stringify(sorted.map(row => row.ETAPA)) === JSON.stringify([
    "SEM LANÇAMENTO",
    "SEM LANÇAMENTO",
    "SEM PEDIDO",
    "SEM NF",
    "CONCLUÍDO"
  ]),
  JSON.stringify(sorted.map(row => row.ETAPA))
);

check(
  "maior_idade_primeiro_na_etapa",
  sorted[0]["Nº REQUISIÇÃO"] === "5"
    && sorted[1]["Nº REQUISIÇÃO"] === "1",
  JSON.stringify(sorted.slice(0, 2).map(row => row["Nº REQUISIÇÃO"]))
);

check(
  "tipografia_minima",
  css.includes("font-size:12.5px!important")
    && css.includes("font-size:12px!important")
    && css.includes("font-size:11.5px!important"),
  "topo, filtros e tabela ampliados"
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

const outputDirectory = process.env.PCM_TEST_OUTPUT_DIR || __dirname;
fs.mkdirSync(outputDirectory, {recursive:true});
fs.writeFileSync(
  path.join(outputDirectory, "resultados_top_base_flow_v994a4.json"),
  JSON.stringify(tests, null, 2),
  "utf8"
);

if(failed.length) process.exit(1);
