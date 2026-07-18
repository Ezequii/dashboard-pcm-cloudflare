# V119 — Etapa 1 experimental: destaques no drawer

Esta versão mantém integralmente a estrutura do drawer de detalhes e adiciona somente um destaque visual reversível para cinco campos prioritários:

- Data de recebimento
- Nº requisição
- Nº pedido de compra
- Solicitante
- Prefixo

## Implementação

- `static/js/productivity-v99.js`: identifica semanticamente os cinco campos com `data-detail-priority="true"`.
- `static/styles_v119_drawer_priority_preview.css`: camada visual experimental, carregada por último.
- Nenhuma regra de largura, altura, grid, padding, gap ou overflow foi adicionada nessa camada.
- A ordem dos campos e o conteúdo completo do drawer permanecem inalterados.

## Próxima etapa

Após aprovação visual, as regras da folha experimental poderão ser consolidadas no CSS visual definitivo do drawer e a folha temporária será removida.
