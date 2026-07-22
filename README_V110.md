# Dashboard PCM — V110

## Objetivo

Refinar o cabeçalho e o indicador de pendência mais antiga sem alterar regras de negócio, dados, filtros ou navegação.

## Alterações

- removida a faixa colorida superior;
- mantida uma separação discreta do cabeçalho por borda e sombra;
- removido o menu Exportar do topo;
- preservado o botão Exportar Excel na Base de Tratativa;
- status e botão Recarregar padronizados na mesma altura;
- navegação principal redimensionada de forma proporcional;
- cabeçalho reorganizado para monitor, notebook, tablet e celular;
- card Pendência mais antiga reconstruído com a mesma linguagem visual dos demais KPIs;
- proporção dos cinco KPIs executivos revisada.

## Verificação antes do deploy

```bash
npm run verify
```

Publique o conteúdo completo da pasta `dist`. Após substituir uma versão anterior, limpe o cache do Cloudflare e faça uma atualização sem cache no navegador.
