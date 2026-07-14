# Matriz de testes — V97

## Atualização e cache

- [ ] Abrir o dashboard e confirmar que a base carrega normalmente.
- [ ] Atualizar `version.json` e confirmar atualização automática em até 5 minutos.
- [ ] Clicar em “Recarregar” e confirmar nova leitura do JSON.
- [ ] Confirmar que CSS e todos os scripts usam `?v=97`.
- [ ] Confirmar que uma URL inexistente volta para `/`.

## Navegação

- [ ] Clicar em “RCs em andamento” e confirmar somente 3 etapas pendentes.
- [ ] Clicar em “Valor em andamento” e confirmar somente 3 etapas pendentes.
- [ ] Clicar em uma prioridade e confirmar etapa + fornecedor + responsável.
- [ ] Clicar em um fornecedor do ranking e confirmar o nome completo no filtro.
- [ ] Clicar em “Pendência mais antiga” e confirmar localização do registro.

## Base de tratativa

- [ ] Confirmar barra “Base filtrada por”.
- [ ] Confirmar total de registros e valor no contexto filtrado.
- [ ] Limpar um filtro individual.
- [ ] Limpar todos os filtros.
- [ ] Confirmar mensagem de nenhum resultado.
- [ ] Confirmar `aria-sort` ao ordenar colunas.

## Atualização de idade

- [ ] Deixar o dashboard aberto de um dia para o outro e confirmar aumento dos dias.
- [ ] Confirmar que Sem pedido usa a data de lançamento como início.
- [ ] Confirmar que Sem NF usa a data do pedido como início.
- [ ] Confirmar que Concluído não recebe aging novo.

## Exportação e segurança

- [ ] Confirmar nome contextual do CSV.
- [ ] Confirmar que célula iniciada por `=`, `+`, `-` ou `@` é neutralizada.
- [ ] Confirmar ausência de `OBS ADICIONAIS` após gerar novo JSON.
- [ ] Confirmar headers de segurança no ambiente publicado.

## Pipeline

- [ ] Gerar base válida e confirmar `dashboard-data.json` + `version.json`.
- [ ] Testar base com etapa desconhecida e confirmar que o JSON antigo é preservado.
- [ ] Confirmar criação de `data/quality-report.json`.
- [ ] Confirmar que os totais por etapa somam o total de registros.
