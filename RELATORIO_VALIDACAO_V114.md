# Relatório de validação — Dashboard PCM V114

## Escopo conferido

- identificação da visão acionada por KPIs, etapas e atalhos;
- preservação do nome da visão ao aplicar Solicitante, Fornecedor e Mês;
- invalidação segura da origem quando o filtro operacional é alterado manualmente;
- remoção visual dos Atalhos de visão na Base de Tratativa;
- preservação dos Atalhos na Visão Executiva;
- remoção do card Registros operacionais;
- incorporação do resumo operacional no cabeçalho de Registros;
- destaque e reposicionamento da busca sem alteração funcional;
- sincronização de origem e `dist`.

## Verificações executadas

- auditoria de HTML, referências locais, CSP, JavaScript e JSON;
- 150 testes JavaScript aprovados;
- 24 testes Python aprovados;
- build de produção concluído;
- 61 arquivos no build;
- 47 recursos no precache;
- 61 itens registrados no manifesto de integridade;
- pacote, configuração, runtime e service worker sincronizados na V114.

## Garantias preservadas

Nenhuma alteração foi feita nos dados publicados, cálculos, regras de negócio, API estática, paginação, ordenação, exportação, seleção de colunas ou Cloudflare Zero Trust.
