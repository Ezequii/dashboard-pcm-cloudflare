# Dashboard PCM V99.4A.6 — Topo clean e rankings gerais

## Objetivo

Esta revisão continua dentro da família V99.4A. Ela corrige os pontos observados
na homologação da V99.4A.5 sem iniciar a V99.4B.

## Topo

- remove o cartão visual `Acesso: Visualizador`;
- preserva a verificação de segurança no runtime;
- reduz o tamanho das informações de atualização;
- aplica transparência leve e `backdrop-filter`;
- esconde o relógio redundante;
- reduz a altura das abas e dos botões;
- mantém os filtros em uma segunda linha;
- reorganiza o cabeçalho em larguras intermediárias.

## Rankings

O padrão agora é:

```text
Geral
```

Esse contexto usa todos os registros disponíveis após os filtros gerais da
visão.

O seletor permite alternar para:

```text
Em andamento
```

Nesse modo são usados apenas:

```text
Sem lançamento
Sem pedido
Sem NF
```

Os dois rankings seguem o mesmo seletor:

- fornecedores;
- solicitantes.

Cada ranking mostra exatamente três linhas completas. O painel não possui mais
altura fixa incompatível com o cabeçalho, as três linhas e o rodapé.

## Clique contextual

Ao clicar em uma linha:

- `Geral`: abre a Base filtrada somente pela dimensão selecionada;
- `Em andamento`: abre a Base pela dimensão e pelas três etapas pendentes.

Os links “Ver todos” também respeitam o contexto selecionado.

## Itens preservados

- fluxo com quatro etapas;
- tabela sem colunas fixas;
- ordem lançamento → pedido → NF → concluído;
- ORC/OS na pendência mais antiga;
- filtros ativos por escopo;
- Cloudflare Access fail-closed;
- payload executivo e operacional separados;
- snapshots fora do OneDrive;
- rollback seguro;
- Excel real.

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
python tools\validar_v994a6.py
```

## Rollback

```bat
ROLLBACK_DADOS.cmd
```
