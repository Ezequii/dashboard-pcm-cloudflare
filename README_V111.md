# Dashboard PCM V111 — KPIs alinhados

Esta versão refina o bloco de indicadores executivos sem alterar dados, filtros, cálculos ou regras de negócio.

## Alterações

- os cinco KPIs passaram a usar a mesma anatomia visual;
- títulos, valores, ícones e textos secundários compartilham eixos consistentes;
- o cartão **Pendência mais antiga** usa a mesma estrutura dos demais;
- o cartão **Primeiro foco recomendado** mantém sua ação sem comprimir o conteúdo;
- altura uniforme em monitores e notebooks;
- três colunas em notebooks compactos, duas em tablets e uma em celulares;
- altura livre em celulares para evitar corte de textos e ações.

## Publicação

Publique o conteúdo completo da pasta `dist`.

Depois do deploy:

1. limpe o cache do Cloudflare;
2. atualize o navegador sem cache;
3. confirme que a interface apresenta a versão V111.

## Verificação

Execute:

```bash
npm run verify
```
