# Revisão V120 — Produção

## Objetivo
Refinar a experiência visual e responsiva do dashboard PCM sem alterar regras de negócio, filtros, KPIs, tabela, drawer de detalhes ou pipeline de publicação Cloudflare.

## Alterações realizadas

- Runtime visual consolidado em `static/styles_v120_runtime.css`.
- Folhas históricas continuam preservadas para rastreabilidade e testes, mas não são mais carregadas individualmente pelo navegador.
- Menu lateral oficializado como V120.
- Sidebar fixa em desktop, notebook, Full HD, ultrawide e TV.
- Sidebar recolhível em desktop/notebook, com preferência persistida localmente.
- Drawer lateral em tablet e celular, com backdrop, ESC e gerenciamento de `aria-expanded`/`aria-hidden`.
- Breakpoints específicos para notebook, tablet, celular, Full HD, ultrawide e TV corporativa.
- KPIs com escala reforçada para TV e telas de alta resolução.
- Alvos de toque maiores em tablet/mobile.
- Foco visível padronizado para acessibilidade por teclado.
- Drawer de detalhes preservado em tela cheia no celular.
- Tabela operacional protegida contra quebra do layout em telas pequenas.
- Remoção do JavaScript experimental antigo da sidebar.

## Compatibilidade preservada

- Versão do produto: `120.0.0`.
- Cloudflare Pages / Workers: preservados.
- Atualização de dados: preservada.
- Exportações: preservadas.
- Filtros e busca: preservados.
- KPIs e rankings: preservados.
- Base de Tratativa: preservada.
- Drawer de ORC/OS: preservado.
- PWA e service worker: preservados.

## Validação final

- Auditoria do projeto: aprovada.
- JavaScript: 166/166 testes aprovados.
- Python: 24/24 testes aprovados.
- Build Cloudflare: aprovado.
- `dist/`: gerado com sucesso.

## Arquivos principais da revisão

- `index.html`
- `static/styles_v120_runtime.css`
- `static/js/navigation-v120.js`
- `REVISAO_V120_PRODUCAO.md`
