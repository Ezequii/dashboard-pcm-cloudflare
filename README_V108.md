# Dashboard PCM V108

## Objetivo

A V108 corrige o recorte dos rankings no final da Visão Executiva e reorganiza os controles da Base de Tratativa para uso em monitores, mantendo adaptação confortável em notebooks, tablets e celulares.

## Alterações

- O bloco **Top 3 do contexto** passa a crescer conforme o conteúdo.
- As três posições de fornecedores e solicitantes ficam visíveis por inteiro.
- O rodapé permanece no fluxo normal, depois dos cards, sem sobreposição.
- A Visão Executiva aceita rolagem vertical quando a altura da tela não comporta todo o conteúdo.
- Na Base de Tratativa, **Buscar por**, **Busca geral**, **Filtros avançados**, **Exibir** e **Paginação** ficam alinhados na mesma linha em monitores.
- Em notebooks e tablets, a paginação é deslocada para uma segunda linha organizada.
- Em celulares, os controles são empilhados e os botões permanecem acessíveis ao toque.
- O seletor de quantidade recebeu associação explícita com o rótulo `Exibir`.
- O indicador de página passou a anunciar mudanças para tecnologias assistivas.

## Validação

Execute:

```bash
npm run verify
```

O comando audita o projeto, executa os testes JavaScript e Python e gera a pasta `dist`.
