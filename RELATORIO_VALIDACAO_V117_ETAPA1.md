# Relatório de validação — V117 Etapa 1

## Objetivo

Aplicar uma compactação moderada e reversível somente no cabeçalho, para
validação visual antes da consolidação definitiva.

## Arquivos alterados

- `index.html`
  - adiciona a classe `v117-header-preview`;
  - carrega a folha experimental por último;
  - atualiza a identificação para V117;
  - atualiza os tokens de `app-config.js` e `core.js`.
- `static/styles_v117_header_compact_preview.css`
  - nova camada experimental restrita ao cabeçalho.
- `package.json`
- `static/js/app-config.js`
- `static/js/core.js`
- `sw.js`
  - sincronização de versão e cache.
- `tests/v117-header-preview.test.cjs`
  - cobertura específica da etapa experimental.
- `tests/v116-maintenance-cleanup.test.cjs`
  - contrato histórico tornado compatível com versões posteriores, sem retirar
    as verificações de manutenção.

## Escopo visual

A camada experimental altera somente:

- composição da grade do cabeçalho;
- abas Visão Executiva e Base de Tratativa;
- status de atualização;
- botão Recarregar;
- quebras responsivas do próprio cabeçalho.

Não contém seletores de KPIs, filtros, Contexto atual, Base de Tratativa,
tabela ou dados.

## Valores experimentais principais

### Monitor e desktop

- abas: altura mínima de 42 px;
- container das abas: largura máxima de 300 px;
- status: altura de 38 px;
- Recarregar: altura de 38 px e largura mínima de 88 px;
- cabeçalho: altura e espaçamento reduzidos de forma moderada.

### Tablet e celular

- abas e botão Recarregar preservam pelo menos 44 px para toque;
- status usam 40 px;
- a estrutura empilhada existente é mantida;
- nenhuma tentativa de forçar o topo em uma única linha.

## Validação automatizada

- auditoria do projeto aprovada:
  - 46 referências locais;
  - 95 IDs HTML;
  - 14 scripts;
  - 75 vínculos DOM.
- 163 testes JavaScript aprovados;
- 24 testes Python aprovados;
- CSS analisado sem erros de sintaxe;
- folha experimental confirmada como última da cascata;
- seletores confirmados como restritos ao cabeçalho;
- pacote, runtime e service worker sincronizados em V117;
- build concluído com:
  - 56 arquivos;
  - 48 recursos no precache;
  - 56 hashes no manifesto de integridade.
- origem e `dist` conferidos para HTML, CSS experimental, configuração e
  runtime.

## Observação sobre a etapa

Esta não é a consolidação definitiva. Após a validação visual do usuário:

1. os valores aprovados serão incorporados ao CSS principal do cabeçalho;
2. `styles_v117_header_compact_preview.css` será removido;
3. a classe experimental será retirada;
4. testes e build serão repetidos.

## Rollback imediato

A alteração visual pode ser desativada sem afetar o dashboard:

1. remover o link de `styles_v117_header_compact_preview.css` do `index.html`;
2. remover `v117-header-preview` do `<body>`;
3. restaurar os tokens de versão anteriores.
