# Auditoria conservadora de código — V116

## Critério adotado

Nenhum item foi removido apenas por parecer antigo. A remoção exigiu ao menos uma destas confirmações:

1. o arquivo não era referenciado por `index.html` nem `404.html`;
2. a função possuía somente sua própria declaração e nenhuma chamada, exportação ou vínculo;
3. o código apontava para um elemento removido e não existia outro caminho de ativação;
4. o comportamento já havia sido explicitamente retirado da interface em versões anteriores.

## Remoções confirmadas

### JavaScript

Foram removidas 42 funções sem caminho de execução:

- `api.js`: 6;
- `dashboard.js`: 22;
- `filters.js`: 5;
- `core.js`: 6;
- `productivity-v99.js`: 2;
- `utils.js`: 1.

Também foram removidos:

- `preferredOrder`, constante local sem leitura;
- referências ao menu antigo de exportação e CSV;
- referências ao upload de planilha sem controles no HTML;
- renderização de `processCardsBase`, elemento removido da Base;
- referência opcional à antiga seleção de linhas;
- HTML da gaveta de filtros sem botão de abertura.

### CSS

Sete arquivos, totalizando 250.034 bytes, não eram carregados por nenhuma página:

- `styles.css`;
- `styles_v985_integrated.css`;
- `styles_v100_executive_decision.css`;
- `styles_v100_executive_final_polish.css`;
- `styles_v100_executive_no_redundancy.css`;
- `styles_v100_top_hierarchy.css`;
- `styles_v114_context_base.css`.

Eles foram movidos para `archive/legacy-css-v115/` em vez de apagados definitivamente.

## Redução medida

- JavaScript ativo: de 251.130 para 225.410 bytes;
- redução JavaScript: 25.720 bytes;
- CSS ativo: de 699.700 para 449.666 bytes;
- redução CSS publicado: 250.034 bytes;
- `dist`: de 4.999.143 para 4.721.429 bytes;
- redução do pacote publicado: 277.714 bytes, aproximadamente 5,6%;
- arquivos auditados no manifesto: de 62 para 55.

## Itens analisados e preservados

### Camadas CSS históricas ainda carregadas

As 29 folhas CSS restantes são referenciadas por uma página real. Muitas formam uma cascata histórica. Elas não foram consolidadas porque uma remoção baseada apenas em nomes poderia alterar o layout aprovado em resoluções específicas.

### Compatibilidade com busca múltipla antiga

A interface e o envio ativo da busca múltipla continuam removidos. Partes defensivas de normalização e leitura de estados antigos foram preservadas porque ainda são cobertas por testes de regressão e evitam falhas ao abrir preferências ou URLs antigas.

### Ferramentas e documentação históricas

Scripts de geração de JSON, validação, rollback, QA e documentos antigos não entram no `dist`. Foram mantidos por servirem ao processo operacional e à rastreabilidade.

## Proteções adicionadas

A auditoria agora falha quando encontra:

- CSS/JavaScript órfão dentro das pastas publicáveis;
- ID literal usado pelo JavaScript sem existir no HTML ou ser criado dinamicamente;
- marcadores de componentes já removidos;
- qualquer divergência anterior de CSP, cache, versão, JSON ou referências.

## Rollback

A V115 original permanece como referência integral. Os CSS retirados também estão arquivados dentro da V116 com nome, tamanho e SHA-256.
