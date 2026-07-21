# Dashboard PCM V123 — React/TypeScript Visual Experimental

## Objetivo

A V123 cria uma prévia paralela em React/TypeScript sem substituir o dashboard funcional existente.

- Produção / referência atual: `/index.html`
- Prévia React experimental: `/preview-v123.html`

A raiz continua usando o dashboard legado já homologado. A nova interface existe apenas para comparação visual e evolução arquitetural.

## O que foi incorporado na prévia

- React + TypeScript sobre o pipeline Vite já adotado;
- componentes reutilizáveis para KPIs, filtros, fluxo, fila, rankings, tabela e drawer;
- ícones Lucide;
- layout responsivo específico para monitor, notebook, tablet e celular;
- navegação inferior no celular;
- uso dos dados reais publicados em `static/data/executive-data.json`;
- validação corporativa pelo mesmo `security-config.json` e endpoint do Cloudflare Access;
- drawer com os oito campos prioritários já definidos na V120;
- assets React gerados pelo Vite com hash no nome.

## O que permanece intencionalmente fora desta etapa

A prévia ainda NÃO substitui a aplicação principal.

Alguns comportamentos da aplicação histórica ainda não foram migrados 1:1, incluindo:
- regras completas de contexto operacional;
- algoritmo original de primeiro foco;
- busca avançada completa;
- configuração de colunas;
- exportação Excel;
- todos os atalhos e contratos internos do runtime legado.

Nesta etapa, esses pontos são mantidos na aplicação principal, não recriados parcialmente como produção.

## Como validar

Após publicar `dist-vite`:

1. Abra a aplicação normal na raiz.
2. Abra `/preview-v123.html` em outra aba.
3. Compare:
   - topo;
   - Contexto atual;
   - cinco KPIs;
   - Fluxo do processo;
   - Fila prioritária;
   - Top 3;
   - Base de Tratativa;
   - drawer;
   - comportamento em tablet e celular.

## Próxima etapa recomendada

Somente após aprovação visual:

1. criar uma camada de regras de negócio tipada e testada;
2. portar Contexto atual e filtros com paridade 1:1;
3. portar a Base de Tratativa completa;
4. portar exportação/colunas;
5. comparar resultados entre legado e React automaticamente;
6. só então avaliar a troca da rota principal.
