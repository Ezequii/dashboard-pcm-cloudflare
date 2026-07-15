# Matriz de testes — V99.4A.2

## Automatizados

### Fluxo

- composição canônica com quatro etapas;
- ordem oficial;
- preservação dos valores da etapa existente;
- etapas ausentes convertidas em zero;
- grade desktop com quatro colunas;
- CSS carregado após todas as camadas anteriores.

### Tabela

- coluna de seleção independente;
- quatro primeiras colunas com classes fixas;
- offsets próprios;
- ausência de sobreposição estrutural;
- responsividade sem colunas fixas em telas estreitas.

### Gaveta

- moeda em formato brasileiro;
- documentos múltiplos separados;
- datas múltiplas separadas;
- textos longos com quebra;
- campos vazios identificados.

### Regressão

- 7 testes de runtime;
- 8 testes de produtividade;
- 14 testes do contrato visual;
- testes Python de segurança e publicação;
- pacote OOXML do Excel;
- CSP sem script ou estilo inline;
- payload executivo minimizado.

## Resultado executado

```text
33/33 verificações finais aprovadas
14/14 testes do contrato visual
7/7 testes de runtime
8/8 testes de produtividade
```

## Navegador automatizado

Foi feita uma nova tentativa com Chromium em 1600×900. O binário disponível no
ambiente encerrou o processo por indisponibilidade do processo de GPU antes de
criar o contexto da página.

A falha é do ambiente de execução e não foi convertida em aprovação visual.

## Homologação manual obrigatória

1. Publicar em homologação.
2. Abrir em 1600×900.
3. Confirmar as quatro etapas na Visão Executiva.
4. Clicar em cada etapa e conferir o filtro da Base.
5. Abrir a Base e verificar a primeira coluna.
6. Rolar horizontalmente e conferir as quatro colunas fixas.
7. Selecionar duas linhas.
8. Abrir a gaveta.
9. Conferir moeda, documentos e datas.
10. Repetir em 1366×768 e zoom de 125%.
