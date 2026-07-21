# V99.4A.4.1 — Hotfix OneDrive e backup imutável

## Erro corrigido

A V99.4A.4 apagava recursivamente o conteúdo de `last-valid` antes de criar um
novo backup:

```python
for child in backup_dir.iterdir():
    if child.is_file():
        child.unlink()
    elif child.is_dir():
        shutil.rmtree(child)
```

Quando o projeto estava dentro do OneDrive, o cliente de sincronização podia
manter a pasta `static/data` aberta. No Windows isso causava:

```text
PermissionError: [WinError 5] Acesso negado
```

A publicação era cancelada antes da troca dos dados.

## Solução

### Estado local fora do OneDrive

No Windows, backups, relatórios e arquivos temporários agora ficam em:

```text
%LOCALAPPDATA%\AMAGGI\DashboardPCM\<nome-do-projeto>\
```

Outro local pode ser definido:

```bat
set PCM_LOCAL_STATE_DIR=D:\PCM_BACKUPS
```

### Snapshots imutáveis

Cada atualização cria uma pasta nova:

```text
snapshots/
└── <versão>-<data>-<identificador>/
    ├── static/data/executive-data.json
    ├── static/data/operational-data.json
    ├── static/data/publication-status.json
    ├── static/data/version.json
    └── manifest.json
```

Nenhuma pasta de backup existente é apagada.

### Ponteiro da última versão válida

O arquivo abaixo identifica o snapshot usado pelo rollback:

```text
last-valid-pointer.json
```

Ele só é atualizado após:

1. copiar todos os arquivos;
2. validar os JSONs;
3. validar as versões cruzadas;
4. gerar e validar o manifesto.

### Retry de arquivos bloqueados

A substituição individual de arquivos tenta novamente em bloqueios temporários
de OneDrive, antivírus ou indexação do Windows.

### Compatibilidade

O rollback continua reconhecendo o formato antigo `last-valid/manifest.json`
quando ainda não existe o novo ponteiro.

## O que fazer com a pasta antiga

A pasta antiga ao lado do repositório pode permanecer onde está. A nova versão
não tenta apagar ou reutilizar essa pasta.

Ela pode ser removida posteriormente, após pausar o OneDrive, mas isso não é
necessário para atualizar o dashboard.
