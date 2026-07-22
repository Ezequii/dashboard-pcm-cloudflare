# Dashboard PCM V100.1 — melhoria de usabilidade

Esta revisão preserva as regras de negócio, segurança, exportação e fluxo de dados da versão recebida.

## Melhorias aplicadas

- remoção de opções duplicadas nos seletores de busca;
- identificação visual atualizada para V100.1;
- metadados de descrição, cor do navegador e suporte a áreas seguras;
- foco visível consistente para navegação por teclado;
- alvos de toque com altura mínima em dispositivos móveis;
- modais e gaveta de detalhes limitados ao viewport;
- melhor reflow de cabeçalho, abas, ações e formulários em telas pequenas;
- ajustes para redução de movimento e impressão;
- novos testes automatizados de regressão.

## Validação executada

```bash
npm test
# 82 testes aprovados

python -m pytest tools/tests -q
# 24 testes aprovados

npm run build
# dist gerado com sucesso
```

## Execução local

Sirva a raiz do projeto por HTTP. Exemplo:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Publicação

```bash
npm run build
npm run deploy
```
