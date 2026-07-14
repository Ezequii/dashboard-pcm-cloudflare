# Mapeamento funcional da V100

## Fluxo da liderança

1. Ler os seis KPIs.
2. Ver tendência contra a atualização anterior.
3. Identificar o primeiro foco na leitura rápida.
4. Avaliar distribuição por etapa.
5. Abrir a prioridade exata.
6. Conferir fornecedores e solicitantes de maior concentração.
7. Validar a qualidade da base.

## Fluxo operacional

1. Abrir a Base de Tratativa.
2. Aplicar preset, filtro ou link compartilhado.
3. Pesquisar um ou vários códigos.
4. Ordenar por idade, valor ou responsável.
5. Selecionar registros.
6. Copiar resumos ou exportar.
7. Abrir detalhes completos.
8. Salvar a visão para reutilização.

## Fluxo de atualização

1. Planilha entra na pasta `data`.
2. Loader normaliza os campos.
3. Gerador valida estrutura e volume.
4. Qualidade é calculada.
5. Snapshot histórico é criado.
6. JSON temporário é validado.
7. Troca atômica substitui a versão anterior.
8. `version.json` força a atualização dos navegadores.
9. Publicação estática entrega a nova base.

## Evoluções externas preparadas, mas não ativadas

- autenticação corporativa;
- alertas por Teams ou e-mail;
- automação de deploy;
- trilha de auditoria por usuário.

Esses recursos exigem infraestrutura e credenciais reais, portanto não são simulados no pacote estático.
