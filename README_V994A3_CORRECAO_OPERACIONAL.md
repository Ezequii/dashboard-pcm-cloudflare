# Dashboard PCM V99.4A.3 — Correção operacional

## Correções

- Base de Tratativa voltou a carregar os registros.
- `staticRows()` usa `operational-data.json`, não a variável removida `__STATIC_DATA`.
- erros de tabela não são mais convertidos silenciosamente em zero registros;
- painel de etapas duplicado respeita o atributo `hidden`;
- modal de colunas usa a mesma largura no `<dialog>` e no formulário;
- textos operacionais essenciais foram ampliados;
- fluxo principal com quatro etapas foi preservado;
- segurança, rollback, filtros, seleção, gaveta e Excel foram preservados.

## Atualização

```bat
ATUALIZAR_DADOS.cmd
```

## Validação

```bat
python tools\validar_v994a3.py
```
