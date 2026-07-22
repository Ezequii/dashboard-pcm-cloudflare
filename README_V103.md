# Dashboard PCM V103

Evolução incremental da V102 com foco em confiabilidade do PWA e diagnóstico operacional.

## Alterações

- Corrige o registro do service worker para funcionar com a política CSP `script-src 'self'`.
- Remove JavaScript inline da página principal.
- Exibe aviso de ausência de conexão sem apresentar dados antigos como atuais.
- Implementa aviso de nova versão com atualização controlada pelo usuário.
- Usa `network-first` para navegação e `stale-while-revalidate` apenas para arquivos estáticos.
- Mantém dados e configurações em modo estritamente dependente da rede.
- Remove caches antigos durante a ativação.
- Inclui testes automatizados de entrega da V103.

## Validação

```bash
npm test
npm run test:python
npm run build
```
