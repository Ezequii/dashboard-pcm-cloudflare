# Deploy passo a passo — Portal PCM V1

Repositório: `dashboard-pcm-cloudflar`

## Antes de começar

No computador com Git e Node.js 22:

```bash
npm install
npm run verify
```

Não avance para produção se o `verify` falhar.

## 1. GitHub

Crie uma branch de release:

```bash
git checkout -b release/v1
git add .
git commit -m "feat: Portal PCM V1"
git push -u origin release/v1
```

Mantenha `main` como produção. Valide a branch antes do merge.

## 2. Criar D1

```bash
cd apps/api
npx wrangler login
npx wrangler d1 create dashboard-pcm-prod
```

Copie o `database_id` retornado para `apps/api/wrangler.jsonc`.

Depois:

```bash
npx wrangler d1 migrations apply dashboard-pcm-prod --remote
```

## 3. Criar R2

```bash
npx wrangler r2 bucket create dashboard-pcm-files-prod
```

O Worker já espera o binding `FILES`.

## 4. Testar o Worker

Preencha temporariamente as variáveis necessárias e execute:

```bash
npx wrangler deploy
```

Teste:

```text
https://SEU-WORKER.workers.dev/api/health
```

Deve retornar `ok: true`.

## 5. Publicar frontend no Pages

No painel Cloudflare, conecte o repositório GitHub ao Pages.

Configuração:

```text
Production branch: main
Build command: npm run build:web
Build output directory: apps/web/dist
```

Variáveis:

```text
VITE_API_URL=https://SEU-WORKER.workers.dev
VITE_DEMO_MODE=false
```

## 6. Configurar o Worker com Git

Conecte o mesmo repositório ao Worker `dashboard-pcm-api`.

Comando de deploy:

```text
npm run deploy:api
```

Confira os bindings:

```text
DB    -> dashboard-pcm-prod
FILES -> dashboard-pcm-files-prod
```

## 7. Configurar Access

Proteja frontend e API com Cloudflare Access.

No Worker configure:

```text
APP_ENV=production
WEB_ORIGIN=https://SEU-PAGES.pages.dev
ACCESS_TEAM_DOMAIN=SEU-TIME.cloudflareaccess.com
ACCESS_AUD=AUD_DA_APLICACAO
ADMIN_EMAILS=SEU_EMAIL_CORPORATIVO
```

O primeiro e-mail em `ADMIN_EMAILS` entra como administrador. Depois, perfis podem ser alterados em **Configurações > Usuários e permissões**.

## 8. Primeira importação

Acesse o link publicado:

```text
Importações > Selecionar arquivo
```

Use a planilha oficial e confira antes da confirmação:

- quantidade de registros;
- quantidade com alertas;
- fornecedor;
- ORC;
- equipamento.

Ao confirmar:

- arquivo original vai para o R2;
- registros vão para o D1;
- alterações ficam auditadas;
- outros dispositivos passam a consultar a mesma base.

## 9. Validação antes do merge

Confira:

1. Visão Geral.
2. Sem lançamento / Sem pedido / Sem NF.
3. Fornecedores.
4. Solicitantes.
5. Equipamentos.
6. Acompanhamento.
7. Drawer de ORC.
8. Upload de documento.
9. Light/Dark.
10. Celular.
11. TV `/tv`.
12. Usuário sem permissão.

Depois faça o Pull Request de `release/v1` para `main`.

## Observação sobre importações

A V1 processa 12 linhas por chamada. Isso prioriza compatibilidade com os limites conservadores do plano Workers/D1 Free. Em um plano Workers Paid, o tamanho pode ser aumentado depois de medir a importação real.
