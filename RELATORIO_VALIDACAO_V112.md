# Relatório de validação — V112

## Escopo

Refinamento exclusivo do bloco dos cinco KPIs executivos, preservando dados, filtros, navegação e regras de negócio.

## Contratos de layout verificados

- os cinco cartões usam a mesma altura governada pelo grid;
- títulos compartilham a mesma faixa vertical;
- valores principais compartilham a mesma faixa vertical;
- o fornecedor do Primeiro foco recomendado utiliza a largura integral do conteúdo;
- o botão Abrir na base fica ancorado no rodapé e não reduz a largura do valor;
- os metadados do foco reservam espaço horizontal para a ação;
- a Pendência mais antiga usa as faixas de detalhe e apoio;
- Abrir caso termina no mesmo limite inferior da ação do foco;
- no celular, o botão deixa o posicionamento absoluto e volta ao fluxo normal.

## Verificação automatizada

- auditoria de referências, HTML, CSP, JavaScript e JSON;
- testes JavaScript e Python;
- build integral da pasta dist;
- sincronização de versão entre pacote, interface, configuração, runtime e service worker;
- conferência dos hashes SHA-256 do manifesto de build;
- integridade do ZIP final.

## Publicação

Publique o conteúdo completo da pasta `dist` e limpe o cache do Cloudflare após o deploy.
