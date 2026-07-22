# Dashboard PCM V117 — Etapa 1 experimental do topo

Esta versão implementa somente a primeira etapa de validação visual do cabeçalho.

## Escopo

- redução moderada das abas Visão Executiva e Base de Tratativa;
- compactação dos indicadores de atualização;
- botão Recarregar mais proporcional;
- preservação da marca, estrutura HTML e JavaScript;
- regras específicas para monitor, notebook, tablet e celular;
- área mínima de 44 px em dispositivos de toque.

## Caráter experimental

A folha `static/styles_v117_header_compact_preview.css` é uma camada temporária.
Depois da aprovação visual, as regras confirmadas devem ser consolidadas em
`static/styles_v110_header_kpi.css` e a folha experimental removida.

## Rollback

Para voltar ao topo da V116:

1. remova o link de `styles_v117_header_compact_preview.css`;
2. remova a classe `v117-header-preview` do `<body>`;
3. restaure os identificadores de versão da V116.

Nenhum KPI, filtro, tabela, dado ou regra de negócio foi alterado.
