# Comparação de abordagens — V99

## 1º lugar — Entrega completa e modular

**Escolhida e implementada.**

Vantagens:

- um único modelo de estado para seleção, URL, filtros e exportação;
- experiência coerente;
- menos migrações;
- recursos podem compartilhar testes e utilitários;
- manutenção concentrada em dois módulos novos.

Riscos:

- mudança maior em uma publicação;
- exige homologação dos oito recursos.

## 2º lugar — Entrega em três fases

Fases sugeridas:

1. busca múltipla, seleção e resumo;
2. colunas, filtros salvos e URL;
3. gaveta e Excel.

Vantagens:

- menor impacto por publicação;
- feedback antecipado.

Desvantagens:

- estado e interface precisam ser migrados várias vezes;
- durante semanas a Base fica parcialmente consistente;
- testes e documentação são repetidos.

## 3º lugar — Plugin sem alteração da tabela

Vantagens:

- implantação inicial rápida.

Desvantagens:

- seleção e gaveta dependem de leitura indireta do DOM;
- paginação e ordenação ficam frágeis;
- alto risco de regressão;
- não recomendado para produção.

## Decisão

A entrega completa foi escolhida, mas com arquitetura modular:

- `productivity-v99.js`;
- `xlsx-v99.js`;
- `styles_v99_productivity.css`.

Isso mantém a vantagem da entrega completa sem misturar os novos recursos com os
cálculos da Visão Executiva.
