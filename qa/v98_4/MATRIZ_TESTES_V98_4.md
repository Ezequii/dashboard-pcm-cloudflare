# Matriz de testes — Dashboard PCM V98.4

## Testes automatizados incluídos

| # | Teste | Critério de aprovação |
|---:|---|---|
| 1 | Versionamento único | HTML, configuração e runtime usam somente `984` |
| 2 | Ordem dos scripts | Configuração primeiro; inicialização por último |
| 3 | IDs únicos | Nenhum componente essencial possui ID duplicado |
| 4 | Renderização única | V98.2 e V98.3 não são renderizadas antes da V98.4 |
| 5 | Componentes V98.4 | Todos os renderizadores consolidados estão presentes |
| 6 | CSS consolidado | A folha limpa é carregada depois da folha compartilhada |
| 7 | Fluxo responsivo | Linha do fluxo pertence ao contêiner, sem largura fixa |
| 8 | Body reduzido | No máximo dez classes e apenas módulos ainda necessários |
| 9 | Base compacta | Faixa de etapas compacta antes da tabela |
| 10 | JavaScript íntegro | Sintaxe via Node ou integridade SHA-256 |

Execute:

```bat
python tools\testar_v984.py
```

## Matriz visual para homologação após publicar

| Cenário | Tela | Critérios |
|---|---|---|
| 1366×768 · 100% | Visão Executiva | Sem sobreposição; primeiro foco legível; fluxo em uma linha |
| 1440×900 · 100% | Visão Executiva | Quatro indicadores equilibrados; rankings sem cortes |
| 1600×900 · 100% | Visão Executiva | Conteúdo centralizado; sem espaços excessivos |
| 1920×1080 · 100% | Visão Executiva | Largura máxima preservada; textos não ficam esticados |
| 1600×900 · 110% | Visão Executiva | Nenhuma rolagem horizontal |
| 1600×900 · 125% | Visão Executiva | Layout responsivo; fluxo não cruza etapas |
| 1366×768 · 100% | Base de Tratativa | Tabela visível sem cabeçalho excessivo |
| 1600×900 · 100% | Base de Tratativa | Faixa de etapas com aproximadamente 50 px |
| 1920×1080 · 100% | Base de Tratativa | Tabela usa bem a largura disponível |
| 1600×900 · 125% | Base de Tratativa | Busca, filtros e paginação não se sobrepõem |

## Cliques funcionais

1. Valor em andamento abre as três etapas pendentes.
2. RCs em andamento abre somente registros pendentes.
3. Processo concluído abre a etapa Concluído.
4. Primeiro foco abre etapa, fornecedor e responsável corretos.
5. Fila direta do PCM abre Sem lançamento.
6. Críticas abre a faixa acima de 30 dias.
7. Pendência mais antiga abre sua etapa.
8. Cada etapa do fluxo aplica e remove o filtro.
9. Cada prioridade abre exatamente o grupo apresentado.
10. Rankings filtram pelo nome completo, mesmo quando o texto está cortado.
