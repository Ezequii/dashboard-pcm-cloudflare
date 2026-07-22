# V118 — Topo compacto definitivo

A V118 consolida no CSS principal do cabeçalho os ajustes visuais aprovados na V117 experimental.

## O que foi consolidado

- abas Visão Executiva e Base de Tratativa moderadamente menores;
- status de dados e atualização mais compactos;
- botão Recarregar proporcional aos demais controles;
- espaçamentos do cabeçalho reduzidos de forma controlada;
- comportamento responsivo preservado para notebook, tablet e celular;
- áreas de toque de pelo menos 44 px mantidas em telas pequenas e dispositivos de ponteiro coarse.

## O que não mudou

- estrutura HTML funcional do cabeçalho;
- JavaScript de navegação, recarga ou status;
- KPIs, Contexto atual, Base de Tratativa, tabela, filtros e dados;
- Cloudflare Access e regras de negócio.

## Consolidação

A folha temporária `styles_v117_header_compact_preview.css` foi removida. Os valores aprovados foram incorporados diretamente em `static/styles_v110_header_kpi.css`, que continua sendo a folha principal responsável pelo cabeçalho e pelos estilos históricos dos KPIs.
