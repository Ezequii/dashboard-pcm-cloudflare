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
    {"key": "ETAPA", "label": "Etapas", "type": "search-select"},
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

PUBLIC_EXCLUDED_COLUMNS = {"OBS ADICIONAIS"}
FULL_TABLE_COLUMNS = [column for column in TABLE_COLUMNS if column not in PUBLIC_EXCLUDED_COLUMNS]
QUALITY_REPORT = ROOT / "data" / "quality-report.json"


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
        rows.append(row)
    return rows


def build_quality_report(df: pd.DataFrame) -> dict[str, Any]:
    total = int(len(df))
    required = ["ETAPA", "STATUS", "FORNECEDOR", "SOLICITANTE", "VALOR TOTAL"]
    missing_columns = [column for column in required if column not in df.columns]

    def blank_count(column: str) -> int:
        if column not in df.columns:
            return total
        values = df[column].fillna("").astype(str).str.strip()
        return int(values.eq("").sum())

    stage_order = set(STAGE_ORDER)
    stage_values = df["ETAPA"].fillna("").astype(str).str.strip() if "ETAPA" in df.columns else pd.Series([], dtype=str)
    unknown_stage = int((~stage_values.isin(stage_order)).sum()) if not stage_values.empty else total

    negative_values = 0
    if "VALOR TOTAL" in df.columns:
        negative_values = int(pd.to_numeric(df["VALOR TOTAL"], errors="coerce").fillna(0).lt(0).sum())

    value_mismatch = 0
    if {"VALOR TOTAL", "VALOR SERVIÇO", "VALOR PEÇAS"}.issubset(df.columns):
        total_values = pd.to_numeric(df["VALOR TOTAL"], errors="coerce").fillna(0)
        components = (
            pd.to_numeric(df["VALOR SERVIÇO"], errors="coerce").fillna(0)
            + pd.to_numeric(df["VALOR PEÇAS"], errors="coerce").fillna(0)
        )
        value_mismatch = int((total_values.sub(components).abs() > 0.05).sum())

    future_dates = 0
    if "DATA_RECEBIMENTO_DT" in df.columns:
        dates = pd.to_datetime(df["DATA_RECEBIMENTO_DT"], errors="coerce")
        future_dates = int((dates.dt.date > datetime.now().date()).fillna(False).sum())

    issues = {
        "sem_fornecedor": blank_count("FORNECEDOR"),
        "sem_solicitante": blank_count("SOLICITANTE"),
        "sem_data_recebimento": blank_count("DATA DE RECEBIMENTO"),
        "etapa_nao_reconhecida": unknown_stage,
        "valores_negativos": negative_values,
        "divergencia_valor_total": value_mismatch,
        "datas_futuras": future_dates,
    }
    weighted = (
        issues["sem_fornecedor"]
        + issues["sem_solicitante"]
        + issues["sem_data_recebimento"]
        + issues["etapa_nao_reconhecida"] * 4
        + issues["valores_negativos"] * 3
        + issues["divergencia_valor_total"]
        + issues["datas_futuras"] * 2
    )
    score = 100.0 if not total else max(0.0, 100.0 - (weighted / total * 100.0))
    critical = bool(total == 0 or missing_columns or unknown_stage > 0)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_rows": total,
        "score": round(score, 1),
        "critical": critical,
        "missing_columns": missing_columns,
        "issues": issues,
    }


def atomic_write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.replace(temp, path)


def atomic_publish(data_payload: Any, version_payload: Any) -> None:
    """Prepara dados e versão antes de substituir a publicação atual."""
    DATA_JSON.parent.mkdir(parents=True, exist_ok=True)
    version_file = ROOT / "static" / "data" / "version.json"
    data_temp = DATA_JSON.with_suffix(DATA_JSON.suffix + ".tmp")
    version_temp = version_file.with_suffix(version_file.suffix + ".tmp")
    data_temp.write_text(json.dumps(data_payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    version_temp.write_text(json.dumps(version_payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.replace(data_temp, DATA_JSON)
    os.replace(version_temp, version_file)


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
    quality = build_quality_report(df)
    QUALITY_REPORT.parent.mkdir(parents=True, exist_ok=True)
    QUALITY_REPORT.write_text(json.dumps(quality, ensure_ascii=False, indent=2), encoding="utf-8")
    if quality["critical"]:
        print("ERRO CRÍTICO: a base não passou na validação. O JSON anterior foi preservado.")
        print(f"Relatório: {QUALITY_REPORT}")
        print(json.dumps(quality, ensure_ascii=False, indent=2))
        return 2
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
        "arquivo": "Base oficial PCM 2026",
        "arquivo_caminho": "",
        "data_dir": "static/data",
        "aba_principal": loaded.metadata.aba_principal,
        "linhas": int(len(df)),
        "colunas": int(len(df.columns)),
        "date_min": date_min,
        "date_max": date_max,
        "modo": "Cloudflare Pages estático",
        "contagem_etapas": {str(k): int(v) for k, v in etapa_counts.items()},
        "contagem_status_excel": {str(k): int(v) for k, v in status_counts.items()},
        "qualidade": quality,
    }

    generated_at = datetime.now(timezone.utc).isoformat()
    payload = {
        "boot": boot,
        "rows": rows,
        "generated_at": generated_at,
        "quality": quality,
        "rules": {"dash_asterisk": "- e * contam como feito/preenchido"},
    }
    # V97: prepara dashboard-data.json e version.json antes da troca final.
    version_payload = {
        "v": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        "generated_at": generated_at,
        "rows": len(rows),
        "quality_score": quality["score"],
        "stages": {str(k): int(v) for k, v in etapa_counts.items()},
    }
    atomic_publish(payload, version_payload)
    
    print(f"OK: {len(rows):,} linhas geradas em {DATA_JSON}".replace(",", "."))
    print(f"Versão gerada: {version_payload['v']}")
    print("Contagem oficial por etapa:")
    for etapa in ["CONCLUÍDO", "SEM LANÇAMENTO", "SEM PEDIDO", "SEM NF"]:
        print(f" - {etapa}: {int(etapa_counts.get(etapa, 0))}")
    print("Se esses números baterem com os filtros do Excel, faça Commit e Push no GitHub Desktop.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
