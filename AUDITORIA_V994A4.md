# Auditoria V99.4A.4

## Evidências recebidas

Foram analisados os prints reais da V99.4A.3 em 1600 px.

## Problemas confirmados

### Topo sem hierarquia

A navegação estava dentro do bloco da marca, enquanto o selo de acesso fazia
parte do conjunto de ações. Em larguras intermediárias, os dois blocos
disputavam o mesmo espaço.

### Colunas fixas desnecessárias

A Base aplicava offsets em quatro colunas além da seleção. Isso consumia grande
parte da largura e dificultava a leitura da sequência operacional.

### Ordem padrão inadequada

O estado padrão ainda abria ordenado por `DIAS PARADO`. Embora existisse uma
prioridade de etapa em uma versão anterior do sort, isso não representava
claramente o fluxo oficial.

### Preferências antigas

O navegador podia restaurar a ordem anterior das colunas e da tabela pelo
`localStorage`, mesmo depois da alteração do código.

## Solução aplicada

- header em três zonas;
- filtros em linha independente;
- status e ações agrupados;
- colunas horizontais não fixas;
- nova chave de preferências;
- `ETAPA asc` como ordenação inicial;
- comparação canônica das etapas;
- maior idade e valor como desempate;
- colunas cronológicas no gerador e na interface;
- remoção definitiva do resumo duplicado.

## Resultado técnico

```text
47/47 verificações aprovadas
10/10 testes específicos da V99.4A.4
7/7 testes de runtime
8/8 testes de produtividade
```
