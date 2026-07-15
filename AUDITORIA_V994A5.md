# Auditoria V99.4A.5

## Solicitações tratadas

### Melhorar Top fornecedores e Top solicitantes

Antes, as linhas exibiam basicamente nome, quantidade e valor.

Agora exibem também criticidade e idade máxima, com alinhamento próprio para
quantidade e valor. O clique mantém o valor completo da dimensão para evitar
falha com nomes truncados.

### Melhorar o topo

O topo foi refinado sem substituir a arquitetura da V99.4A.4:

- marca e título preservados;
- navegação central mais legível;
- acesso e atualização agrupados;
- ações separadas;
- filtros abaixo;
- fontes mínimas ampliadas;
- redução de sobreposição em larguras intermediárias.

### Corrigir Pendência mais antiga

A falta de ORC/OS ocorria porque o payload executivo não publicava esses campos.
A revisão adiciona somente orçamento final e ordem de serviço à whitelist
executiva.

O clique agora:

1. remove filtros, buscas múltiplas e limites conflitantes;
2. aplica etapa;
3. aplica fornecedor;
4. usa o escopo Documento;
5. busca ORC, OS, pedido, NF ou referência disponível;
6. abre a Base.

### Corrigir a linguagem RC

A interface operacional foi revisada para ORC/OS. O identificador técnico
“Nº REQUISIÇÃO” continua existindo na tabela porque pertence à planilha, mas não
é mais usado como título genérico de todos os registros.

### Melhorar filtros ativos

A faixa agora informa explicitamente quais filtros afetam a visão, a fila e a
Base, além de manter chips removíveis e a limpeza total.

## Segurança

A mudança no índice executivo é mínima e contratual. Não foram adicionados:

- observações;
- pedido;
- NF;
- dados completos da gaveta;
- chaves internas de registro;
- nome ou caminho da planilha.

## Limitação de homologação

A validação automatizada cobre contratos, sintaxe e comportamento das funções.
A renderização visual precisa ser conferida depois do deploy no navegador
corporativo em 1600×900 e 1366×768.
