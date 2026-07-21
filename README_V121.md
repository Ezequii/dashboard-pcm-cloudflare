# Dashboard PCM V121 — Consolidação CSS Experimental

Esta versão é uma prévia técnica para validar a consolidação da cascata CSS da V120.

## O que mudou

- As 28 folhas CSS ativas da V120 foram concatenadas em `static/styles_v121_consolidated_preview.css`, mantendo exatamente a mesma ordem.
- As folhas originais continuam presentes e referenciadas no HTML com `media="not all"` para permanecerem inativas durante a prévia e disponíveis para rollback/comparação.
- Apenas a folha consolidada fica ativa no navegador.
- Nenhuma regra CSS foi removida ou reescrita nesta etapa.
- HTML funcional, JavaScript de negócio, dados e APIs não foram alterados.

## Objetivo da Etapa 1

Validar visualmente que uma única folha consolidada reproduz a V120 sem regressões.

Depois da homologação visual, a etapa definitiva poderá remover as referências inativas e consolidar o pipeline de build/auditoria.
