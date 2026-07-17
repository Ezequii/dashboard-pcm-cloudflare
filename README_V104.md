# Dashboard PCM V104

## Objetivo

A V104 reforça a confiabilidade do carregamento dos dados publicados sem alterar as regras de negócio do dashboard.

## Melhorias

- Validação do tipo de conteúdo recebido antes de interpretar JSON.
- Limite de 12 MB por arquivo JSON para reduzir risco de consumo excessivo de memória.
- Limite explícito para a base executiva e para a base operacional.
- Conferência entre a quantidade publicada e os registros do arquivo executivo.
- Mensagens de erro mais específicas para conteúdo inválido, payload excessivo e publicação inconsistente.
- Cache do PWA atualizado para a V104.
- Identificação visual e metadados do pacote atualizados.

## Validação

```bash
npm test
npm run test:python
npm run build
```

O diretório `dist/` é recriado pelo build e contém somente os arquivos necessários para publicação.
