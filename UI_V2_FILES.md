# UI V2 — Arquivos

## Criados

- `static/ui-v2.css`
- `static/ui-v2/00-tokens.css`
- `static/ui-v2/01-foundations.css`
- `static/ui-v2/02-buttons.css`
- `static/ui-v2/03-header-tabs.css`
- `static/ui-v2/04-cards-kpis.css`
- `static/ui-v2/05-panels-rankings.css`
- `static/ui-v2/06-table-forms.css`
- `static/ui-v2/07-drawers-modal-toast.css`
- `static/ui-v2/08-responsive.css`
- `static/ui-v2/09-utilities.css`
- `static/js/ui-v2.js`
- `qa/ui-v2/test_ui_v2.py`
- `UI_V2_ARCHITECTURE.md`
- `UI_V2_FILES.md`

## Alterados

- `index.html`: ativa a UI v2, adiciona seletor de densidade e carrega o módulo visual.
- `static/dashboard_phase1.css`: permanece como bundle único de produção e recebe a camada UI v2 ao final.

## Removidos

Nenhum arquivo funcional foi removido. Os estilos históricos permanecem disponíveis para auditoria e rollback, mas não são carregados individualmente.
