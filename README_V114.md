# Dashboard PCM — V114

## Contexto fiel e Base de Tratativa orientada à busca

A V114 corrige somente a identificação visual do contexto e a organização da Base de Tratativa. Dados, cálculos, filtros, paginação, tabela, exportação, Cloudflare Access e regras de negócio permanecem preservados.

### Contexto atual

O rótulo **Visão** passa a reconhecer a origem dos contextos conhecidos:

- Valor em andamento;
- ORÇs/OSs em andamento;
- Processo concluído;
- Primeiro foco recomendado;
- Pendência mais antiga;
- etapas do fluxo;
- atalhos Geral, Fora do SLA, Críticos, Sem lançamento, Sem pedido e Sem NF.

Filtros complementares de solicitante, fornecedor e mês não apagam o nome da visão principal. Uma alteração manual no contexto operacional invalida a origem anterior e volta à derivação real, usando **Personalizada** apenas quando necessário.

### Base de Tratativa

- Atalhos de visão ficam somente na Visão Executiva;
- o card separado **Registros operacionais** foi removido;
- seu resumo foi incorporado discretamente ao cabeçalho de Registros;
- busca geral, filtros avançados, Exibir e paginação aparecem imediatamente após o Contexto atual;
- Colunas e Exportar Excel continuam junto à tabela.

### Publicação

Publique o conteúdo completo da pasta `dist` e limpe o cache do Cloudflare depois do deploy.
