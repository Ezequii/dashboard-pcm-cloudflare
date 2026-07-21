# Cloudflare Pages Build Fix — V123

## Diagnóstico

O erro ocorre durante `npm clean-install`, antes do Vite iniciar.

O projeto não possui dependências Git e o `package-lock.json` é lockfile v3 válido.

A correção fixa o ambiente de build em:

- Node.js 22.23.1
- npm 10.9.8

Arquivos adicionados:

- `.node-version`
- `.nvmrc`
- `.npmrc`

`package.json` também declara `packageManager: npm@10.9.8`.

A versão funcional do dashboard permanece V123. Este pacote altera somente o ambiente de instalação/build.

## Cloudflare Pages

Configuração recomendada:

- Build command: `npm run build`
- Build output directory: `dist-vite`
- Root directory: `/`

Antes do próximo deploy, limpe o Build Cache no Cloudflare Pages.

Se existir uma variável `NODE_VERSION` no projeto, configure-a como `22.23.1` ou remova-a para permitir que `.node-version` seja utilizado.

## Validação local

- `npm@10.9.8 ci` concluído com sucesso.
- `npm run build` concluído com sucesso.
- O pacote não inclui `node_modules`.
