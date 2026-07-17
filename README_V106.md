# Dashboard PCM V106 — Cache e integridade de build

## Correções principais

- Remove `immutable` dos arquivos JavaScript e CSS que usam nomes estáveis.
- Obriga revalidação desses ativos para evitar publicação com código antigo preso no navegador.
- Amplia a auditoria para bloquear políticas de cache incompatíveis com o modelo atual de versionamento.
- Gera `dist/build-manifest.json` com tamanho e hash SHA-256 de cada arquivo publicado.
- Atualiza pacote, interface, configuração de runtime e cache do service worker para V106.

## Validação

```bash
npm run verify
```

O manifesto de build permite conferir exatamente quais arquivos foram publicados e detectar alterações ou cópias incompletas.
