# Portal PCM — AMAGGI

Aplicação SaaS para acompanhamento de solicitações e ORCs do PCM, criada com a direção validada para a V1:

- **Visão Geral** única e adaptada às permissões;
- **Acompanhamento** como centro da operação;
- Drawer lateral para leitura e atualização do ORC;
- Análises gerenciais sem excesso de gráficos;
- importação da planilha real `CONTROLE DE REQUISIÇÕES 2026`;
- dados compartilhados no Cloudflare D1;
- arquivos originais e documentos privados no Cloudflare R2;
- autenticação com Cloudflare Access;
- Light Mode, Dark Mode, mobile, tablet, desktop, ultrawide e TV.

## Stack

- React + TypeScript + Vite
- Tailwind CSS + componentes no padrão Shadcn/UI
- TanStack Query
- Recharts
- Cloudflare Pages
- Cloudflare Workers + Hono
- Cloudflare D1
- Cloudflare R2
- Cloudflare Access

## Estrutura

```text
apps/
  web/    Interface React publicada no Cloudflare Pages
  api/    API publicada no Cloudflare Workers
    migrations/  Estrutura do banco D1

docs/    Instalação, atualização dos dados, arquitetura e segurança
```

## Desenvolvimento local

Requisitos: Node.js 20+ e npm 10+.

```bash
npm install
npm run db:migrate:local
npm run seed:local
```

Abra dois terminais:

```bash
npm run dev:api
```

```bash
VITE_DEMO_MODE=false npm run dev:web
```

Acesse `http://localhost:5173`.

Para visualizar a interface sem API, crie `apps/web/.env.local`:

```env
VITE_DEMO_MODE=true
```

## Verificação antes do envio ao GitHub

```bash
npm run verify
```

## Status da V1

Leia [docs/STATUS_V1.md](docs/STATUS_V1.md).

## Implantação

Leia [docs/DEPLOY_PASSO_A_PASSO.md](docs/DEPLOY_PASSO_A_PASSO.md) e, para detalhes, [docs/INSTALACAO_CLOUDFLARE.md](docs/INSTALACAO_CLOUDFLARE.md).

## Atualização da base

Leia [docs/ATUALIZACAO_DOS_DADOS.md](docs/ATUALIZACAO_DOS_DADOS.md).
