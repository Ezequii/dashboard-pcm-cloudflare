# Dashboard PCM — Fase 1 de estabilização

## Alterações aplicadas

- Uma única folha de estilo ativa em produção: `static/dashboard_phase1.css`.
- A ordem integral da cascata anterior foi preservada.
- Os onze arquivos CSS históricos continuam no pacote como fontes auditáveis e rollback.
- Foi criado `static/tokens_phase1.css` para iniciar a centralização de tokens.
- Foi criado `tools/build_css_phase1.py` para reconstruir o bundle de forma determinística.
- Foi criado `qa/phase1/test_phase1.py` para validar a consolidação.
- Os contratos existentes permaneceram intactos.

## Ganho imediato

Antes, o HTML fazia onze requisições de CSS. Agora faz uma.

A consolidação evita alterar seletores ou especificidade nesta etapa, reduzindo o
risco de regressão. A remoção progressiva de duplicações e `!important` deve ser
feita na próxima fase, apoiada por comparação visual em navegadores reais.

## Reconstruir o CSS

```bat
python tools\build_css_phase1.py
```

## Validar

```bat
python qa\phase1\test_phase1.py
python tools\validar_v994a6.py
```

## Rollback da consolidação

Substitua a referência a `dashboard_phase1.css` em `index.html` pelas onze
referências históricas registradas no comentário de auditoria imediatamente
abaixo do link atual.

## Resultado da validação desta entrega

- Fase 1: 6/6 verificações.
- Regressão original: 66/66 verificações.
