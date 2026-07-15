# Dashboard PCM V99.4A.4 — Topo, Base e Ordem do Fluxo

## Correções desta revisão

### Topo

O cabeçalho foi separado em três zonas independentes:

```text
Marca | Navegação | Acesso, atualização e ações
```

O selo de acesso não ocupa mais o espaço das abas. A atualização e os botões
ficam agrupados no lado direito, enquanto os filtros permanecem em uma segunda
linha.

### Base

Nenhuma coluna fica presa horizontalmente. A tabela usa rolagem natural, sem
sobrepor checkbox, etapa ou datas.

### Ordem padrão dos registros

```text
Sem lançamento
↓
Sem pedido
↓
Sem NF
↓
Concluído
```

Dentro de cada etapa:

```text
maior idade
↓
maior valor
↓
número da requisição
```

### Ordem padrão das colunas

```text
Etapa
Recebimento
Lançamento
Pedido
Data do pedido
NF / DANFE
Data da NF
Dias parado
Tratativa
Responsável
Demais dados
```

Uma nova chave de armazenamento impede que a configuração antiga de colunas e
ordenação substitua esse padrão.

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
python tools\validar_v994a4.py
```

## Rollback

```bat
ROLLBACK_DADOS.cmd
```
