# Plano de rollback — V99.4A.2

## Arquivos protegidos

```text
executive-data.json
operational-data.json
publication-status.json
version.json
```

## Como funciona

Antes de uma nova publicação, a versão atual é copiada para:

```text
<pasta-ao-lado-do-projeto>_local_state/last-valid/
```

A versão é validada por hash e por `data_version`.

## Executar

```bat
ROLLBACK_DADOS.cmd
```

## Ordem de restauração

1. dados executivos;
2. dados operacionais;
3. status da publicação;
4. `version.json` por último.

## Segurança

- backup incompleto é rejeitado;
- hashes divergentes são rejeitados;
- a versão substituída é guardada em `<pasta-ao-lado-do-projeto>_local_state/pre-rollback/`;
- um relatório é gerado na pasta local protegida, em `reports/rollback-report.json`.

Depois do rollback, faça Commit e Push.


## Local do estado protegido

Os backups não ficam dentro da pasta publicável. Por padrão:

```text
../dashboard_rc_web_v99_4a_1_auditada_local_state/
```

Para definir outro local:

```bat
set PCM_LOCAL_STATE_DIR=D:\PCM_BACKUPS
```
