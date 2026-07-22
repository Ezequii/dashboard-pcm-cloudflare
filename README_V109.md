# Dashboard PCM V109 — Layout responsivo profissional

A V109 reorganiza a área útil do dashboard para monitores, notebooks, tablets e celulares sem alterar dados, permissões ou regras de negócio.

## Principais mudanças

- largura fluida com limite de 1600 px para aproveitar monitores Full HD sem espalhar o conteúdo em telas ultrawide;
- alinhamento do cabeçalho, Visão Executiva e Base de Tratativa no mesmo eixo;
- quatro filtros completos em monitores, duas colunas em tablet e uma coluna no celular;
- cinco KPIs em monitores, três em notebook compacto, dois em tablet e um no celular;
- textos dos KPIs com quebra controlada, reduzindo cortes e abreviações;
- Fluxo do processo e Fila prioritária lado a lado quando há espaço e empilhados em tablet;
- rankings lado a lado em desktop e empilhados em telas estreitas;
- manutenção do Top 3 completo e do rodapé no fluxo normal;
- manutenção da busca, Filtros avançados, Exibir e paginação alinhados na Base.

## Publicação

Publique o conteúdo integral da pasta `dist`. Após substituir uma versão anterior, faça a limpeza do cache do Cloudflare para evitar mistura de ativos.

## Verificação

```bash
npm run verify
```

A verificação inclui auditoria do projeto, testes JavaScript, testes Python, coerência de versão e build de produção.
