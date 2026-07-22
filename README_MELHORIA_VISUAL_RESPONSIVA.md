# Melhoria visual e responsiva — Dashboard PCM V120

Esta entrega preserva as regras de negócio, filtros, KPIs, tabela operacional, drawer de detalhes, atualização de dados e fluxo de publicação existentes na V120.

## O que mudou

- Menu principal movido para uma navegação lateral fixa em desktop, Full HD, ultrawide e TV.
- Em tablet e celular, o menu lateral passa a funcionar como drawer sobreposto com botão de abertura, backdrop e fechamento por ESC.
- Cabeçalho simplificado e mais corporativo, mantendo status da base e ação de recarregar.
- Área útil ampliada em monitores maiores sem perder limite de leitura.
- Breakpoints dedicados para notebook, tablet, celular, Full HD e telas 2K/4K.
- KPIs reorganizados automaticamente conforme a largura disponível.
- Cards, bordas, sombras e espaçamentos recebem acabamento mais leve e consistente.
- Drawer de detalhes ocupa toda a largura em celulares.
- Mantida acessibilidade por teclado e preferência de redução de movimento.

## Breakpoints principais

- 2560 px ou mais: composição para ultrawide/TV 2K/4K, conteúdo até 2440 px.
- 1920–2559 px: composição Full HD/TV com sidebar ampliada e cinco KPIs em linha.
- 1100–1919 px: sidebar fixa com adaptação para notebook e monitor.
- 700–1099 px: sidebar em drawer, KPIs em duas colunas e áreas operacionais empilhadas.
- até 699 px: experiência mobile, KPIs em uma coluna, header compacto e drawer de detalhes full-screen.

## Arquivos adicionados

- `static/styles_v121_premium_sidebar.css`
- `static/js/sidebar-v121.js`

Os nomes dos arquivos identificam a nova camada visual, mas o produto continua tecnicamente sincronizado como V120 para preservar os contratos e testes já existentes.

## Validação

- 166 testes Node: aprovados.
- 24 testes Python: aprovados.
- Build Cloudflare: aprovado.
