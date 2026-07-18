# V120 — Drawer com destaques definitivos

A V120 consolida a Etapa 1 experimental aprovada do drawer.

## Campos prioritários destacados

- Data de recebimento
- Nº requisição
- Nº pedido de compra
- Solicitante
- Prefixo
- Fornecedor
- Nº orçamento final
- Etapa

## Consolidação

O destaque visual foi incorporado diretamente em `static/styles_v994a2_visual.css`.
A folha experimental `styles_v119_drawer_priority_preview.css` foi removida.

A marcação semântica `data-detail-priority="true"` permanece em
`static/js/productivity-v99.js`, pois permite identificar os campos pelo nome,
sem depender da posição na grade.

## Escopo preservado

Não foram alterados:
- ordem dos campos;
- largura do drawer;
- grade;
- altura dos cards;
- rolagem;
- botões Anterior/Próxima;
- copiar ORC/OS;
- copiar resumo;
- dados ou regras de negócio.
