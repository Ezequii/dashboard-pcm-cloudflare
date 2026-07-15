# Configurar Cloudflare Access — V99.4A.2

## Objetivo

Proteger a página e todos os arquivos em `static/data/`.

## Configuração mínima

1. Abra Cloudflare Zero Trust.
2. Crie uma aplicação do tipo Self-hosted.
3. Cadastre o domínio do dashboard.
4. Proteja o caminho raiz `/*`.
5. Crie uma política Allow para o domínio corporativo.
6. Não crie política Bypass para `static/data/*`.
7. Confirme que `/cdn-cgi/access/get-identity` responde após o login.
8. Teste em janela anônima: o dashboard e os JSONs devem pedir autenticação.

## Validação obrigatória

- usuário corporativo autorizado entra;
- usuário anônimo é bloqueado;
- `executive-data.json` é bloqueado anonimamente;
- `operational-data.json` é bloqueado anonimamente;
- o cabeçalho mostra o perfil;
- logout do Access bloqueia nova consulta.

## Perfis da interface

O papel visual é calculado por e-mail e grupos no arquivo:

```text
static/config/security-config.json
```

Grupos sugeridos:

```text
pcm-admin
pcm-leadership
```

A proteção real continua sendo responsabilidade do Cloudflare Access.


## Proteção de arquivos locais

Não envie para o repositório a pasta de estado local usada por backup e
rollback. Ela fica fora da raiz publicável por padrão.


## Build publicável obrigatório

O Wrangler publica exclusivamente `dist/`. Antes de cada deploy:

```bash
python tools/build_dist.py
npx wrangler deploy
```

Nunca altere `wrangler.toml` para publicar a raiz do repositório. A pasta
`dist/` é reconstruída por allowlist e rejeita scripts, planilhas, documentos,
arquivos de rollback e relatórios internos.

## Verificação automatizada pós-deploy

Execute sem cookies ou credenciais de serviço:

```bash
python tools/verify_cloudflare_access.py https://SEU-DOMINIO
```

O comando deve retornar código zero. Ele falha se qualquer uma destas rotas
responder `2xx` anonimamente:

- `/`
- `/index.html`
- `/static/data/executive-data.json`
- `/static/data/operational-data.json`
- `/static/config/security-config.json`

Inclua essa verificação no pipeline após o deploy. Redirecionamentos para o
login do Access e respostas `401`/`403` são aceitos; resposta `200` é bloqueante.

## Regra de produção

`localDevelopmentAllowed` deve permanecer `false` no
`static/config/security-config.json` de produção. Mesmo em configurações de
desenvolvimento, o bypass só é aceito em `localhost`, `127.0.0.1` ou `::1`,
nunca em `file://`.
