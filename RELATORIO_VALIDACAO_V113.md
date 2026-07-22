# Relatório de validação — Dashboard PCM V113

## Escopo

A V113 altera somente o alinhamento vertical das informações internas dos cinco KPIs executivos. O tamanho externo dos cartões, a grade geral, os dados, os filtros e as regras de negócio foram preservados.

## Revisão técnica

- CSS da V113 analisado sem erros de sintaxe;
- quatro faixas internas comuns: título, valor, detalhe e apoio/ação;
- margem útil calculada em 20 px no topo e 20 px na base dos cartões em desktop;
- diferença máxima de 2 px entre o centro do botão do primeiro foco e o eixo da faixa inferior;
- barra de progresso, botão **Abrir na base** e link **Abrir caso** posicionados na mesma faixa inferior;
- regras próprias mantidas para notebook, tablet e celular;
- celular continua com altura natural e sem sobreposição de ações.

## Regressão e integridade

- 143 testes JavaScript aprovados;
- 24 testes Python aprovados;
- auditoria de referências, IDs, scripts, CSP, JSON e versões aprovada;
- pacote, interface, configuração, runtime e service worker sincronizados na V113;
- 60 arquivos incluídos no build;
- 46 recursos incluídos no precache;
- 60 hashes SHA-256 conferidos no manifesto;
- arquivos críticos de origem e `dist` conferidos;
- o service worker do `dist` difere intencionalmente da origem apenas pela expansão automática do precache;
- lógica de dados e `dashboard.js` não foram alterados.

## Publicação

Publique o conteúdo completo da pasta `dist`. Em seguida, limpe o cache do Cloudflare e faça uma atualização sem cache no navegador.
