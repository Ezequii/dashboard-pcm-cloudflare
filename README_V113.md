# Dashboard PCM — V113

## Objetivo

A V113 corrige exclusivamente o alinhamento das informações dentro dos cinco KPIs executivos. As dimensões externas dos cartões, a grade geral da Visão Executiva, os dados e as regras de negócio permanecem iguais à V112.

## Ajustes aplicados

- títulos posicionados na mesma faixa vertical;
- valores principais no mesmo eixo;
- descrições em uma faixa comum;
- barra de progresso, botão **Abrir na base** e link **Abrir caso** alinhados na faixa inferior;
- metadados do primeiro foco elevados para não encostar na borda;
- etapa, referências e ação da pendência mais antiga reorganizadas internamente;
- comportamento natural preservado em celulares, sem alturas internas rígidas.

## Publicação

Publique todo o conteúdo da pasta `dist`. Depois do deploy, limpe o cache do Cloudflare e recarregue a aplicação sem cache.

## Verificação

Execute:

```bash
npm run verify
```

O comando audita referências, versões, scripts, JSON, testes e gera novamente a pasta `dist`.
