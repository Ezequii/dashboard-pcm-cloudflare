# Publicação da V100

## Cloudflare Pages

Configuração recomendada:

- comando de build: vazio;
- diretório de saída: `/`;
- branch de produção: a branch principal do repositório.

O arquivo `_headers` já configura cache longo para assets versionados e `no-store` para os dados.

## Atualização de dados

Execute o gerador antes do commit:

```bash
python tools/gerar_json_planilha.py
```

Depois confira:

- total de registros;
- contagem por etapa;
- qualidade da base;
- avisos no terminal;
- existência de `static/data/version.json`.

## Rollback

A V96 permanece disponível como pacote separado. Para rollback imediato, publique a pasta V96 intacta.

## Autenticação

A hospedagem estática não protege o JSON. Em ambiente corporativo, habilite Cloudflare Access, autenticação no proxy ou uma camada equivalente antes de divulgar a URL.

## CSP

A política atual permite scripts apenas da própria origem. `unsafe-inline` permanece por compatibilidade com o redirecionamento e pode ser removido após validação no ambiente definitivo.
