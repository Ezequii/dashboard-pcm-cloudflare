# Auditoria V99.4A.3

## Causa da tabela vazia

Depois da separação entre `executive-data.json` e `operational-data.json`,
`staticRows()` ainda tentava ler:

```js
__STATIC_DATA.boot.table_columns
```

Essa variável não existia mais. O erro era capturado e transformado em uma
resposta vazia, fazendo a tela mostrar `0 registros` sem explicar a falha.

A V99.4A.3 usa:

```js
__OPERATIONAL_DATA_V994A.columns
```

com fallback para o contrato executivo.

## Causa do modal cortado

O `<dialog>` tinha largura de 680 px, enquanto o formulário interno solicitava
760 px. Como o dialog ocultava overflow, o conteúdo era recortado.

Agora os dois usam a mesma largura máxima e `box-sizing:border-box`.

## Causa da redundância

Camadas antigas com `display:* !important` ignoravam o atributo `hidden`.
A revisão adiciona uma regra final que sempre respeita `[hidden]`.

## Resultado

39/39 verificações automatizadas aprovadas.
