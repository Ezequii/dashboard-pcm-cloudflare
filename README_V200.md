# AMAGGI PCM Workspace — V200 Foundation

Esta versão preserva a lógica operacional da V120 e adiciona uma nova camada de produto.

## Implementado
- Sidebar com os 5 menus aprovados
- Topbar compacta e busca global (Ctrl/Cmd + K)
- Light/dark mode com design tokens
- Visão Geral orientada a exceções
- Acompanhamento como tela principal de trabalho
- Estrutura inicial para Análises, Importações e Configurações
- Integração não destrutiva com filtros, tabela, drawer, XLSX, segurança e PWA existentes
- Layout responsivo

## Estratégia
A V120 permanece como referência/rollback. A V200 evita reescrever as regras PCM antes de estabilizar a nova experiência.

## Próximas etapas recomendadas
1. Extrair tabela e drawer legados para componentes V200.
2. Mapear estados/etapas e implementar `próxima ação + responsável + prazo`.
3. Implementar preview/diff da importação.
4. Migrar gradualmente CSS legado para o design system V200.
