# V99.3 — Arquitetura de Produtividade Operacional

## Objetivo

Adicionar produtividade à Base de Tratativa sem alterar os cálculos homologados
da Visão Executiva.

## Módulos

### `productivity-v99.js`

Responsável por:

- normalização e aplicação da busca múltipla;
- seleção persistente entre páginas;
- resumo operacional para área de transferência;
- preferências de colunas;
- filtros salvos;
- serialização e restauração da URL;
- gaveta de detalhes;
- coordenação da exportação Excel.

### `xlsx-v99.js`

Escritor OOXML próprio, sem CDN ou biblioteca externa:

- ZIP com CRC32;
- planilhas `Registros` e `Resumo`;
- cabeçalho formatado;
- autofiltro;
- primeira linha congelada;
- valores monetários numéricos;
- largura automática das colunas.

### `api.js`

Extensões:

- `multi_search_terms`;
- modo `ANY` ou `ALL`;
- rota estática `/api/row`;
- manutenção dos filtros, ordenação e paginação existentes.

### `table.js`

Integrações:

- checkbox por linha;
- seleção da página;
- colunas configuráveis;
- abertura da gaveta;
- manutenção da seleção ao paginar.

## Persistência

- preferências gerais: `pcm-dashboard-preferences-v99-productivity`;
- colunas: `pcm-dashboard-columns-v99`;
- visões salvas: `pcm-dashboard-saved-views-v99`;
- URL compartilhável: parâmetro `view`.

## Segurança e limites

- proteção contra fórmulas maliciosas permanece no CSV;
- XLSX grava texto como `inlineStr`, evitando execução de fórmulas;
- busca múltipla limitada a 500 itens;
- URL compartilhável limitada a 100 itens;
- exportação limitada à capacidade da base estática publicada;
- nomes de arquivos são sanitizados.
