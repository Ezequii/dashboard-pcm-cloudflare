# Relatório de validação — V121 experimental

## Estratégia

A V121 não elimina regras CSS. Ela reduz a cascata ativa no navegador a um único bundle experimental gerado a partir das 28 folhas da V120, preservando exatamente a ordem original.

As 28 folhas de origem permanecem no projeto e no HTML com `media="not all"`, portanto ficam inativas visualmente e continuam disponíveis para comparação e rollback durante a homologação.

## Mapeamento da cascata

- Folhas CSS da V120 mapeadas: 28
- Tamanho total das fontes: 451,319 bytes
- Bundle experimental: 455,222 bytes
- Seletores distintos identificados na auditoria estática: 2082
- Seletores presentes em mais de uma folha: 21
- Regras exatamente duplicadas entre folhas: 3

As duplicidades foram apenas catalogadas. Nenhuma regra foi removida nesta etapa para evitar regressão visual.

### Regras exatamente duplicadas identificadas

- `button, input, select, textarea { font: inherit; }`
- `.dashboard-tabs .tab-btn small { display: none; }`
- `.modal-card-v99 > header, .modal-card-v99 > footer { padding-inline: 16px; }`

Essas regras só serão candidatas a remoção na etapa definitiva, depois da homologação visual.

## Escopo preservado

Não foram alterados:
- layout estrutural;
- KPIs;
- drawer;
- filtros;
- Base de Tratativa;
- dados;
- regras de negócio;
- Cloudflare Access;
- comportamento dos botões e da navegação.

## Validação automatizada

- Auditoria do projeto aprovada.
- 171 testes JavaScript aprovados.
- 24 testes Python aprovados.
- Build concluído com 56 arquivos.
- 48 recursos incluídos no precache.
- 56 itens registrados no manifesto de integridade.
- Uma única folha CSS ativa no HTML da prévia.
- As 28 folhas originais permanecem preservadas.
- Ordem da cascata original validada automaticamente.
- Versão `121.0.0`, token `12100` e service worker `v121` sincronizados.

## Observação importante

Esta é uma versão experimental para homologação visual. O pacote ainda mantém as folhas originais e as inclui no precache para permitir rollback e comparação. A etapa definitiva poderá remover essas referências inativas e simplificar o pipeline somente após aprovação visual.

## Homologação recomendada

Comparar com a V120 em:
- 1920×1080;
- 1600×900;
- 1366×768;
- 1024×768;
- 768×1024;
- 390×844.

Validar especialmente:
- topo compacto;
- cinco KPIs;
- Contexto atual;
- Fluxo do processo;
- Fila prioritária;
- Top 3;
- Base de Tratativa;
- drawer e os oito campos destacados;
- modais;
- impressão;
- estados offline/atualização.
