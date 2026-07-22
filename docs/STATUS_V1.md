# Status da V1 — Release Candidate

## Entregue nesta versão

- App Shell responsivo com sidebar, topbar, Light Mode e Dark Mode.
- Visão Geral com os quatro KPIs validados, fluxo `Sem lançamento / Sem pedido / Sem NF`, atenção, fornecedores, solicitantes, equipamentos e últimas movimentações.
- Período da Visão Geral funcional para concluídas e rankings (`este mês`, `30 dias`, `ano`, `histórico`).
- Acompanhamento com pesquisa global, filtros rápidos, paginação, exportação CSV e Drawer por URL.
- Drawer do ORC com bloco “O que está faltando”, checklist, rastreabilidade, documentos, histórico e atualização com controle de concorrência.
- Tela de Análises com evolução mensal, fluxo, tempo em aberto, custos e rankings.
- Importação da planilha com leitura da aba de acompanhamento, validação, processamento em lotes, arquivo original no R2 e atualização compartilhada no D1.
- Importações registram eventos de auditoria por ORC criado/atualizado e por lote concluído.
- Novos ORCs importados não são atribuídos automaticamente ao usuário que fez o upload; a condição “sem responsável” permanece verdadeira até atribuição explícita.
- Configurações agora consulta usuários reais reconhecidos pelo Cloudflare Access e permite ao administrador alterar perfil/ativação.
- Perfil exibido no App Shell vem da identidade autenticada, sem nome fixo no código.
- Modo TV corporativa com KPIs, fluxo, atenção, fornecedores, solicitantes e equipamentos.
- Worker com autenticação Cloudflare Access, D1, R2 e auditoria.
- Migrações D1, dados demonstrativos e documentação de instalação.

## Compatibilidade de importação

O lote de importação foi limitado a 12 linhas por chamada para permanecer dentro dos limites conservadores do D1/Workers no plano Free. Em ambiente corporativo Workers Paid, esse valor pode ser elevado após medição de desempenho.

## Evoluções após validação em produção

- Escopo por área/centro de custo para líderes e coordenadores.
- Persistência completa das preferências gerais de Configurações.
- Editor avançado de fornecedores, equipamentos, solicitantes e centros de custo.
- Personalização persistente de colunas e filtros avançados.
- Exportação nativa XLSX e PDF corporativo, além do CSV.
- Notificações e integrações com Teams, Outlook, SAP e Coupa.
- Regras configuráveis de prazo/SLA por etapa.

## Validações técnicas executadas

- Verificação sintática de 22 arquivos TypeScript/TSX sem erros.
- Migrações SQL aplicadas em SQLite de validação.
- Carga demonstrativa validada: 3 usuários, 6 ORCs e eventos de auditoria.
- Conferência do fluxo `Sem lançamento / Sem pedido / Sem NF / Concluído`.
- Conferência de placeholders de SQL nas operações de importação.
- ZIP sem `node_modules`, credenciais, tokens ou planilha corporativa real.

O build Vite completo ainda depende da instalação das dependências por `npm install`/`npm ci`, pois o ambiente de geração não possui acesso ao registry npm.
