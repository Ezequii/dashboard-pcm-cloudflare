# PCM | Gestão de Orçamentos — V5

## Direção
V5 consolida o design e corrige a hierarquia funcional: ORC é o foco principal.

## Consulta
- Coluna OS removida.
- ORC permanece como identificação principal.
- OS continua no JSON, continua pesquisável pela busca geral e aparece no drawer.
- Tabela fica mais compacta e com menor largura mínima.

## Drawer
- ORC é o título principal.
- OS aparece como informação relacionada.
- Fornecedor aparece junto à identificação inicial.

## Visão Geral
- Nomenclatura prioriza Orçamentos/processos, evitando tratar OS e ORC como um único campo.
- Solicitantes e fornecedores continuam acionáveis.

## Design
- Camadas CSS V2/V3/V4 foram consolidadas em uma única camada V5.
- Sidebar compacta/recolhível preservada.
- Cards, tabela, contexto de consulta, drawer e loading refinados.
- Responsividade preservada.

## Preservado
- Importador Excel.
- Regras de status.
- Estrutura dos dados.
- Busca por OS e ORC.
- Filtros essenciais.
- Exportação.
- Segurança/Cloudflare.
