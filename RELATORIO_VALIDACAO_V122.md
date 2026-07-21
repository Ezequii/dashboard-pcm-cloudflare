# Relatório de validação — V122 Vite experimental

## Resultado

A migração inicial para Vite foi concluída sem mudança visual ou funcional intencional.

### Pipeline

- Vite: 8.1.5
- `@cloudflare/vite-plugin`: 1.45.1
- Node usado na validação: v22.16.0
- Wrangler usado no dry-run: 4.112.0
- saída Vite: `dist-vite/`
- saída legado preservada: `dist/`

### Paridade

- 56 arquivos públicos compartilhados comparados.
- 56 arquivos byte a byte idênticos.
- 0 divergências no HTML, CSS, JavaScript, dados, imagens, manifesto web, headers e service worker.
- o único arquivo compartilhado propositalmente diferente é `build-manifest.json`, pois cada pipeline registra seu próprio conjunto de artefatos.

### Testes

- 177 testes JavaScript aprovados.
- 24 testes Python aprovados.
- auditoria: 46 referências, 95 IDs, 14 scripts e 75 vínculos DOM verificados.
- build Vite aprovado.
- build legado aprovado.
- `wrangler deploy --dry-run -c dist-vite/wrangler.json` aprovado.
- `npm install` reportou 0 vulnerabilidades.

### Segurança da migração

- scripts clássicos permanecem na mesma ordem;
- nenhum script foi transformado em módulo nesta fase;
- CSS ativo permanece o bundle consolidado da V121;
- staging pública é gerada e descartável;
- o pipeline legado continua disponível para rollback;
- dados operacionais continuam fora do cache silencioso do service worker.

### Conclusão

A V122 é adequada para homologação do pipeline Vite. A migração para ESM, hashing de JavaScript/CSS e TypeScript deve ocorrer somente em etapas posteriores.
