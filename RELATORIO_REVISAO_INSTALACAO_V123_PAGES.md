# Revisão completa de instalação — V123 Cloudflare Pages

## Problemas encontrados

### 1. package-lock.json não portátil
O lock anterior continha URLs de download de pacotes apontando para um registry interno do ambiente de geração.
Essas URLs foram removidas e substituídas por URLs públicas do npm.

### 2. Dependências desnecessárias para Cloudflare Pages
O build estático do Pages não precisa carregar o runtime Workers durante `npm ci`.

Foram removidos das dependências instaladas:
- @cloudflare/vite-plugin
- wrangler

Isso também elimina do caminho normal de instalação dependências pesadas associadas, como:
- workerd
- miniflare

O Wrangler continua disponível apenas sob demanda no script manual `deploy:pages` via `npx`.

### 3. Vite configurado para Pages estático
`vite.config.mjs` agora usa apenas:
- Vite
- @vitejs/plugin-react

A saída continua em:
`dist-vite`

### 4. Ambiente fixado
- Node.js: 22.23.1
- npm: 10.9.8
- registry: https://registry.npmjs.org/

## Validações realizadas

- `npm ci` do zero: aprovado
- instalação local: 31 pacotes em aproximadamente 5 segundos no ambiente de validação
- `npm run verify`: aprovado
- 182 testes JavaScript aprovados
- 24 testes Python aprovados
- TypeScript (`tsc --noEmit`): aprovado
- build Vite: aprovado
- 1574 módulos transformados
- build em aproximadamente 1 segundo no ambiente de validação
- 60 arquivos auditados no `dist-vite`
- 48 recursos no precache
- nenhum URL de registry interno presente no package-lock

## Paridade do build

Comparando o `dist-vite` anterior com o novo:
- 61 arquivos compartilhados
- nenhum arquivo da aplicação mudou
- a única diferença de conteúdo é o `build-manifest.json`, que é regenerado
- foram removidos apenas artefatos do runtime Workers que não são necessários no Pages

## Cloudflare Pages

Use:

Build command:
`npm run build`

Build output directory:
`dist-vite`

Root directory:
`/`

Antes do próximo deploy, limpe o Build Cache do projeto.
