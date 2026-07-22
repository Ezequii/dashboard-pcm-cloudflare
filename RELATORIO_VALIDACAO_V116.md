# Relatório final de validação — V116

## Escopo

Manutenção conservadora da V115, sem alteração intencional da aparência, dos dados ou das regras de negócio.

## Resultado da limpeza

- 42 funções sem caminho de execução removidas;
- 1 constante local sem leitura removida;
- 7 CSS não referenciados retirados de `static` e arquivados;
- 8 marcadores de componentes antigos eliminados do HTML/JavaScript;
- caches gerados pelo Python removidos do pacote;
- JavaScript ativo reduzido em 25.720 bytes;
- CSS publicado reduzido em 250.034 bytes;
- `dist` reduzido em 277.714 bytes, aproximadamente 5,6%.

## Verificação técnica

- 159 testes JavaScript aprovados;
- 24 testes Python aprovados;
- 14 scripts validados por sintaxe;
- 45 referências locais auditadas;
- 95 IDs HTML auditados;
- 75 vínculos literais entre JavaScript e DOM conferidos;
- nenhum CSS ou JavaScript órfão na pasta publicável;
- nenhum vínculo literal para ID inexistente;
- nenhum marcador das interfaces removidas;
- 55 arquivos verificados no manifesto SHA-256;
- 47 recursos no precache;
- 0 divergências entre fonte e `dist` nos 54 arquivos que devem ser idênticos;
- 0 divergências de hash no `build-manifest.json`;
- versões sincronizadas em `package.json`, `index.html`, `app-config.js`, `core.js` e `sw.js`.

## Itens preservados por segurança

- as 29 folhas CSS ainda referenciadas;
- compatibilidade defensiva com preferências antigas de busca múltipla;
- ferramentas de geração, validação e rollback dos dados;
- testes e documentação históricos.

## Publicação

Publique o conteúdo completo da pasta `dist`. Depois, limpe o cache do Cloudflare e atualize o navegador sem cache.
