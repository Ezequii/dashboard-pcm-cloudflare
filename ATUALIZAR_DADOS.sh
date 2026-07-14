#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f "data/CONTROLE_DE_REQUISICOES_2026.xlsx" ]]; then
  echo "ERRO: coloque a planilha em data/CONTROLE_DE_REQUISICOES_2026.xlsx"
  exit 1
fi

python3 -m pip install -r requirements_update.txt
python3 tools/gerar_json_planilha.py

echo
echo "Atualização concluída. Confira as contagens e publique os arquivos gerados."
