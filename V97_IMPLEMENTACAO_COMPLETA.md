# V97 — Confiabilidade e navegação

Esta versão consolida a base visual da V96 e resolve os principais riscos de atualização, navegação e publicação.

## Correções implementadas

1. `checkForDataUpdates()` implementada com comparação de `version.json`.
2. Todos os assets padronizados em `?v=97`.
3. `404.html` simplificado para redirecionamento seguro para `/`.
4. Os KPIs “Valor em andamento” e “RCs em andamento” abrem somente:
   - Sem lançamento;
   - Sem pedido;
   - Sem NF.
5. A fila de tratativa abre o grupo exato por etapa + fornecedor + responsável.
6. Removidos carregamentos duplicados ao alternar para a Base de Tratativa.
7. “Dias parado” é recalculado no navegador usando as datas da etapa atual.
8. Atualizações concorrentes usam token de requisição; respostas antigas são ignoradas.
9. O cache executivo não usa página, tamanho da página ou ordenação da tabela.
10. Estado de erro permanente com horário e botão “Tentar novamente”.
11. Barra de contexto na Base com filtros ativos, registros e valor total.
12. Exportação renomeada corretamente para CSV e protegida contra fórmulas do Excel.
13. Nomes completos são preservados internamente nos rankings e na fila.
14. `dashboard-data.json` não publica `OBS ADICIONAIS` nas próximas gerações.
15. `_SEARCH` deixou de ser gerado no JSON.
16. Pipeline de geração com validação de qualidade e troca atômica.
17. `version.json` passa a registrar versão, horário, linhas, qualidade e etapas.
18. Assets versionados recebem cache longo; dados e versão permanecem sem cache.
19. Headers de segurança ampliados, incluindo HSTS.
20. Acessibilidade melhorada com skip link, tabs ARIA e `aria-sort`.

## O que não foi alterado

- Fonte oficial da etapa: coluna `STATUS` tratada para `ETAPA`.
- Regras de concluído, sem lançamento, sem pedido e sem NF.
- Visual aprovado da V96.
- Dados atuais do usuário.
- Planilha Excel atual.
- `static/data/dashboard-data.json` atual.

## Arquivo central de regras

As regras novas ficam em:

`static/js/config.js`

Esse arquivo concentra limites de aging, metas e pesos de prioridade usados pela V97.

## Limite desta versão

A V97 não tenta implementar histórico, comparação diária, seleção de linhas, Excel real ou PDF gerencial. Esses itens permanecem para V98/V99/V100, evitando misturar estabilidade com expansão visual.
