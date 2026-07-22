# V108 corrigida — sincronização de runtime

Esta revisão corrige a falha de inicialização exibida como:

> Os arquivos da aplicação estão em versões diferentes.

## Correções

- `package.json` e `static/js/app-config.js` usam a versão `108.0.0`.
- `app-config.js` e `core.js` usam o mesmo token de ativos: `10800`.
- `index.html` usa `?v=10800` nos arquivos críticos `app-config.js` e `core.js`.
- O runtime deixou de exigir a função removida de seleção de linhas.
- O manifesto de build deriva a versão diretamente do `package.json`.
- A auditoria bloqueia divergências futuras entre pacote, interface, runtime, cache-busting, service worker e build.

## Validação executada

- 118 testes JavaScript aprovados.
- 24 testes Python aprovados.
- Auditoria de HTML, referências, CSP, JavaScript, JSON e versionamento aprovada.
- Smoke test do bootstrap e da validação de runtime aprovado.
- Build de produção concluído com 55 arquivos e 41 recursos no precache.

## Publicação

Publique a pasta `dist` inteira. Após substituir a versão anterior, limpe o cache do Cloudflare e faça uma atualização sem cache no primeiro acesso.
