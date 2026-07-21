# Relatório de validação — V118 definitiva

## Consolidação

A camada experimental V117 foi aprovada visualmente e seus ajustes foram incorporados diretamente em:

`static/styles_v110_header_kpi.css`

A folha temporária `styles_v117_header_compact_preview.css` foi removida da origem e do `dist`.

## Escopo preservado

Nenhuma alteração funcional foi feita em:
- KPIs;
- Contexto atual;
- Base de Tratativa;
- filtros;
- tabela;
- dados;
- navegação entre abas;
- recarregamento;
- Cloudflare Access;
- regras de negócio.

## Validação de cascata

Foi verificado que as folhas carregadas depois do CSS principal do cabeçalho:
- `styles_v111_kpi_system.css`;
- `styles_v112_kpi_refinement.css`;
- `styles_v113_kpi_content_alignment.css`;
- `styles_v115_context_base.css`;

não possuem regras para os seletores do topo consolidados. Portanto, a remoção da camada experimental não altera as proporções aprovadas.

## Verificação automatizada

- 162 testes JavaScript aprovados;
- 24 testes Python aprovados;
- auditoria de 45 referências locais;
- 95 IDs HTML verificados;
- 14 scripts validados;
- 75 vínculos JavaScript–DOM conferidos;
- build concluído com 55 arquivos;
- 47 recursos no precache;
- 55 hashes SHA-256 do manifesto conferidos;
- nenhuma referência ativa à camada experimental;
- versão 118.0.0, token 11800 e cache v118 sincronizados.

## Resultado

A V118 é a consolidação definitiva do topo compacto aprovado na V117 experimental.
