# Dashboard PCM V100 — Edição Consolidada

A V100 consolida a visão executiva, a tratativa operacional e a manutenção técnica do dashboard em uma única versão.

## Principais recursos

- seis KPIs com funções distintas e navegação direta para a base;
- card compacto de pendência mais antiga;
- comparação com a atualização anterior quando houver histórico;
- leitura rápida em blocos clicáveis;
- etapas com quantidade, valor, média, idade máxima e registros críticos;
- fila prioritária por etapa, fornecedor e responsável;
- rankings alternáveis entre itens em andamento e total movimentado;
- filtros ativos visíveis, presets, visões salvas e links compartilháveis;
- pesquisa de vários códigos por linha, vírgula ou ponto e vírgula;
- seleção de registros, cópia de resumos, painel de detalhes e colunas configuráveis;
- exportação real em `.xlsx`, com abas Resumo e Base;
- validação de qualidade dos dados;
- atualização da base com escrita atômica e histórico de snapshots;
- CSS consolidado e JavaScript sem dependências externas.

## Atualizar a base

1. Coloque a planilha em `data/CONTROLE_DE_REQUISICOES_2026.xlsx`.
2. No Windows, execute `ATUALIZAR_DADOS.bat`.
3. Em macOS ou Linux, execute `./ATUALIZAR_DADOS.sh`.
4. Confira as contagens exibidas no terminal.
5. Publique a pasta no Cloudflare Pages, Netlify ou outro host estático.

O gerador cria:

- `static/data/dashboard-data.json`;
- `static/data/version.json`;
- `static/data/history/index.json`;
- snapshots em `static/data/history/`.

## Estrutura

```text
index.html
404.html
_headers
static/
  styles_v100.css
  js/
  data/
tools/
  gerar_json_planilha.py
  services/
data/
  CONTROLE_DE_REQUISICOES_2026.xlsx
```

## Segurança

O projeto é estático. Proteja a URL com Cloudflare Access ou outra autenticação corporativa quando a base contiver dados internos. O arquivo JSON não deve ser tratado como secreto apenas por não aparecer na interface.
