# Dashboard PCM V102

## Melhorias desta versão

- Corrige o build de produção para incluir favicon e logotipo.
- Adiciona manifesto de aplicação e instalação como PWA.
- Inclui service worker conservador para o shell da interface.
- Mantém os dados operacionais em estratégia prioritariamente online.
- Adiciona aviso funcional para navegadores com JavaScript desabilitado.
- Reserva dimensões da marca para reduzir deslocamento visual durante o carregamento.
- Inclui testes de regressão do pacote publicável.

## Validação

```bash
npm test
npm run test:python
npm run build
```
