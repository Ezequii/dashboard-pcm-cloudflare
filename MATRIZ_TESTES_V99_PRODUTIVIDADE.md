# Matriz de testes — V99.3

## Automatizados e executados

1. Sintaxe dos 11 arquivos JavaScript.
2. Versionamento único em `993`.
3. Ordem dos módulos.
4. IDs operacionais únicos.
5. Separação de códigos na busca múltipla.
6. Preservação de nomes com espaços.
7. Quantidade e valor do resumo.
8. Consolidação por etapa.
9. Ranking de fornecedores no resumo.
10. Assinatura ZIP do XLSX.
11. Estrutura OOXML.
12. Duas planilhas internas.
13. Autofiltro na planilha Registros.
14. Cabeçalho congelado.
15. Hooks de seleção na tabela.
16. Rota de detalhes por `_ROW_ID`.
17. Persistência de colunas.
18. Filtros salvos.
19. URL compartilhável.
20. Ausência de base sintética no pacote.

Execute:

```bat
python tools\testar_v99_operacional.py
```

## Homologação manual no navegador

1. Abra a Base de Tratativa.
2. Cole três RCs na busca múltipla e confirme três resultados.
3. Selecione uma linha e avance de página; a seleção deve permanecer.
4. Use “Selecionar todos os resultados”.
5. Copie o resumo e cole no Teams ou WhatsApp.
6. Oculte e reorganize colunas; recarregue a página.
7. Salve uma visão, altere filtros e reaplique.
8. Copie a URL e abra em janela anônima.
9. Clique em uma linha, navegue anterior/próxima e feche com `Esc`.
10. Exporte Excel e confirme as abas `Registros` e `Resumo`.

## Resoluções

- 1366×768;
- 1600×900;
- 1920×1080;
- zoom 100%, 110% e 125%.
