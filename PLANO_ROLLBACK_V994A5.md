# Rollback V99.4A.5

A V99.4A.5 preserva o hotfix de snapshots imutáveis da V99.4A.4.1.

## Local padrão no Windows

```text
%LOCALAPPDATA%\AMAGGI\DashboardPCM\<nome-do-projeto>\
```

## Estrutura

```text
last-valid-pointer.json
snapshots/
pre-rollback/
reports/
staging/
```

## Executar

```bat
ROLLBACK_DADOS.cmd
```

## Garantias

- nenhuma pasta de backup anterior é apagada;
- o snapshot é validado por versão e hash;
- o formato antigo `last-valid/manifest.json` continua compatível;
- os arquivos são restaurados individualmente;
- `version.json` é restaurado por último;
- bloqueios temporários recebem novas tentativas.
