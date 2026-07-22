# Dashboard PCM V107

## Ajustes solicitados na Base de Tratativa

- Removido o botão **Filtros** do contexto superior.
- Removidas as funções **Busca múltipla**, **Filtros salvos** e **Compartilhar visão**.
- Removida a seleção de linhas por checkbox, incluindo seleção da página, seleção total, resumo e exportação de selecionados.
- Mantidas as funções de abrir detalhes clicando na linha, configurar colunas e exportar a visão filtrada.
- O botão **Filtros avançados** foi reposicionado para a mesma linha do campo de busca.
- Preferências antigas de busca múltipla deixam de ser restauradas ou enviadas à API.
- Adicionados testes de regressão específicos da V107.

## Validação

```bash
npm run verify
```
