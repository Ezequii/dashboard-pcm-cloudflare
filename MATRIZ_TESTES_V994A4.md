# Matriz de testes V99.4A.4

## Topo

- marca, navegação e status em zonas separadas;
- CSS V99.4A.4 carregado por último;
- IDs sem duplicidade;
- abas preservadas;
- filtros preservados;
- botões de atualização e exportação preservados.

## Base

- nenhuma coluna recebe classe sticky;
- checkbox usa fluxo normal;
- rolagem horizontal permanece disponível;
- painel duplicado de etapas não existe;
- tabela usa o contrato operacional;
- falhas não são convertidas em zero registros.

## Ordem dos registros

- Sem lançamento;
- Sem pedido;
- Sem NF;
- Concluído;
- maior idade primeiro na mesma etapa;
- maior valor como segundo desempate;
- requisição como desempate final.

## Ordem das colunas

- recebimento antes de lançamento;
- lançamento antes de pedido;
- pedido antes de NF;
- gerador e navegador usam o mesmo contrato.

## Regressão

- busca múltipla;
- seleção;
- resumo;
- filtros salvos;
- URL;
- gaveta;
- Excel;
- publicação atômica;
- rollback;
- segurança e CSP.

## Resultado

```text
47/47 verificações aprovadas
10/10 testes V99.4A.4
7/7 testes de runtime
8/8 testes de produtividade
```
