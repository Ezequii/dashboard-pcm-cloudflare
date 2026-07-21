# Cloudflare Pages — V123 sem instalação automática

Este modo existe para contornar o erro do npm:

`npm error Exit handler never called!`

O dashboard não é reconstruído no Cloudflare. A pasta `dist-vite` já foi gerada e validada antes do commit.

## Configuração obrigatória no Pages

### Variável de ambiente

Adicione:

`SKIP_DEPENDENCY_INSTALL=1`

Isso impede que o Cloudflare execute `npm clean-install`.

### Build command

`bash tools/pages-prebuilt-build.sh`

### Build output directory

`dist-vite`

### Root directory

`/`

## Antes do novo deploy

1. Limpe o Build Cache no Cloudflare Pages.
2. Confirme que `SKIP_DEPENDENCY_INSTALL` vale `1`.
3. Faça novo deploy.

## Resultado esperado no log

O log não deve mais conter:

`Installing project dependencies: npm clean-install`

Em vez disso, deverá chegar diretamente ao comando de build e mostrar:

`[Pages] Usando build Vite pré-gerado; nenhuma instalação npm é necessária.`

## Desenvolvimento

O `package.json` e o código-fonte continuam no pacote para desenvolvimento local.

Este modo muda apenas a estratégia de deploy no Pages e não altera HTML, CSS, React, TypeScript, dados ou regras do dashboard.
