# Auditoria visual — V99.4A.2

## Referência

Foram usados seis prints reais da V99.3:

- Visão Executiva;
- Base de Tratativa;
- busca múltipla;
- filtros salvos;
- seleção em lote;
- gaveta de detalhes.

## Problemas confirmados

### O fluxo mostrava somente uma etapa

A camada antiga `styles_v50_corrigido.css` possuía um seletor por ID:

```css
#processCards {
  grid-template-columns: 1fr;
}
```

Esse seletor tinha prioridade maior que a regra nova baseada apenas em classe.
Por isso os quatro elementos eram renderizados, mas ficavam organizados em uma
coluna dentro de um painel com altura limitada. Na prática, apenas a primeira
etapa aparecia.

### Primeira coluna operacional cortada

A coluna de seleção foi adicionada depois das regras antigas de colunas fixas.
Os offsets não reservavam espaço para o checkbox, provocando sobreposição.

### Gaveta com valores crus

Valores como `5225` e documentos concatenados eram exibidos sem formatação.

## Solução

### Fluxo

- seletor de alta especificidade:
  `body.v994a2-visual #processCards.process-flow-v991`;
- quatro colunas forçadas no desktop;
- helper canônico que sempre devolve quatro etapas;
- estado zero para etapas ausentes;
- cartões compactos, completos e clicáveis.

### Tabela

- largura de 46 px para seleção;
- quatro offsets fixos;
- classes geradas conforme a ordem visível;
- fundos e `z-index` próprios;
- desativação do pin em telas estreitas.

### Gaveta

- formatação monetária;
- separação de listas;
- tokens para documentos;
- campos maiores;
- quebra de linha.

## Resultado

A V99.4A.2 mantém a identidade da V99.3 e corrige os problemas sem redesenhar a
ferramenta.
