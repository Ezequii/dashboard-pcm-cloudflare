# Changelog

## 1.0.1-rc — 22/07/2026

### Correções de produção
- Removida a atribuição automática do importador como responsável de todos os ORCs.
- `completed_at` agora é limpo quando um registro importado deixa de estar concluído.
- Importação registra auditoria por ORC criado ou atualizado.
- Lotes reduzidos para 12 linhas por chamada para operação conservadora no Workers/D1 Free.

### Permissões
- Adicionados `/api/me`, `/api/users` e atualização administrativa de perfil/status.
- App Shell mostra identidade e perfil do usuário autenticado.
- Configurações deixa de usar usuários fictícios e passa a consultar o D1.
- Usuários desativados são bloqueados pela API.

### Visão Geral
- Seletor de período conectado ao backend.
- Rankings respeitam o período selecionado.
- KPI “Concluídas no período” acompanha mês, últimos 30 dias, ano ou histórico.

## 1.0.0
- Primeira entrega funcional do Portal PCM.
