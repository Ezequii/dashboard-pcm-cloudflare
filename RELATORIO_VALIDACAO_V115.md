# Relatório de validação — V115

## Escopo

Remoção do bloco **Atalhos de visão** de toda a interface, sem alterar filtros, dados ou contexto operacional.

## Resultado

- bloco `quickChips` removido do HTML de origem e do `dist`;
- título “Atalhos de visão” e botões `quick-chip` ausentes da interface;
- Contexto atual preservado;
- cinco KPIs executivos preservados;
- Fluxo do processo, Fila prioritária e Top 3 preservados;
- Base de Tratativa continua iniciando pela busca;
- lógica V114 de identificação do contexto mantida;
- versões sincronizadas na V115.

## Verificação técnica

- 153 testes JavaScript aprovados;
- 24 testes Python aprovados;
- 44 referências locais auditadas;
- 100 IDs HTML verificados;
- 14 scripts validados;
- 62 arquivos no build;
- 47 recursos no precache;
- 62 hashes SHA-256 conferidos no manifesto de integridade;
- ZIP validado sem corrupção.
