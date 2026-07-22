# Relatório de validação — V119 Etapa 1 experimental

## Escopo

O drawer mantém:
- mesma estrutura;
- mesma largura;
- mesma grade;
- mesma ordem de campos;
- mesmos botões;
- mesma rolagem;
- todos os dados do orçamento / ordem de serviço.

A alteração experimental destaca somente:
- DATA DE RECEBIMENTO
- Nº REQUISIÇÃO
- Nº PEDIDO DE COMPRA
- SOLICITANTE
- PREFIXO
- FORNECEDOR
- Nº ORÇAMENTO FINAL
- ETAPA

## Implementação

- `static/js/productivity-v99.js`
  - adiciona identificação semântica `data-detail-priority="true"` somente aos campos prioritários;
  - não altera a ordem nem o conteúdo dos campos.

- `static/styles_v119_drawer_priority_preview.css`
  - camada visual temporária carregada por último;
  - não redefine width, height, grid-template-columns, padding, gap ou overflow;
  - pode ser removida integralmente para rollback visual.

## Validação

- auditoria de projeto aprovada;
- 166 testes JavaScript aprovados;
- 24 testes Python aprovados;
- 46 referências locais verificadas;
- 95 IDs HTML auditados;
- 14 scripts validados;
- 75 vínculos DOM conferidos;
- build concluído com 56 arquivos;
- 48 recursos incluídos no precache;
- 56 itens registrados no manifesto de integridade;
- origem e `dist` conferidos para os arquivos modificados;
- versão 119.0.0, token principal 11900 e service worker v119 sincronizados.

## Próxima etapa

Após aprovação visual, o destaque será consolidado no CSS visual definitivo do drawer e a folha experimental será removida.

- Os dois ativos modificados nesta revisão experimental usam cache-busting `11901` para evitar reutilização da versão anterior no navegador.
