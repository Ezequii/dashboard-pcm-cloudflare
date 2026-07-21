# Dashboard PCM V122 — Vite experimental

## Objetivo

Migrar o pipeline de desenvolvimento/build para Vite sem alterar a interface, a ordem dos scripts ou as regras de negócio da V121.

Esta é uma etapa experimental e reversível.

## O que mudou

- Vite 8 adicionado ao projeto.
- Plugin oficial `@cloudflare/vite-plugin` adicionado.
- Novo `vite.config.mjs`.
- Nova configuração `wrangler.vite.toml`.
- Staging pública gerada em `.vite-public/` por `tools/prepare-vite-public.cjs`.
- Novo pós-build em `tools/postbuild-vite.cjs`.
- Novo build Vite em `dist-vite/`.
- Pipeline legado preservado em `npm run build:legacy`.
- `npm run build` passa a executar o pipeline Vite experimental.
- O `wrangler.json` gerado é sanitizado após o build para ficar portátil entre máquinas.
- Manifesto de integridade e expansão do precache continuam ativos.

## O que NÃO mudou

- HTML visual.
- CSS consolidado aprovado na V121.
- Ordem dos scripts clássicos.
- Filtros.
- KPIs.
- Base de Tratativa.
- Drawer.
- Dados.
- Cloudflare Access.
- Service worker e política de dados operacionais.
- Regras de negócio.

## Comparação legado x Vite

Foram comparados os arquivos públicos compartilhados entre `dist/` e `dist-vite/`.

Resultado: 56 arquivos de interface/runtime ficaram byte a byte idênticos.

As únicas adições específicas do pipeline Vite são:

- `.assetsignore`
- `.vite/manifest.json`
- `wrangler.json`

O `build-manifest.json` existe nos dois pipelines, mas registra metadados diferentes porque o pipeline Vite inclui seus arquivos de infraestrutura.

O relatório completo está em `reports/v122-vite-parity.json`.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
npm run verify
```

Rollback do pipeline:

```bash
npm run build:legacy
```

Dry-run de deploy:

```bash
npm run build
npx wrangler deploy --dry-run -c dist-vite/wrangler.json
```

Deploy experimental:

```bash
npm run deploy
```

## Requisito de Node

A V122 usa Vite 8 e requer Node.js 20.19+ na linha 20 ou Node.js 22.12+.

## Próxima fase

A V122 propositalmente ainda não converte os scripts históricos em módulos ESM nem gera hashes para esses scripts. Isso será uma fase separada, depois da homologação visual/funcional desta migração inicial.
