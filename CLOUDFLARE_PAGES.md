# Cloudflare Pages + Access

## Pages

Configure o projeto com:

- Framework preset: Vite (ou None).
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

O projeto não precisa de Wrangler para o deploy via Git Integration.

## Cloudflare Access

Proteja o hostname completo da aplicação e todos os caminhos:

`/*`

Isso é importante porque o arquivo de dados também é servido pelo mesmo domínio:

`/data/os-orc.json`

A V1 assume que o Access bloqueia o acesso antes de o navegador receber HTML, JavaScript ou JSON.

## Repositório

Mantenha o repositório Git privado.

A planilha `.xlsx` é ignorada pelo Git, mas o JSON normalizado precisa existir em `public/data/` para o build estático.

## Headers

`public/_headers` já inclui:

- CSP
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy
- cache imutável para assets versionados
- `no-store` para `/data/*`
