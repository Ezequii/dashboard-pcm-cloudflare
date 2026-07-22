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

O projeto usa **Cloudflare Workers com Static Assets** e publica exclusivamente
`dist/`. O build oficial foi convertido para Node.js porque Wrangler e Workers
Builds já dependem de Node/npm; Python não é requisito de deploy.

### Configuração no painel Cloudflare

Em **Workers & Pages → seu Worker → Settings → Builds**, configure:

```text
Root directory: /
Build command: npm run build
Deploy command: npx wrangler deploy
Non-production branch deploy command: npx wrangler versions upload
```

O fluxo resultante é:

```text
npm run build
  └── node tools/build-dist.cjs
      └── gera dist/ por allowlist

npx wrangler deploy
  └── publica somente ./dist
```

Workers Builds executa Build e Deploy como etapas separadas. Não deixe o campo
**Build command** vazio: o deploy falhará porque `assets.directory = "./dist"`
exige que a pasta exista antes do Wrangler iniciar.

### Execução local ou CI externo

```bash
npm install
npm run build
npx wrangler deploy
```

Também está disponível:

```bash
npm run deploy
```

O `wrangler.toml` contém `[build] command = "npm run build"` para execuções
diretas locais de Wrangler. No Workers Builds, mantenha o **Build command** no
painel, pois esse ambiente não utiliza o custom build do Wrangler.

### Cloudflare Pages

Este repositório está configurado para **Workers Static Assets**, não para
Pages. Caso o projeto real seja Pages, não use `npx wrangler deploy`; configure:

```text
Build command: npm run build
Build output directory: dist
```

Ou, para Direct Upload:

```bash
npm run build
npx wrangler pages deploy dist
```

Não altere `wrangler.toml` para publicar a raiz do repositório. A pasta `dist/`
é reconstruída por allowlist e rejeita scripts, planilhas, documentos, arquivos
de rollback e relatórios internos.

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
