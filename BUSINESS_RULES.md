# Regras de negócio — V100

As regras visuais e de priorização ficam em `static/js/business-rules.js`.

## Faixas de idade

| Faixa | Dias |
|---|---:|
| Rotina | 0–7 |
| Acompanhar | 8–15 |
| Prioridade | 16–29 |
| Crítico | 30–59 |
| Muito crítico | 60+ |

## Metas padrão

| Métrica | Meta |
|---|---:|
| Processo concluído | 95% |
| Fila direta do PCM | até 40 RCs |
| Base considerada desatualizada | após 24 horas |

## Peso da prioridade

| Componente | Peso |
|---|---:|
| Etapa | 60% |
| Idade máxima | 20% |
| Valor | 15% |
| Quantidade | 5% |

## Peso por etapa

| Etapa | Peso |
|---|---:|
| Sem lançamento | 1,00 |
| Sem pedido | 0,48 |
| Sem NF | 0,40 |
| Concluído | 0 |

Esses valores são configuração inicial. A liderança pode alterar o arquivo sem procurar números espalhados pelo restante do código.

## Cálculo de dias

O navegador recalcula os dias corridos usando a data correspondente à etapa:

- sem lançamento: data de recebimento;
- sem pedido: data de lançamento;
- sem NF: data do pedido;
- concluído: data de NF, pedido, lançamento ou recebimento.

Quando a data necessária estiver ausente, o sistema usa o valor `DIAS PARADO` gerado pela planilha.
