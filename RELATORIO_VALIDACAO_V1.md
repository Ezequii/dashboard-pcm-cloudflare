# Relatório técnico — Dashboard ORC V1

## Escopo

Novo dashboard PCM focado em lançamento de ORC, derivado da direção visual do projeto PCM, com somente:

- Visão Geral
- Consulta

## Verificações realizadas

- sintaxe dos arquivos JavaScript: aprovada por `node --check`;
- `npm ci`: aprovado sem baixar dependências;
- `npm run verify`: aprovado;
- build `dist`: aprovado;
- `package-lock.json`: sem registry privado e sem dependências externas;
- Workers Static Assets: configuração presente;
- `_redirects`: inexistente;
- `_headers`: presente no build;
- leitura do XLSX real em navegador: aprovada;
- 2.269 registros reproduzidos;
- quatro status reproduzidos exatamente;
- exportação CSV: aprovada;
- exportação XLSX: aprovada e verificada como ZIP íntegro;
- responsividade móvel: smoke test aprovado.

## Arquivos de dados

O arquivo real enviado pelo usuário não foi incorporado ao ZIP do projeto.

## Deploy

Cloudflare Workers:

```text
Build: npm run build
Deploy: npx wrangler@4.112.0 deploy
Root: /
```
