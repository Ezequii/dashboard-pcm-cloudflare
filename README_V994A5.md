# Dashboard PCM V99.4A.5 — Lapidação visual e operacional

## Base da versão

Esta revisão parte da V99.4A.4.1 e preserva:

- publicação atômica;
- snapshots imutáveis fora do OneDrive;
- rollback seguro;
- Cloudflare Access em modo fail-closed;
- payload executivo e operacional separados;
- fluxo com quatro etapas;
- Base sem colunas fixas;
- ordenação padrão por lançamento, pedido, NF e concluído;
- busca múltipla, seleção, filtros salvos, URL compartilhável, gaveta e Excel.

## Melhorias desta variação

### Topo

- marca, navegação, acesso, atualização e ações com hierarquia mais clara;
- filtros em linha própria;
- fontes e alvos de clique maiores;
- comportamento responsivo com reorganização por zonas;
- botão de filtros destacado quando existe contexto ativo.

### Pendência mais antiga

- mostra ORC e OS quando disponíveis;
- exibe etapa e quantidade de dias;
- possui ação explícita “Abrir caso”;
- limpa filtros conflitantes;
- aplica etapa e fornecedor;
- busca o documento pelo número completo;
- abre a Base de Tratativa no caso correspondente.

Para possibilitar essa identificação sem carregar toda a base operacional, o
índice executivo passou a publicar somente dois campos adicionais:

```text
Nº ORÇAMENTO FINAL
Nº ORDEM SERVIÇO
```

`OBS ADICIONAIS` e `_SEARCH` continuam proibidos.

### Rankings

Fornecedores e solicitantes mostram:

- quantidade de ORCs/OSs;
- valor pendente;
- quantidade crítica acima do limite;
- maior idade;
- barra proporcional;
- ação de abrir a Base filtrada.

### Filtros ativos

A barra de contexto agora diferencia:

- filtros globais da visão;
- filtros operacionais da fila;
- busca e limites exclusivos da Base.

Cada filtro pode ser removido individualmente e “Limpar tudo” permanece
disponível.

### Terminologia

Os pontos operacionais deixam de chamar genericamente tudo de “RC”. A interface
usa ORC, OS, ORC/OS ou “registro” conforme o contexto.

## Atualizar os dados

Coloque a planilha oficial em:

```text
data/CONTROLE_DE_REQUISICOES_2026.xlsx
```

Execute:

```bat
ATUALIZAR_DADOS.cmd
```

## Validar

```bat
python tools\validar_v994a5.py
```

## Rollback

```bat
ROLLBACK_DADOS.cmd
```
