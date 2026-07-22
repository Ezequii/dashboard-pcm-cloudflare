# Arquitetura da V1

```text
Cloudflare Access
        ↓
Cloudflare Pages — React/TypeScript
        ↓ /api
Cloudflare Worker — Hono, validação e autorização
        ├── D1 — ORCs, usuários, importações e auditoria
        └── R2 — planilhas originais e documentos
```

## Entidade central

`orcs` é a fonte operacional principal. A V1 preserva relacionamentos múltiplos de OS, requisição, pedido e NF em arrays JSON estruturados. A evolução futura pode separar esses arrays em tabelas relacionais sem alterar a experiência do usuário.

## Fluxo derivado

```text
Sem lançamento → Sem pedido → Sem NF → Concluído
```

A qualidade dos dados é independente da etapa. Um ORC pode estar “Sem NF” e também possuir inconsistências.

## Auditoria

`audit_events` registra atualizações manuais, documentos e importações. Eventos críticos não são editados pela interface.

## Concorrência

Cada ORC possui `revision`. Atualizações usam controle otimista; se outro usuário alterar o registro antes, a API responde com conflito e solicita recarregamento.
