# Guia de validação visual — V117 Etapa 1

## O que observar no monitor

- as duas abas devem continuar claramente destacadas;
- o conjunto deve parecer menor, mas não apertado;
- os subtítulos das abas não devem cortar;
- os dois status devem parecer informativos, não botões principais;
- Recarregar deve ficar alinhado e proporcional aos status;
- a marca e o título não devem mudar de tamanho;
- KPIs, filtros e conteúdo abaixo do cabeçalho devem permanecer idênticos.

## O que observar no notebook

- marca e abas devem permanecer na primeira faixa;
- status e Recarregar podem permanecer na segunda faixa;
- nenhuma data deve invadir o botão;
- não deve existir rolagem horizontal.

## O que observar no tablet e celular

- abas devem continuar confortáveis para toque;
- textos não devem ser reduzidos excessivamente;
- status podem quebrar conforme a largura;
- Recarregar deve permanecer com área de toque confortável;
- o restante do dashboard não deve sofrer alteração.

## Decisão após o teste

- **Aprovado:** consolidar a camada experimental no CSS principal.
- **Precisa ajustar:** alterar somente
  `static/styles_v117_header_compact_preview.css` e repetir a validação.
- **Reprovado:** remover a camada e retornar ao topo da V116.
