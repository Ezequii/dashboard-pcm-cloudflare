# Dashboard PCM V105

Revisão consolidada de código e entrega.

## Melhorias

- auditoria automática de referências locais, IDs duplicados, CSP, sintaxe JavaScript e JSON;
- comando `npm run verify` para executar auditoria, testes e build;
- precache do PWA gerado a partir dos recursos realmente referenciados no HTML;
- suporte ao service worker em `localhost` e `127.0.0.1`;
- cache isolado na versão V105;
- manutenção das regras de não armazenar silenciosamente dados operacionais.

## Validação

```bash
npm run verify
```

O diretório publicável continua sendo `dist`.
