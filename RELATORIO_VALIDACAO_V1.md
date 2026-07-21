# Relatório de validação — PCM | Gestão de OS e Orçamentos V1

## Base operacional
- Registros: 2269
- Pendentes: 241
- Concluídos: 2028
- Falta lançamento: 57
- Falta pedido: 90
- Falta NF: 94
- Valor total: R$ 17,187,949.08
- Valor pendente: R$ 2,656,203.48

## Validações concluídas
- Importador da planilha original: OK
- Testes de consistência do JSON: OK
- IDs únicos: OK
- Contagens de status: OK
- Sintaxe TypeScript/TSX: OK
- Logos AMAGGI e favicon: OK
- Planilha `.xlsx` fora do pacote fonte: OK
- package-lock v3 com registry público: OK
- Árvore do lock reduzida para 161 pacotes alcançáveis

## Observação do ambiente de geração
O ambiente de execução desta sessão não conseguiu acessar o registry npm em tempo hábil,
portanto o `npm ci`/`vite build` completo não foi executado aqui.
O pacote inclui `package-lock.json` v3 com URLs públicas do npm e versões exatas.
No Cloudflare Pages, use `npm run build` e saída `dist`.
