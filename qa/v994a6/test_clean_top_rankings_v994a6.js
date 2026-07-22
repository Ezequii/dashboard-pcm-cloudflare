"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = relative => fs.readFileSync(
  path.join(root, relative),
  "utf8"
);

const index = read("index.html");
const dashboard = read("static/js/dashboard.js");
const api = read("static/js/api.js");
const css = read("static/styles_v994a6_clean_rankings.css");
const config = read("static/js/app-config.js");
const core = read("static/js/core.js");

const tests = [];
function check(name, condition, detail=""){
  tests.push({
    name,
    passed:Boolean(condition),
    detail:String(detail)
  });
}

check(
  "versionamento_9946",
  config.includes('version: "99.4A.6"')
    && config.includes('assetVersion: "9946"')
    && core.includes('String(config.assetVersion || "") !== "9946"')
    && index.includes("?v=9946"),
  "configuração, runtime e HTML"
);

check(
  "camada_css_final",
  index.lastIndexOf("styles_v994a6_clean_rankings.css?v=9946")
    > index.lastIndexOf("styles_v994a5_lapidacao.css?v=9946"),
  "CSS V99.4A.6 carregado por último"
);

check(
  "classe_body_v994a6",
  /<body[^>]*class="[^"]*v994a6-clean-rankings/.test(index),
  "classe de escopo presente"
);

check(
  "acesso_visual_oculto",
  index.includes("security-runtime-only-v994a6")
    && css.includes(".security-runtime-only-v994a6")
    && css.includes("display:none!important"),
  "segurança permanece no runtime, sem cartão visual"
);

check(
  "status_compacto_transparente",
  css.includes("background:rgba(255,255,255,.88)!important")
    && css.includes("opacity:.72!important")
    && css.includes("font-size:9.5px!important")
    && css.includes("min-height:38px!important"),
  "topo e atualização compactos"
);

check(
  "seletor_ranking_acessivel",
  index.includes('role="group" aria-label="Contexto dos rankings"')
    && index.includes('data-ranking-scope="all"')
    && index.includes('data-ranking-scope="pending"')
    && index.includes('aria-pressed="true"'),
  "Geral e Em andamento"
);

check(
  "ranking_geral_padrao",
  dashboard.includes('let rankingScopeV994a6 = "all"')
    && dashboard.includes("charts.top_fornecedores || []")
    && dashboard.includes("charts.custo_solicitante || []"),
  "geral usa todos os registros"
);

check(
  "ranking_pendente_selecionavel",
  dashboard.includes('rankingScopeV994a6 === "pending"')
    && dashboard.includes("charts.top_fornecedores_pendentes || []")
    && dashboard.includes("charts.solicitantes_pendentes || []"),
  "em andamento usa somente pendentes"
);

check(
  "ranking_reage_a_selecao",
  dashboard.includes("renderRankingsV994a6(latestExecutiveDataV994a6 || {})")
    && dashboard.includes("button.dataset.rankingScope")
    && dashboard.includes('button.setAttribute("aria-pressed"'),
  "troca sem recarregar a página"
);

check(
  "clique_respeita_contexto",
  dashboard.includes("filterDimensionAndOpenBase(")
    && dashboard.includes("rankingScopeV994a6")
    && dashboard.includes('state.filters.ETAPA = [')
    && dashboard.includes('"SEM LANÇAMENTO"')
    && dashboard.includes('"SEM PEDIDO"')
    && dashboard.includes('"SEM NF"'),
  "linha e rodapé aplicam o contexto selecionado"
);

check(
  "titulos_gerais_padrao",
  index.includes("Fornecedores com maior valor geral")
    && index.includes("Solicitantes com maior valor geral")
    && !index.includes("Fornecedores com maior valor pendente")
    && !index.includes("Solicitantes com maior valor pendente"),
  "sem pendente no estado padrão"
);

check(
  "top_tres",
  dashboard.includes("(rows || []).slice(0, 3)")
    && css.includes("min-height:186px!important")
    && css.includes("height:62px!important"),
  "três linhas completas"
);

check(
  "painel_sem_corte",
  css.includes("min-height:330px!important")
    && css.includes("overflow:visible!important")
    && css.includes("max-height:none!important")
    && css.includes("visibility:visible!important"),
  "terceira linha e rodapé visíveis"
);

check(
  "dados_gerais_disponiveis",
  api.includes("top_fornecedores:topSum(geral,'FORNECEDOR')")
    && api.includes("custo_solicitante:topSum(geral,'SOLICITANTE')")
    && api.includes("top_fornecedores_pendentes:topSum(pend,'FORNECEDOR')")
    && api.includes("solicitantes_pendentes:topSum(pend,'SOLICITANTE')"),
  "payload contém geral e em andamento"
);

check(
  "responsividade_rankings",
  css.includes("@media (max-width:900px)")
    && css.includes("grid-template-columns:1fr!important"),
  "rankings empilham em telas menores"
);

const failed = tests.filter(test => !test.passed);
for(const item of tests){
  console.log(
    `${item.passed ? "OK" : "FALHOU"} ${item.name} — ${item.detail}`
  );
}
console.log(
  `RESULTADO: ${tests.length - failed.length}/${tests.length} testes aprovados.`
);

fs.writeFileSync(
  path.join(__dirname, "resultados_v994a6.json"),
  JSON.stringify(tests, null, 2),
  "utf8"
);

if(failed.length){
  process.exit(1);
}
