# PCM | Gestão de OS e Orçamentos — V4

Projeto reconstruído do zero para acompanhamento dos OS/ORCs recebidos pelo PCM.

## Escopo da V1

- Visão Geral executiva.
- Consulta operacional.
- Busca por OS, ORC, requisição, pedido, fornecedor, prefixo, equipamento e solicitante.
- Filtros por status, fornecedor e solicitante.
- Tabela responsiva.
- Drawer com todos os campos do registro.
- Exportação CSV da consulta filtrada.
- Identidade AMAGGI.
- Favicon e manifesto da aplicação.
- Cloudflare Pages como hospedagem.
- Cloudflare Access como autenticação externa.

## Entidade principal

Cada linha da planilha representa um registro operacional de OS/ORC.

`Nº REQUISIÇÃO`, `Nº PEDIDO DE COMPRA` e `Nº NFS/DANFE` são etapas/informações posteriores do processo e não o identificador principal do dashboard.

## Dados atuais

A primeira carga foi gerada a partir da planilha fornecida em 21/07/2026:

- 2.269 registros.
- 241 pendentes.
- 2.028 concluídos.
- 57 em Falta lançamento.
- 90 em Falta pedido.
- 94 em Falta NF.

## Atualizar a base

A planilha operacional não é versionada por segurança.

1. Copie a planilha para:

`data-local/CONTROLE_DE_REQUISICOES_2026.xlsx`

2. Execute:

```bash
npm run data:update
```

3. Confirme:

```bash
npm run verify
```

4. Faça commit somente do JSON atualizado em `public/data/os-orc.json`.

O importador usa apenas a biblioteca padrão do Python. Não instala bibliotecas de Excel.

## Desenvolvimento

Requisitos:

- Node.js 22.12 ou superior.
- npm.
- Python 3 para atualização da base.

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
```

Saída:

`dist/`

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

Não configure `npx wrangler deploy` como Deploy command para este projeto Pages.

## Segurança

Configure uma aplicação **Cloudflare Access** cobrindo todo o hostname/path do dashboard (`/*`).

A política de entrada deve ser criada no Zero Trust conforme a regra corporativa definida pela AMAGGI.

A V1 não possui banco de usuários nem senha própria.

Também é recomendado manter o repositório Git como **privado**, porque o JSON de dados faz parte do código-fonte da implantação.

## Branding

- `public/branding/amaggi-logo.png`
- `public/branding/app-icon.png`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run test`
- `npm run verify`
- `npm run data:update`


## Regra importante: OS e ORC

Na planilha, os campos são distintos:

- `Nº ORDEM SERVIÇO` = OS
- `Nº ORÇ. FINAL` = ORC / orçamento final

Mesmo quando o ORC é chamado informalmente de OS no dia a dia, o dashboard preserva os dois campos separadamente na Consulta, no detalhe e na busca.
