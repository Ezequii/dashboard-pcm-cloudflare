from __future__ import annotations

import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
sys.path.insert(0, str(TOOLS))

from services.loader import find_workbook, load_workbook_data  # noqa: E402
from services.constants import ETAPA_COLORS, STAGE_ORDER, TABLE_COLUMNS  # noqa: E402

DATA_JSON = ROOT / "static" / "data" / "dashboard-data.json"
DATA_DIR = ROOT / "data"
DEFAULT_EXCEL = DATA_DIR / "CONTROLE_DE_REQUISICOES_2026.xlsx"

MAIN_FILTERS = [
    {"key": "SOLICITANTE", "label": "Solicitante", "type": "search-select"},
    {"key": "FORNECEDOR", "label": "Fornecedor", "type": "search-select"},
    {"key": "MES_RECEBIMENTO", "label": "Mês", "type": "search-select"},
]

COMPACT_TABLE_COLUMNS = [
    "ETAPA",
    "DIAS PARADO",
    "SLA STATUS",
    "DONO DA AÇÃO",
    "FAIXA ATRASO",
    "DATA DE RECEBIMENTO",
    "DATA LANÇAMENTO",
    "Nº ORÇAMENTO FINAL",
    "FORNECEDOR",
    "SOLICITANTE",
    "PREFIXO",
    "EQUIPAMENTO",
    "VALOR TOTAL",
    "Nº REQUISIÇÃO",
    "Nº PEDIDO DE COMPRA",
]

FULL_TABLE_COLUMNS = TABLE_COLUMNS


def clean_value(value: Any) -> Any:
    """Converte valores do pandas/numpy para JSON seguro."""
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass
    if isinstance(value, pd.Timestamp):
        if pd.isna(value):
            return ""
        return value.strftime("%d/%m/%Y")
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        if math.isnan(float(value)):
            return ""
        return float(value)
    if isinstance(value, float) and math.isnan(value):
        return ""
    if isinstance(value, (datetime,)):
        return value.strftime("%d/%m/%Y")
    return value


def iso_date(value: Any) -> str:
    try:
        if pd.isna(value):
            return ""
        return pd.Timestamp(value).strftime("%Y-%m-%d")
    except Exception:
        return ""


def _safe_text(value: Any) -> str:
    try:
        if value is None or pd.isna(value):
            return ""
    except Exception:
        pass
    text = str(value).strip()
    return "" if text.lower() in {"nan", "nat", "none", "null"} else text

def br_date(value: Any, fallback: Any = "") -> str:
    try:
        if pd.isna(value):
            return _safe_text(fallback)
        return pd.Timestamp(value).strftime("%d/%m/%Y")
    except Exception:
        return _safe_text(fallback)


def money_number(value: Any) -> float:
    try:
        if pd.isna(value):
            return 0.0
        return float(value)
    except Exception:
        return 0.0


def int_number(value: Any) -> int:
    try:
        if pd.isna(value):
            return 0
        return int(float(value))
    except Exception:
        return 0


def make_search(row: dict[str, Any]) -> str:
    keys = [
        "ETAPA", "FORNECEDOR", "SOLICITANTE", "PREFIXO", "EQUIPAMENTO",
        "Nº ORÇAMENTO FINAL", "Nº REQUISIÇÃO", "Nº PEDIDO DE COMPRA",
        "Nº NFS/DANFE", "STATUS", "OBS ADICIONAIS",
    ]
    return " ".join(str(row.get(k, "")) for k in keys if row.get(k, "")).upper()


def build_rows(df: pd.DataFrame) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for idx, source in df.reset_index(drop=True).iterrows():
        row: dict[str, Any] = {}
        for col in FULL_TABLE_COLUMNS:
            if col in source:
                row[col] = clean_value(source[col])
            else:
                row[col] = ""

        # Garante datas bonitas no display principal.
        row["DATA DE RECEBIMENTO"] = br_date(source.get("DATA_RECEBIMENTO_DT"), source.get("DATA DE RECEBIMENTO", ""))
        row["DATA LANÇAMENTO"] = br_date(source.get("DATA_LANCAMENTO_DT"), source.get("DATA LANÇAMENTO", ""))
        row["DATA DO PEDIDO"] = br_date(source.get("DATA_PEDIDO_DT"), source.get("DATA DO PEDIDO", ""))
        row["DATA LANÇAMENTO NFS"] = clean_value(source.get("DATA LANÇAMENTO NFS", ""))

        row["MES_RECEBIMENTO"] = clean_value(source.get("MES_RECEBIMENTO", ""))
        row["_ETAPA"] = str(source.get("ETAPA", ""))
        row["_ROW_ID"] = int_number(source.get("_ROW_ID", idx + 1))
        row["_VALOR_TOTAL"] = money_number(source.get("VALOR TOTAL", 0))
        row["_VALOR_SERVICO"] = money_number(source.get("VALOR SERVIÇO", 0))
        row["_VALOR_PECAS"] = money_number(source.get("VALOR PEÇAS", 0))
        row["_DIAS_PARADO"] = int_number(source.get("DIAS PARADO", 0))
        row["_DATA_RECEBIMENTO_ISO"] = iso_date(source.get("DATA_RECEBIMENTO_DT"))
        row["_DATA_LANCAMENTO_ISO"] = iso_date(source.get("DATA_LANCAMENTO_DT"))
        row["_DATA_PEDIDO_ISO"] = iso_date(source.get("DATA_PEDIDO_DT"))
        row["_DATA_NF_ISO"] = iso_date(source.get("DATA_NF_DT"))
        row["_SEARCH"] = make_search(row)
        rows.append(row)
    return rows


def read_existing_boot() -> dict[str, Any]:
    if DATA_JSON.exists():
        try:
            payload = json.loads(DATA_JSON.read_text(encoding="utf-8"))
            boot = payload.get("boot")
            if isinstance(boot, dict):
                return boot
        except Exception:
            pass
    return {
        "app_name": "Dashboard PCM 2026",
        "can_upload": False,
        "role": "viewer",
        "main_filters": MAIN_FILTERS,
        "advanced_filters": [],
        "table_columns": COMPACT_TABLE_COLUMNS,
        "full_table_columns": FULL_TABLE_COLUMNS,
        "stage_order": STAGE_ORDER,
        "stage_colors": ETAPA_COLORS,
        "auto_reload_seconds": 0,
    }


def main() -> int:
    DATA_DIR.mkdir(exist_ok=True)
    if not DEFAULT_EXCEL.exists():
        candidates = list(DATA_DIR.glob("*.xlsx")) + list(DATA_DIR.glob("*.xlsm")) + list(DATA_DIR.glob("*.xls"))
        if not candidates:
            print("ERRO: coloque a planilha em data/CONTROLE_DE_REQUISICOES_2026.xlsx")
            return 1

    workbook = find_workbook(ROOT, preferred=str(DEFAULT_EXCEL) if DEFAULT_EXCEL.exists() else None)
    print(f"Lendo planilha: {workbook.name}")
    loaded = load_workbook_data(workbook)
    df = loaded.df.copy()
    rows = build_rows(df)

    boot = read_existing_boot()
    boot.update({
        "app_name": "Dashboard PCM 2026",
        "can_upload": False,
        "role": "viewer",
        "main_filters": MAIN_FILTERS,
        "advanced_filters": [],
        "table_columns": COMPACT_TABLE_COLUMNS,
        "full_table_columns": FULL_TABLE_COLUMNS,
        "stage_order": STAGE_ORDER,
        "stage_colors": ETAPA_COLORS,
        "auto_reload_seconds": 0,
    })

    date_min = ""
    date_max = ""
    if "DATA_RECEBIMENTO_DT" in df.columns:
        vals = df["DATA_RECEBIMENTO_DT"].dropna()
        if not vals.empty:
            date_min = vals.min().strftime("%Y-%m-%d")
            date_max = vals.max().strftime("%Y-%m-%d")

    etapa_counts = df["ETAPA"].value_counts().to_dict() if "ETAPA" in df.columns else {}
    status_counts = df["STATUS"].value_counts().to_dict() if "STATUS" in df.columns else {}

    boot["metadata"] = {
        "arquivo": workbook.name,
        "arquivo_caminho": workbook.name,
        "data_dir": "static/data",
        "aba_principal": loaded.metadata.aba_principal,
        "linhas": int(len(df)),
        "colunas": int(len(df.columns)),
        "date_min": date_min,
        "date_max": date_max,
        "modo": "Cloudflare Pages estático",
        "contagem_etapas": {str(k): int(v) for k, v in etapa_counts.items()},
        "contagem_status_excel": {str(k): int(v) for k, v in status_counts.items()},
    }

    payload = {
        "boot": boot,
        "rows": rows,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "rules": {"dash_asterisk": "- e * contam como feito/preenchido"},
    }
    DATA_JSON.parent.mkdir(parents=True, exist_ok=True)
    DATA_JSON.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    
    # V83: Cria um arquivo de versão com o timestamp atual para quebra de cache
    version_file = ROOT / "static" / "data" / "version.json"
    version_payload = {"v": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")}
    version_file.write_text(json.dumps(version_payload), encoding="utf-8")
    
    print(f"OK: {len(rows):,} linhas geradas em {DATA_JSON}".replace(",", "."))
    print(f"Versão gerada: {version_payload['v']}")
    print("Contagem oficial por etapa:")
    for etapa in ["CONCLUÍDO", "SEM LANÇAMENTO", "SEM PEDIDO", "SEM NF"]:
        print(f" - {etapa}: {int(etapa_counts.get(etapa, 0))}")
    print("Se esses números baterem com os filtros do Excel, faça Commit e Push no GitHub Desktop.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
