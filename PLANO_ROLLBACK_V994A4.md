# Plano de rollback — V99.4A.4

## Objetivo

Restaurar a última publicação válida sem misturar versões de dados.

## Estado local

Os backups ficam fora da pasta publicável, por padrão:

```text
../dashboard_rc_web_v99_4a_4_topo_base_fluxo_local_state/
```

Outro local pode ser definido com:

```bat
set PCM_LOCAL_STATE_DIR=D:\PCM_BACKUPS
```

## Arquivos restaurados

```text
executive-data.json
operational-data.json
publication-status.json
version.json
```

## Executar

```bat
ROLLBACK_DADOS.cmd
```

## Ordem segura

1. dados executivos;
2. dados operacionais;
3. status da publicação;
4. `version.json` por último.

## Proteções

- backup incompleto é rejeitado;
- hashes divergentes são rejeitados;
- versões cruzadas divergentes são rejeitadas;
- o estado substituído é preservado em `pre-rollback`;
- relatório gerado em `reports/rollback-report.json`.

Depois do rollback, faça Commit e Push.
