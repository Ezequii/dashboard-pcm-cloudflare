# Mapeamento de diferenças — V99.2

## Direção adotada

A V99.2 não aplica apenas um tema sobre a V98.5. A tela executiva foi
reconstruída com a mesma arquitetura do mockup:

| Região | Coordenadas de referência | Implementação V99.2 |
|---|---:|---|
| Cabeçalho e filtros | `0,0 — 1536×147` | Duas linhas, logo, título, abas, atualização, ações e quatro filtros |
| Indicadores principais | `25,159 — 1486×136` | Quatro colunas: valor, RCs, conclusão e primeiro foco |
| Alertas operacionais | `25,306 — 1486×55` | Fila PCM, críticas e pendência mais antiga |
| Fluxo | `25,375 — 866×315` | Quatro etapas horizontais, ícones circulares e linha tracejada |
| Fila prioritária | `902,375 — 609×315` | Três linhas planas e link para a base |
| Ranking fornecedores | `25,702 — 728×272` | Tabela compacta com barras |
| Ranking solicitantes | `764,702 — 747×272` | Tabela compacta com barras |

## Diferenças inevitáveis

- O mockup é uma imagem rasterizada; o projeto usa texto e SVG reais.
- A fonte pode variar alguns pixels conforme o Windows e o navegador.
- Antialiasing, peso da fonte e desenho dos ícones podem variar.
- Os nomes e valores da planilha oficial podem ocupar comprimentos diferentes.
- O logo do projeto é o arquivo oficial existente, não os pixels do mockup.

## Como verificar de verdade

1. Abra `PREVIEW_V99_1_FIEL_MOCKUP.html`.
2. Abra `COMPARACAO_MOCKUP_V99_1.html`.
3. A comparação mostra o mockup à esquerda e o HTML/CSS verdadeiro à direita.
4. Depois da publicação, pressione `Ctrl + F5` uma única vez.

## Testes incluídos

- versão única dos assets em `991`;
- sintaxe dos nove scripts;
- IDs essenciais sem duplicação;
- renderizadores exclusivos da V99.2;
- arquitetura das sete regiões principais;
- Base de Tratativa preservada;
- compatibilidade do validador sem Node.js.
