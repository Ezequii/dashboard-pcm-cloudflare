# Dashboard PCM V99.4A.2 — Fluxo completo

## Objetivo

Preservar a V99.3 como referência visual e corrigir as falhas observadas nos
seis prints reais enviados para homologação.

## Correções principais

### Fluxo do processo

As quatro etapas agora são sempre apresentadas simultaneamente:

1. Sem lançamento;
2. Sem pedido;
3. Sem NF;
4. Concluído.

Cada etapa mostra:

- quantidade;
- valor;
- participação na base;
- idade máxima;
- idade média;
- registros fora do prazo;
- ação para abrir a Base de Tratativa.

Mesmo que uma etapa não tenha registros, ela continua visível com valor zero.
Isso impede que o painel pareça um carrossel ou exiba somente uma etapa.

### Base de Tratativa

- coluna de seleção com largura própria;
- quatro primeiras colunas fixas com offsets calculados;
- eliminação da sobreposição que cortava a primeira coluna;
- cabeçalhos e células maiores;
- seleção e rolagem horizontal preservadas.

### Gaveta de detalhes

- valores monetários formatados em real;
- dias exibidos com unidade;
- documentos múltiplos separados em chips;
- datas múltiplas separadas;
- textos longos quebram linha;
- maior largura e melhor legibilidade.

### Responsividade

- quatro etapas em desktop;
- duas etapas por linha em telas intermediárias;
- uma etapa por linha no celular;
- colunas fixas desativadas em telas estreitas para evitar perda de espaço.

## Segurança preservada

A revisão mantém:

- payload executivo e operacional separados;
- whitelist de campos;
- remoção de `OBS ADICIONAIS` e `_SEARCH`;
- Cloudflare Access em modo fail-closed;
- publicação atômica;
- backup externo;
- rollback;
- HSTS e CSP;
- Excel real;
- oito recursos operacionais da V99.

## Atualização

Coloque a planilha oficial em:

```text
data/CONTROLE_DE_REQUISICOES_2026.xlsx
```

Execute:

```bat
ATUALIZAR_DADOS.cmd
```

## Validação

```bat
python tools\validar_v994a2.py
```

## Rollback

```bat
ROLLBACK_DADOS.cmd
```
