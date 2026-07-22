# Instalação no Cloudflare e GitHub

Repositório informado: `dashboard-pcm-cloudflar`.

## 1. Subir a V1 para uma branch

Extraia o ZIP na raiz do repositório, sem criar uma pasta extra.

```bash
git clone URL_DO_REPOSITORIO
cd dashboard-pcm-cloudflar
git checkout -b release/v1

# copie o conteúdo deste projeto para a raiz
npm install
npm run verify

git add .
git commit -m "feat: Portal PCM V1"
git push -u origin release/v1
```

Depois do primeiro `npm install`, confirme que o `package-lock.json` foi criado e inclua-o no commit. A partir daí, CI e produção podem usar `npm ci`.

## 2. Criar o D1

```bash
cd apps/api
npx wrangler login
npx wrangler d1 create dashboard-pcm-prod
```

Copie o `database_id` retornado e substitua o valor temporário em `apps/api/wrangler.jsonc`.

Aplique as migrações:

```bash
npx wrangler d1 migrations apply dashboard-pcm-prod --remote
```

Referências oficiais:

- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/d1/reference/migrations/
- https://developers.cloudflare.com/d1/wrangler-commands/

## 3. Criar o R2

```bash
npx wrangler r2 bucket create dashboard-pcm-files-prod
```

O nome já está configurado no binding `FILES` do `wrangler.jsonc`.

## 4. Publicar o Worker

Faça um teste manual inicial:

```bash
npx wrangler deploy
```

Depois conecte o mesmo repositório em **Workers & Pages > Create > Worker > Import repository**.

Configuração sugerida quando o Cloudflare pedir os comandos:

```text
Branch de produção: main
Diretório raiz: /
Deploy command: npm run deploy:api
```

Bindings obrigatórios no Worker:

```text
DB    → dashboard-pcm-prod
FILES → dashboard-pcm-files-prod
```

Variáveis:

```text
APP_ENV=production
WEB_ORIGIN=https://SEU_FRONTEND
ACCESS_TEAM_DOMAIN=seu-time.cloudflareaccess.com
ACCESS_AUD=audience-da-aplicacao-access
ADMIN_EMAILS=seu.email@empresa.com
```

## 5. Publicar o Pages

Em **Workers & Pages > Create > Pages > Import an existing Git repository**:

```text
Repositório: dashboard-pcm-cloudflar
Branch de produção: main
Build command: npm run build:web
Build output directory: apps/web/dist
```

Variável do Pages:

```text
VITE_API_URL=
VITE_DEMO_MODE=false
```

Com `VITE_API_URL` vazio, o frontend usa `/api` no mesmo domínio.

Referências oficiais:

- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/configuration/build-configuration/

## 6. Domínio recomendado

A configuração mais limpa e segura é:

```text
pcm.suaempresa.com        → Cloudflare Pages
pcm.suaempresa.com/api/*  → rota do Worker dashboard-pcm-api
```

Assim, frontend e API usam o mesmo domínio, o mesmo Cloudflare Access e não dependem de CORS entre domínios.

No Worker, adicione a rota:

```text
pcm.suaempresa.com/api/*
```

Sem domínio próprio, também funciona com:

```text
Frontend: dashboard-pcm.pages.dev
API: dashboard-pcm-api.SUBDOMINIO.workers.dev
```

Nesse caso:

```text
VITE_API_URL=https://dashboard-pcm-api.SUBDOMINIO.workers.dev
WEB_ORIGIN=https://dashboard-pcm.pages.dev
```

Proteja ambos com Cloudflare Access.

## 7. Cloudflare Access

Crie uma aplicação Self-hosted para o domínio do Portal PCM. Autorize apenas e-mails, grupos ou domínio corporativo permitidos.

A API valida o header `Cf-Access-Jwt-Assertion`, a assinatura, o emissor e a audience. O Access define **quem entra**; a tabela `users` no D1 define **o que cada pessoa pode fazer**.

Referências oficiais:

- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/

## 8. Preview e produção

Fluxo recomendado:

```text
release/v1 → Preview do Pages/Worker → validação → Pull Request → main → produção
```

O Pages publica automaticamente cada push conectado ao GitHub. Migrações do D1 devem ser aplicadas antes de liberar uma versão que dependa de novas colunas.
