# Rollback V99.4A.6

A V99.4A.6 preserva o mecanismo de snapshots imutáveis introduzido no hotfix
da V99.4A.4.1.

## Executar

```bat
ROLLBACK_DADOS.cmd
```

## Local padrão no Windows

```text
%LOCALAPPDATA%\AMAGGI\DashboardPCM\<nome-do-projeto>\
```

## Garantias

- backups existentes não são apagados;
- snapshot validado por versão e hash;
- arquivos restaurados individualmente;
- `version.json` restaurado por último;
- retry para bloqueios temporários;
- formato legado de backup ainda reconhecido.
