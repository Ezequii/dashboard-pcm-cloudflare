# Publicação da V100

1. Preserve o ZIP de rollback V95.
2. Gere novamente a base com `ATUALIZAR_DADOS.cmd`.
3. Confirme a existência de `static/data/dashboard-data.json` e `static/data/version.json`.
4. Abra o projeto localmente por servidor HTTP; não use apenas `file://`.
5. Verifique totais, etapas, filtros, fila e exportação.
6. Publique a pasta completa no Cloudflare Pages.
7. Faça recarga forçada no primeiro acesso.
8. Confirme que o cabeçalho indica V100.

## Rollback
Restaure o conteúdo do pacote `dashboard_rc_web_v95_rollback.zip` e publique novamente.
