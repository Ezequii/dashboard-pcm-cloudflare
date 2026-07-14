# Dashboard PCM — Cloudflare Pages v72

Esta versão é **estática** para Cloudflare Pages.
Ela não usa FastAPI, Python, Pandas rodando em servidor nem Render.

## O que mudou
- O Excel foi convertido para `static/data/dashboard-data.json`.
- Os filtros, fluxos, KPIs, farol e tabela rodam no navegador.
- Não tem servidor para dormir.
- Não tem upload de planilha dentro do dashboard.
- Exportação gera CSV para abrir no Excel.

## Atenção importante sobre segurança
Cloudflare Pages publica arquivos estáticos. O arquivo `static/data/dashboard-data.json` contém a base do dashboard.
Se os dados forem sensíveis, não use link público sem proteção. O ideal é proteger com Cloudflare Access/Zero Trust ou publicar só para quem pode ver.

## Como publicar no Cloudflare Pages

1. Entre em https://dash.cloudflare.com
2. Vá em **Workers & Pages**
3. Clique em **Create application**
4. Escolha **Pages**
5. Clique em **Connect to Git**
6. Escolha seu repositório do GitHub
7. Configure:

```text
Project name: dashboard-pcm
Production branch: main
Framework preset: None / No framework
Build command: deixe vazio
Build output directory: /
Root directory: deixe vazio se os arquivos desta pasta estiverem na raiz do repositório
```

Se colocar esta pasta dentro de outra pasta no GitHub, coloque o nome dessa pasta no campo **Root directory**.

8. Clique em **Save and Deploy**

## Como atualizar a planilha depois

Como é Cloudflare Pages, não existe botão de upload interno.
O processo será:

1. Atualizar a base no projeto local
2. Gerar um novo `static/data/dashboard-data.json`
3. Fazer commit no GitHub Desktop
4. Push origin
5. Cloudflare Pages publica automaticamente

## Base usada nesta entrega
- Arquivo: CONTROLE_DE_REQUISICOES_2026.xlsx
- Aba: Acompanhamento RC 2026
- Linhas: 2093
- Colunas tratadas: 41
- Gerado em: 07/07/2026 14:08

## Observação sobre '-' e '*'
A base usada aqui vem da regra v69/v70: `-` e `*` contam como preenchido/feito.
