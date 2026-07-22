# AMAGGI PCM Workspace — V201

## Entrega
A V201 evolui a fundação V200 e ataca a tela central do produto: **Acompanhamento**.

### Acompanhamento
- integração correta com a Base de Tratativa real;
- busca V201 sincronizada com a busca operacional existente;
- filtros e paginação preservados;
- tabela com densidade, hierarquia e estados visuais de produto SaaS;
- cabeçalho enxuto e toolbar operacional;
- ações de colunas, limpar contexto e exportar;
- chips de visão rápida;
- cabeçalho fixo e área de rolagem própria;
- responsividade.

### Drawer
- drawer lateral reconstruído visualmente;
- largura e leitura adequadas para uso contínuo;
- campos prioritários aparecem primeiro;
- campos secundários agrupados em "Mais informações";
- navegação anterior/próxima, copiar e demais ações originais preservadas;
- light/dark mode usando os mesmos tokens do workspace.

## Compatibilidade
A V201 não altera regras de negócio, API, XLSX, segurança, Cloudflare Access, PWA ou modelo de dados.
O número do pacote permanece `120.0.0` para não quebrar os testes de contrato herdados da V120.

## Arquivos novos
- `static/styles_v201_tracking.css`
- `static/js/workspace-v201.js`

## Validação
Execute:
```bash
npm test
npm run build
```
