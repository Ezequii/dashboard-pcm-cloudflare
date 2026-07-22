# Validação da base real — Dashboard ORC V1

Arquivo analisado:

`CONTROLE_DE_REQUISICOES_2026(4).xlsx`

## Estrutura encontrada

- Aba `Fornedores`
- Aba `Base Equipamento`
- Aba `Acompanhamento RC 2026`
- Base principal: **2,269 registros** (formatação original: 2.269)

## Status

- CONCLUÍDO: **2028**
- FALTA NF: **94**
- FALTA O PEDIDO: **90**
- FALTA LANÇAMENTO: **57**

## Valores por etapa

- CONCLUÍDO: R$ 14,523,483.61
- FALTA O PEDIDO: R$ 998,624.59
- FALTA NF: R$ 807,799.23
- FALTA LANÇAMENTO: R$ 849,779.66

## Indicadores do fluxo

- Valor pendente de lançamento: **R$ 849,779.66**
- Idade média das 57 pendências em 22/07/2026: **6.0 dias**
- Tempo médio entre recebimento e lançamento nos registros com ambas as datas: **7.3 dias**

## Conferência do runtime

O leitor XLSX do próprio dashboard foi executado em navegador Chromium headless com o arquivo real.

Resultado apresentado pela interface:

- Registros: **2.269**
- Falta lançamento: **57**
- Valor a lançar: **R$ 849.779,66**
- Tempo médio de lançamento: **7,3 dias**
- Consulta: **2.269 registros**
- Drawer: **18 campos**
- Filtro pelo KPI Falta lançamento: **57 de 2.269 registros**

Exportações testadas no navegador:

- CSV: 57 registros filtrados + cabeçalho;
- Excel: arquivo `.xlsx` válido, ZIP interno sem corrupção.

Responsividade testada em 390 × 844:

- sidebar passa para navegação inferior fixa;
- largura total da página permanece igual à viewport;
- sem rolagem horizontal da página.
