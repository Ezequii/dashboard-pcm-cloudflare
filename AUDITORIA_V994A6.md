# Auditoria V99.4A.6

## Problemas confirmados pelos prints

### Topo visualmente pesado

O cabeçalho acumulava:

- cartão de acesso;
- cartão de metadados;
- indicador de atualização;
- abas altas;
- botões grandes.

A soma desses elementos criava sobreposição visual e pouca hierarquia.

### Rankings exibiam somente duas linhas

A V99.4A.5 combinava:

```text
painel mínimo: 270 px
cabeçalho: 68 px
três linhas: 3 × 68 px
colunas + rodapé
overflow: hidden
```

A geometria não comportava todos os elementos. A terceira linha e o rodapé
podiam ficar recortados.

### Contexto padrão incorreto

O renderizador escolhia primeiro:

```javascript
top_fornecedores_pendentes
solicitantes_pendentes
```

Por isso os rankings eram pendentes por padrão, embora o usuário esperasse o
total geral.

## Correções

### Topo

- cartão de acesso ocultado apenas visualmente;
- segurança continua ativa;
- metadados reduzidos para 9,5 px;
- opacidade padrão de 72%;
- fundo do topo com 88% de opacidade;
- relógio removido da apresentação;
- ações e abas compactadas.

### Rankings

- contexto inicial `all`;
- seletor `Geral / Em andamento`;
- datasets gerais usados por padrão;
- datasets pendentes usados somente após seleção;
- três linhas limitadas por `slice(0, 3)`;
- lista com 186 px mínimos;
- painel com 330 px mínimos;
- `overflow: visible`;
- rodapé estático e visível.

## Segurança

O cartão visual de acesso foi removido, mas os elementos e a política de
segurança continuam no DOM e no runtime. O carregamento operacional permanece
bloqueado quando a identidade corporativa não é validada.

## Homologação manual

Conferir em:

```text
1600 × 900
1366 × 768
zoom 100%
zoom 125%
```

Critérios:

1. nenhum cartão de acesso visível;
2. atualização discreta e legível;
3. Geral selecionado ao abrir;
4. três fornecedores visíveis;
5. três solicitantes visíveis;
6. Em andamento troca os dois rankings;
7. clique abre a Base no contexto correto.
