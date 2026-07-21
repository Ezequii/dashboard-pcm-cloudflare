#!/usr/bin/env bash
set -euo pipefail

echo "[Pages] Usando build Vite pré-gerado; nenhuma instalação npm é necessária."

if [ ! -f "dist-vite/index.html" ]; then
  echo "[Pages] ERRO: dist-vite/index.html não encontrado." >&2
  exit 1
fi

if [ ! -f "dist-vite/preview-v123.html" ]; then
  echo "[Pages] ERRO: dist-vite/preview-v123.html não encontrado." >&2
  exit 1
fi

if [ ! -f "dist-vite/build-manifest.json" ]; then
  echo "[Pages] ERRO: build-manifest.json não encontrado." >&2
  exit 1
fi

echo "[Pages] Build pré-gerado validado."
echo "[Pages] Saída: dist-vite"
