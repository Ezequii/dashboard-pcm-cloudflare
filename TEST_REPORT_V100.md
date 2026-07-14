# Relatório de testes — V100

## Testes automatizados executados
- Sintaxe de todos os arquivos JavaScript com `node --check`.
- Integridade do ZIP com `ZipFile.testzip()`.
- Verificação dos assets V100 referenciados no HTML.
- Verificação de IDs únicos no HTML.
- Confirmação do redirecionamento da página 404.
- Confirmação de versionamento `v=100` para CSS e JavaScript.

## Testes funcionais previstos para homologação
- Totais gerais equivalentes à V96 com os mesmos dados.
- Clique em cada KPI.
- Fila com etapa + fornecedor.
- Filtros compartilhados pela URL.
- Limpeza de contexto.
- Busca e paginação.
- Exportação CSV e relatório por impressão.
- Layout desktop, notebook e celular.
- Base ausente, JSON inválido e versão alterada.

Os testes dependentes da base real devem ser repetidos no ambiente publicado.
