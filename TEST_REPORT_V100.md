# Relatório de testes — V100

## Testes executados

### JavaScript

Todos os arquivos JavaScript foram validados com `node --check`:

- `business-rules.js`;
- `state.js`;
- `utils.js`;
- `api.js`;
- `xlsx-export.js`;
- `filters.js`;
- `dashboard.js`;
- `table.js`;
- `core.js`;
- `main.js`.

Resultado: **sem erro de sintaxe**.

### Regras e navegação

O teste `tests/test_logic.js` executa a lógica estática com 60 registros sintéticos:

- total do dashboard: 60;
- pendentes: 45;
- etapas retornadas: 4;
- grupos prioritários: 6;
- filtro “Sem lançamento”: 15 registros;
- busca múltipla por dois códigos: 2 resultados;
- filtro exato da prioridade por etapa + fornecedor + responsável;
- paginação e ordenação;
- painel de histórico;
- geração do pacote Excel.

Resultado: **aprovado**.

### Pipeline da planilha

O gerador foi testado com uma planilha sintética de 24 registros:

- 6 registros em cada etapa no primeiro processamento;
- qualidade calculada em 100%;
- escrita atômica de dados e versão;
- segundo processamento com alteração de etapas;
- histórico com 2 snapshots;
- movimentos identificados: 1 entrada e 1 resolução;
- comparação financeira preservada.

Resultado: **aprovado**.

### Excel

Foi gerado um `.xlsx` real no teste lógico:

- abas Resumo e Base;
- cabeçalhos de resumo;
- cabeçalhos congelados;
- autofiltro;
- formatação monetária;
- proteção contra fórmulas em células;
- pacote Open XML não vazio.

Resultado: **aprovado**.

### Python

O gerador e os serviços foram compilados com `py_compile`.

Resultado: **sem erro de sintaxe**.

### Estrutura HTML

- nenhum ID duplicado;
- todos os scripts e estilos referenciados existem;
- os IDs ausentes na análise estática são criados dinamicamente durante a renderização;
- política de cache separa assets versionados de dados dinâmicos.

Resultado: **aprovado**.

## Limitação do ambiente de teste

O teste visual automatizado em navegador não foi executado porque o ambiente não possuía o binário Chromium e não tinha acesso de rede para instalá-lo. O pacote inclui `tests/TEST_CHECKLIST_MANUAL.md` com o fluxo de validação visual e operacional recomendado antes da publicação definitiva.

## Comando único

```bash
python tests/test_structure.py
```
