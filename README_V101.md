# V101 — Resiliência e acessibilidade

Esta evolução é incremental e preserva as regras de negócio, integrações e estrutura de dados da V100.1.

## Melhorias

- identificação visual atualizada para V101;
- tipos explícitos em ações de navegação, evitando submissões acidentais;
- nomes acessíveis nas principais regiões do dashboard;
- foco reforçado para teclado;
- suporte a alto contraste do sistema;
- comportamento mais estável em telas de 320 px a 900 px;
- modais, gavetas e ações ajustados para `dvh` e áreas seguras;
- impressão protegida contra elementos flutuantes;
- nova cobertura automatizada para a camada V101.

## Validação

```bash
npm test
npm run test:python
npm run build
```
