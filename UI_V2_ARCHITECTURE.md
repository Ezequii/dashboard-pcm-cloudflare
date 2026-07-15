# UI V2 — Arquitetura e Entrega

## Arquitetura de componentes

```text
static/
├── dashboard_phase1.css        # bundle único de produção: legado estabilizado + UI v2
├── ui-v2.css                   # bundle isolado da nova camada para auditoria
├── ui-v2/
│   ├── 00-tokens.css
│   ├── 01-foundations.css
│   ├── 02-buttons.css
│   ├── 03-header-tabs.css
│   ├── 04-cards-kpis.css
│   ├── 05-panels-rankings.css
│   ├── 06-table-forms.css
│   ├── 07-drawers-modal-toast.css
│   ├── 08-responsive.css
│   └── 09-utilities.css
└── js/
    └── ui-v2.js
```

## Sistema de design

- Cores: brand, accent, success, warning, danger, info, ink, line, surface e canvas.
- Tipografia: escala de 12, 14, 16, 18, 24 e 32 px.
- Espaçamento: escala de 4 a 48 px.
- Raios: 8, 12, 16 e 20 px.
- Sombras: xs, sm, md e lg.
- Movimento: 140 ms e 220 ms, com suporte a `prefers-reduced-motion`.
- Breakpoints: 520, 768, 1024, 1280 e 1600 px.

## Layout proposto

- Header: marca, navegação e ações em uma barra compacta; filtros em segunda linha.
- KPIs: indicador financeiro principal em destaque, dois indicadores operacionais e foco recomendado.
- Alertas: três cards compactos com leitura em uma linha.
- Fluxo e fila: painel principal e painel auxiliar, empilhados abaixo de 1280 px.
- Rankings: dois painéis comparativos, barras proporcionais, medalha para primeiro colocado e seletor de contexto.
- Tabela: busca, produtividade e densidade confortável/compacta persistida localmente.
- Drawer: identificação, cronologia, financeiro, responsáveis e complementares em acordeões.
- Modal, toast e estados vazios: linguagem visual unificada.

## Compatibilidade

Nenhum arquivo de API, regra de negócio, payload ou contrato foi alterado.
Os scripts funcionais existentes permanecem carregados na mesma ordem.
