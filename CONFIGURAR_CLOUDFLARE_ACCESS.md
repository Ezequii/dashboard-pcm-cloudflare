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
