# O que foi implementado na V99.4A

A V99.4A não é uma versão visual isolada. Ela é a camada de **hardening,
confiabilidade e segurança** construída sobre a produtividade operacional da
V99.3.

## 1. Segurança e privacidade

- Cloudflare Access em modo `fail-closed`;
- contexto de acesso visível no cabeçalho;
- perfis `viewer`, `leadership` e `admin`;
- classificação dos dados;
- CSP sem scripts ou estilos inline;
- HSTS;
- bloqueio de frames;
- COOP e CORP;
- JSON operacional protegido pela mesma camada de acesso;
- remoção de `OBS ADICIONAIS`;
- remoção de `_SEARCH`;
- remoção de caminhos locais e nome da planilha dos metadados;
- publicação somente de campos incluídos em whitelist.

## 2. Separação dos dados

A antiga base única foi dividida em:

```text
executive-data.json
operational-data.json
publication-status.json
version.json
```

A Visão Executiva não precisa baixar os registros operacionais completos.
A Base de Tratativa carrega o arquivo operacional somente quando é aberta.

## 3. Confiabilidade no navegador

- comparação periódica de `version.json`;
- nova versão carregada somente quando realmente mudou;
- cancelamento de requisições antigas com `AbortController`;
- respostas antigas não substituem consultas recentes;
- validação cruzada entre todos os arquivos da publicação;
- timeout de rede;
- erros tipados;
- banner permanente de erro;
- horário da falha;
- último carregamento bem-sucedido;
- última versão válida;
- tentativa de recuperação sem recarregar a página inteira.

## 4. Pipeline seguro

- JSON escrito primeiro em arquivo temporário;
- validação antes da publicação;
- backup da versão anterior;
- troca atômica;
- `version.json` substituído por último;
- backup fora da pasta pública;
- rollback por comando;
- relatório de publicação;
- bloqueio de base vazia;
- validação das contagens por etapa.

## 5. Recursos da V99 preservados

- busca múltipla;
- seleção de linhas;
- seleção de todos os resultados filtrados;
- copiar resumo;
- colunas configuráveis;
- filtros salvos;
- URL compartilhável;
- gaveta de detalhes;
- Excel `.xlsx` verdadeiro;
- exportação de selecionados;
- navegação anterior e próxima na gaveta.

## 6. Revisões visuais dentro da V99.4A

### V99.4A.1

- retirada de legado do pacote;
- CSP mais restritiva;
- payload executivo minimizado.

### V99.4A.2

- quatro etapas simultâneas no fluxo;
- correção da gaveta;
- correção inicial da tabela;
- legibilidade ampliada.

### V99.4A.3

- tabela operacional voltou a carregar;
- modal de colunas deixou de ser cortado;
- painel redundante passou a respeitar `hidden`;
- erros deixaram de virar silenciosamente “zero registros”.

### V99.4A.4.1

- topo reorganizado;
- acesso e atualização não sobrepõem mais as abas;
- nenhuma coluna fica presa horizontalmente;
- tabela segue rolagem natural;
- colunas padrão seguem o processo:
  recebimento → lançamento → pedido → NF;
- registros abrem na ordem:
  sem lançamento → sem pedido → sem NF → concluído;
- dentro da etapa:
  maior idade → maior valor → requisição;
- preferências antigas não substituem o novo padrão;
- resumo duplicado de etapas foi removido.

### V99.4A.5

- topo lapidado com melhor hierarquia e legibilidade;
- rankings de fornecedores e solicitantes enriquecidos;
- identificação operacional padronizada como ORC / OS;
- pendência mais antiga mostra ORC e OS quando disponíveis;
- clique da pendência mais antiga limpa conflitos e abre o caso na Base;
- mostrador de filtros diferencia visão, fila e Base;
- whitelist executiva recebeu somente orçamento final e ordem de serviço;
- hotfix de snapshots fora do OneDrive foi preservado.

## Ainda não pertence à V99.4A

Os itens abaixo continuam planejados para a V99.4B ou versões posteriores:

- painel completo de qualidade dos dados;
- bloqueios por duplicidade, datas incoerentes e valores negativos;
- comparação detalhada com a atualização anterior;
- histórico semanal;
- alertas por Teams ou e-mail;
- previsão de redução da fila;
- novos versus resolvidos;
- relatório automático.
