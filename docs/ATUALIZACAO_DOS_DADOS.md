# Atualização dos dados

## Regra principal

Os dados oficiais não ficam no computador de quem importa. Eles ficam no **Cloudflare D1**.

```text
Planilha no computador
        ↓
Tela Importações
        ↓
Worker valida e processa
        ↓
D1 recebe os registros
R2 guarda o arquivo original
        ↓
Todos os usuários do mesmo link consultam a mesma base
```

## Atualização por planilha

1. Abra **Importações**.
2. Selecione `CONTROLE_DE_REQUISICOES_2026.xlsx`.
3. O navegador localiza a aba `Acompanhamento RC 2026`.
4. A tela mostra registros encontrados, válidos e com alertas.
5. Confirme a importação.
6. O arquivo original é enviado ao R2.
7. Os registros são enviados em lotes de 200 para o Worker.
8. O Worker cria ou atualiza os ORCs no D1.
9. A importação fica registrada na auditoria.

## O que acontece nos outros dispositivos

- Visão Geral e TV consultam novamente a API a cada 60 segundos.
- Acompanhamento recarrega quando o usuário volta para a aba ou muda filtros.
- Uma alteração realizada no Drawer é salva imediatamente no D1.
- Não é necessário instalar ou copiar a planilha em cada computador.

## Como a V1 evita duplicidades

Ordem de identificação:

1. `ID_SISTEMA`, quando existir em uma exportação futura.
2. Chave calculada com fornecedor, número do orçamento, recebimento, prefixo, OS e requisição.
3. Registros ambíguos permanecem com alerta para revisão.

## Dados reconhecidos na planilha atual

- Data de recebimento
- Data de lançamento
- Prefixo
- Equipamento
- Fornecedor
- Número do orçamento final
- Valor de serviço
- Valor de peças
- Valor total
- Solicitante
- Ordem de serviço
- Requisição
- Pedido de compra
- Data do pedido
- NF/DANFE
- Data de lançamento da NF
- Status
- Observações

Valores com `*` ou `-` não são tratados como documentos válidos.

## Segurança

- O bucket R2 é privado.
- Download de documento passa pelo Worker e exige usuário autenticado.
- Alterações registram usuário, data, antes e depois.
- O arquivo original de cada importação é preservado no R2.
