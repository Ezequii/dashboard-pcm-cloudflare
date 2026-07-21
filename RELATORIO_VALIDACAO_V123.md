# Relatório de validação — V123 React Visual Experimental

## Arquitetura

A V123 usa build multipágina:

- `index.html`: dashboard funcional preservado;
- `preview-v123.html`: prévia React/TypeScript paralela.

O Vite gera para a prévia:
- JavaScript com hash;
- CSS com hash;
- manifesto Vite.

## Segurança

A prévia:
- lê `static/config/security-config.json`;
- respeita `accessRequired`;
- consulta o `identityEndpoint` configurado;
- aplica `failClosed`;
- valida o papel contra `allowedRoles`;
- só depois carrega os dados do dashboard.

## Paridade do dashboard legado

O `index.html` gerado na V123 é estruturalmente idêntico ao da V122 após normalização apenas dos tokens:
- V122 → V123;
- 12200 → 12300;
- v122 → v123.

Nenhum outro arquivo público compartilhado apresentou diferença inesperada.

## Validações

- TypeScript: aprovado (`tsc --noEmit`);
- 180 testes JavaScript aprovados;
- 24 testes Python aprovados;
- auditoria do projeto aprovada;
- build legado aprovado: 56 arquivos;
- build Vite aprovado: 62 arquivos auditados;
- 48 recursos no precache;
- `wrangler deploy --dry-run` aprovado;
- referências geradas de `preview-v123.html` verificadas: nenhum asset ausente.

## Observação de escopo

A prévia React é uma prova de arquitetura visual usando dados reais e interações principais. Ela não deve substituir a rota principal até que as regras operacionais e recursos da Base tenham sido migrados com paridade automatizada 1:1.
