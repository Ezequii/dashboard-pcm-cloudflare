# Segurança

- Cloudflare Access na frente do frontend e da API.
- Validação do JWT de Access no Worker.
- Permissões internas por perfil no D1.
- R2 privado; documentos não possuem URL pública permanente.
- CORS restrito ao domínio configurado.
- Auditoria de alterações e importações.
- Controle otimista de concorrência.
- Nenhuma senha ou token dentro do GitHub.
- Variáveis sensíveis configuradas no painel Cloudflare.

Perfis da V1:

```text
admin, analyst, manager → leitura e alteração
auditor                 → leitura e auditoria
requester, viewer       → leitura dentro do escopo
```
