# Changelog V100

## Confiabilidade

- Implementada `checkForDataUpdates()`.
- Padronizado o cache busting em `?v=100`.
- Adicionado fallback para a última base válida carregada em memória.
- Removidos carregamentos duplicados de dashboard e tabela.
- Adicionado banner persistente de erro.
- `404.html` substituído por redirecionamento simples.
- Gerador passa a escrever JSON e versão de forma atômica.
- Publicação é interrompida em base vazia ou queda superior a 50% versus a versão anterior.

## Visão executiva

- Seis KPIs objetivos: valor em andamento, RCs em andamento, conclusão, mais antiga, fila PCM e críticas.
- Removido o status subjetivo “BOM”.
- Comparação com snapshot anterior.
- Nova leitura rápida em blocos.
- Etapas exibem quantidade, valor, percentual, média, máximo e críticos.
- Fila prioritária abre etapa + fornecedor + responsável.
- Rankings alternam entre em andamento e total.
- Painel de qualidade da base.

## Base operacional

- Contexto de filtros visível.
- Filtros removíveis individualmente.
- Presets e visões salvas.
- Compartilhamento do estado por URL.
- Busca múltipla e destaque dos termos.
- Seleção de linhas.
- Cópia de resumos.
- Exportação dos selecionados.
- Configuração e persistência de colunas.
- Densidade de tabela.
- Gaveta com todos os detalhes do registro.
- Ações para copiar códigos.

## Exportação

- `.xlsx` verdadeiro, sem bibliotecas externas.
- Abas Resumo e Base.
- Cabeçalhos congelados.
- Autofiltro.
- Formatação monetária.
- Proteção contra células iniciadas por `=`, `+`, `-` ou `@`.
- CSV mantido como opção explícita.

## Arquitetura e visual

- Nova folha `styles_v100.css`.
- Removidas as folhas CSS históricas da V100.
- Regras de negócio centralizadas em `business-rules.js`.
- Layout responsivo para desktop, notebook e celular.
- Elementos interativos usam botões nativos.
- Navegação por teclado, foco visível e suporte a movimento reduzido.
