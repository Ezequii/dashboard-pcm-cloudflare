# Dashboard PCM V116

## Objetivo

A V116 é uma versão de manutenção conservadora. Ela preserva a interface e as regras de negócio aprovadas na V115, removendo apenas código comprovadamente sem uso e ativos que não participavam do build real.

## O que foi limpo

- 42 funções JavaScript sem chamadas reais foram removidas.
- Foi removida uma constante local sem uso na tabela.
- Foram retirados vínculos antigos de:
  - gaveta de filtros removida;
  - menu antigo de exportação;
  - exportação CSV antiga;
  - upload de planilha inexistente na interface;
  - cartões de etapas removidos da Base;
  - seleção de linhas removida.
- Sete folhas CSS não carregadas por nenhuma página foram retiradas de `static`.
- Os CSS antigos foram preservados em `archive/legacy-css-v115/`, com hashes SHA-256.
- Diretórios gerados (`__pycache__` e `.pytest_cache`) foram removidos do pacote.

## O que foi preservado

- aparência da V115;
- filtros e identificação do Contexto atual;
- KPIs, fluxo, fila prioritária e Top 3;
- Base de Tratativa, busca, paginação, colunas e Exportar Excel;
- Cloudflare Access, service worker, cache e integridade do build;
- rotinas de geração, validação e rollback dos dados;
- compatibilidade defensiva com estados antigos de busca múltipla, embora a interface continue removida;
- documentação histórica e testes de regressão.

## Auditoria reforçada

`npm run verify` agora também bloqueia:

- CSS ou JavaScript ativo sem referência em `index.html` ou `404.html`;
- referências JavaScript literais para IDs que não existem;
- retorno de componentes removidos;
- divergências de versão, CSP, cache, JSON ou referências locais.

## Publicação

Publique somente o conteúdo completo da pasta `dist`.

```bash
npm run verify
```

Depois do deploy, limpe o cache do Cloudflare e faça uma atualização sem cache no navegador.
