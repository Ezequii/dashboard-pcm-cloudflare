# Dashboard PCM — Lançamento de ORC · V1

Projeto separado do dashboard de OS, usando a mesma direção visual e de usabilidade, mas focado no fluxo de **lançamento de ORC**.

## Estrutura

O sistema possui somente duas abas:

1. **Visão Geral**
2. **Consulta**

## Entrada

O usuário carrega um único arquivo `.xlsx` no padrão:

`CONTROLE_DE_REQUISICOES_2026.xlsx`

A aplicação utiliza:

- `Acompanhamento RC 2026` — base principal;
- `Base Equipamento` — lookup opcional por Prefixo quando o equipamento estiver vazio.

A planilha real não é incorporada ao pacote.

## Regras da V1

Os estados são lidos diretamente da coluna `STATUS`:

- `FALTA LANÇAMENTO`
- `FALTA O PEDIDO`
- `FALTA NF`
- `CONCLUÍDO`

**Pendente de lançamento** = `STATUS = FALTA LANÇAMENTO`.

### Tempo ORC

- enquanto está em `FALTA LANÇAMENTO`: Data atual − Data de recebimento;
- depois do lançamento: Data de lançamento − Data de recebimento.

## Visão Geral

- registros no contexto;
- ORCs aguardando lançamento;
- valor a lançar;
- tempo médio de lançamento;
- fluxo operacional por status;
- pendentes por solicitante;
- pendentes por fornecedor;
- idade das pendências;
- recebimentos × lançamentos;
- fila de ação com as ORCs mais antigas;
- drawer com todos os campos da ORC.

## Consulta

- busca;
- filtros globais;
- ordenação;
- paginação;
- exportação CSV;
- exportação Excel real `.xlsx`;
- drawer completo com os 18 campos operacionais.

## Arquitetura

A V1 foi construída sem bibliotecas de runtime externas.

O navegador:
- lê o ZIP interno do XLSX;
- descompacta os XMLs usando `DecompressionStream`;
- interpreta a planilha localmente;
- não envia o arquivo para backend.

A exportação Excel é gerada no navegador por um escritor XLSX local.

Isso reduz dependências e deixa o deploy no Cloudflare Workers muito simples.

## Desenvolvimento

```bash
npm ci
npm run verify
```

O `package-lock.json` não possui dependências externas.

## Cloudflare Workers

Configuração recomendada:

```text
Build command: npm run build
Deploy command: npx wrangler@4.112.0 deploy
Root directory: /
```

O `wrangler.toml` usa Workers Static Assets:

```toml
[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

Não existe `_redirects`.

## Navegadores

A leitura XLSX usa APIs atuais do navegador. Chrome, Edge e Firefox atualizados são o alvo principal.

## Segurança e privacidade

- processamento local do Excel;
- CSP restritiva;
- proteção contra framing;
- `nosniff`;
- HSTS;
- exportação CSV protegida contra fórmulas iniciadas por `=`, `+`, `-` e `@`.
