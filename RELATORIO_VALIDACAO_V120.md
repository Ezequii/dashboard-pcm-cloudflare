# Relatório de validação — V120

## Consolidação definitiva

A camada experimental do drawer da V119 foi aprovada e consolidada.

- O destaque visual foi incorporado em `static/styles_v994a2_visual.css`.
- A folha `static/styles_v119_drawer_priority_preview.css` foi removida.
- A classe experimental `v119-drawer-priority-preview` foi removida do HTML.
- A identificação semântica `data-detail-priority="true"` permanece no JavaScript.
- A identificação não depende da posição do card na grade.

## Campos prioritários

1. Data de recebimento
2. Nº requisição
3. Nº pedido de compra
4. Solicitante
5. Prefixo
6. Fornecedor
7. Nº orçamento final
8. Etapa

## Estrutura preservada

Não foram alterados:
- largura do drawer;
- ordem dos campos;
- grade;
- altura estrutural dos cards;
- rolagem;
- botões Anterior e Próxima;
- Copiar ORC/OS;
- Copiar resumo;
- dados;
- filtros;
- regras de negócio.

## Validação final

- 166 testes JavaScript aprovados;
- 24 testes Python aprovados;
- auditoria do projeto aprovada;
- 55 arquivos no build;
- 47 recursos no precache;
- 55 itens verificados no manifesto de integridade;
- origem e `dist` idênticos para HTML, CSS e JavaScript modificados;
- nenhuma referência ativa à folha experimental;
- versão `120.0.0`, token `12000` e service worker `v120` sincronizados.
