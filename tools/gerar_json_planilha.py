from __future__ import annotations

import json
import math
import os
import sys
import tempfile
from collections import Counter
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

DATA_DIR = ROOT / "data"
STATIC_DATA_DIR = ROOT / "static" / "data"
DATA_JSON = STATIC_DATA_DIR / "dashboard-data.json"
VERSION_JSON = STATIC_DATA_DIR / "version.json"
HISTORY_DIR = STATIC_DATA_DIR / "history"
HISTORY_INDEX = HISTORY_DIR / "index.json"
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
    "VALOR TOTAL",
    "FORNECEDOR",
    "SOLICITANTE",
    "PREFIXO",
    "EQUIPAMENTO",
    "Nº REQUISIÇÃO",
    "Nº PEDIDO DE COMPRA",
]

FULL_TABLE_COLUMNS = TABLE_COLUMNS
REQUIRED_OUTPUT_COLUMNS = {"ETAPA", "VALOR TOTAL", "FORNECEDOR", "DATA DE RECEBIMENTO"}
KNOWN_STAGES = set(STAGE_ORDER)


def clean_value(value: Any) -> Any:
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass
    if isinstance(value, pd.Timestamp):
        return value.strftime("%d/%m/%Y") if not pd.isna(value) else ""
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return "" if math.isnan(float(value)) else float(value)
    if isinstance(value, float) and math.isnan(value):
        return ""
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y")
    return value


def safe_text(value: Any) -> str:
    try:
        if value is None or pd.isna(value):
            return ""
    except Exception:
        pass
    text = str(value).strip()
    return "" if text.lower() in {"nan", "nat", "none", "null", "n/a"} else text


def iso_date(value: Any) -> str:
    try:
        if pd.isna(value):
            return ""
        return pd.Timestamp(value).strftime("%Y-%m-%d")
    except Exception:
        return ""


def br_date(value: Any, fallback: Any = "") -> str:
    try:
        if pd.isna(value):
            return safe_text(fallback)
        return pd.Timestamp(value).strftime("%d/%m/%Y")
    except Exception:
        return safe_text(fallback)


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


def atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise


def atomic_write_json(path: Path, payload: Any, *, compact: bool = True) -> None:
    content = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":") if compact else None,
        indent=None if compact else 2,
    )
    atomic_write_text(path, content)


def build_rows(df: pd.DataFrame) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for idx, source in df.reset_index(drop=True).iterrows():
        row: dict[str, Any] = {}
        for col in FULL_TABLE_COLUMNS:
            row[col] = clean_value(source[col]) if col in source else ""

        row["DATA DE RECEBIMENTO"] = br_date(
            source.get("DATA_RECEBIMENTO_DT"),
            source.get("DATA DE RECEBIMENTO", ""),
        )
        row["DATA LANÇAMENTO"] = br_date(
            source.get("DATA_LANCAMENTO_DT"),
            source.get("DATA LANÇAMENTO", ""),
        )
        row["DATA DO PEDIDO"] = br_date(
            source.get("DATA_PEDIDO_DT"),
            source.get("DATA DO PEDIDO", ""),
        )
        row["DATA LANÇAMENTO NFS"] = br_date(
            source.get("DATA_NF_DT"),
            source.get("DATA LANÇAMENTO NFS", ""),
        )
        row["MES_RECEBIMENTO"] = clean_value(source.get("MES_RECEBIMENTO", ""))
        row["_ETAPA"] = safe_text(source.get("ETAPA", ""))
        row["_ROW_ID"] = int_number(source.get("_ROW_ID", idx + 1)) or idx + 1
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


def validate_rows(rows: list[dict[str, Any]], existing_payload: dict[str, Any] | None) -> list[str]:
    if not rows:
        raise ValueError("A planilha não gerou nenhum registro. A publicação foi interrompida.")

    missing_columns = sorted(
        col for col in REQUIRED_OUTPUT_COLUMNS if not any(col in row for row in rows[:10])
    )
    if missing_columns:
        raise ValueError(f"Colunas obrigatórias ausentes: {', '.join(missing_columns)}")

    previous_count = int(existing_payload.get("boot", {}).get("metadata", {}).get("linhas", 0)) if existing_payload else 0
    if previous_count >= 100 and len(rows) < previous_count * 0.5:
        raise ValueError(
            f"A base caiu de {previous_count} para {len(rows)} registros. "
            "Queda acima de 50%; revise a planilha antes de publicar."
        )

    warnings: list[str] = []
    unknown = Counter(safe_text(row.get("ETAPA")) for row in rows)
    unknown = {key: count for key, count in unknown.items() if key and key not in KNOWN_STAGES}
    if unknown:
        warnings.append(
            "Etapas não reconhecidas: "
            + ", ".join(f"{stage} ({count})" for stage, count in sorted(unknown.items()))
        )

    negative = sum(1 for row in rows if money_number(row.get("_VALOR_TOTAL")) < 0)
    if negative:
        warnings.append(f"{negative} registro(s) com valor total negativo.")

    future_dates = 0
    today = datetime.now(timezone.utc).date()
    for row in rows:
        date_text = safe_text(row.get("_DATA_RECEBIMENTO_ISO"))
        if date_text:
            try:
                if datetime.fromisoformat(date_text).date() > today:
                    future_dates += 1
            except ValueError:
                pass
    if future_dates:
        warnings.append(f"{future_dates} registro(s) com data de recebimento futura.")

    return warnings


def calculate_quality(rows: list[dict[str, Any]]) -> dict[str, Any]:
    missing_supplier = sum(1 for row in rows if not safe_text(row.get("FORNECEDOR")))
    missing_date = sum(
        1
        for row in rows
        if not safe_text(row.get("DATA DE RECEBIMENTO"))
        and not safe_text(row.get("_DATA_RECEBIMENTO_ISO"))
    )
    unknown_stage = sum(1 for row in rows if safe_text(row.get("ETAPA")) not in KNOWN_STAGES)
    negative_value = sum(1 for row in rows if money_number(row.get("_VALOR_TOTAL")) < 0)

    request_counts = Counter(
        safe_text(row.get("Nº REQUISIÇÃO"))
        for row in rows
        if safe_text(row.get("Nº REQUISIÇÃO"))
    )
    duplicate_requests = sum(count for count in request_counts.values() if count > 1)

    primary_issues = missing_supplier + missing_date + unknown_stage + negative_value
    checked_fields = max(1, len(rows) * 4)
    score = max(0.0, 100.0 - primary_issues / checked_fields * 100.0)

    return {
        "score": round(score, 2),
        "issues": primary_issues,
        "missing_supplier": missing_supplier,
        "missing_date": missing_date,
        "unknown_stage": unknown_stage,
        "negative_value": negative_value,
        "duplicate_requests": duplicate_requests,
    }


def summary_snapshot(rows: list[dict[str, Any]], generated_at: str) -> dict[str, Any]:
    total = len(rows)
    pending = [row for row in rows if safe_text(row.get("ETAPA")) != "CONCLUÍDO"]
    completed = total - len(pending)
    pcm = [row for row in rows if safe_text(row.get("ETAPA")) == "SEM LANÇAMENTO"]
    critical = [row for row in pending if int_number(row.get("_DIAS_PARADO")) >= 30]
    pending_keys = [
        safe_text(row.get("Nº REQUISIÇÃO")) or f"ROW-{int_number(row.get("_ROW_ID"))}"
        for row in pending
    ]
    return {
        "generated_at": generated_at,
        "total": total,
        "pending": len(pending),
        "completed": completed,
        "completion_percent": round(completed / total * 100, 4) if total else 0,
        "pending_value": round(sum(money_number(row.get("_VALOR_TOTAL")) for row in pending), 2),
        "pcm_queue": len(pcm),
        "pcm_value": round(sum(money_number(row.get("_VALOR_TOTAL")) for row in pcm), 2),
        "critical": len(critical),
        "stage_counts": dict(Counter(safe_text(row.get("ETAPA")) for row in rows)),
        "pending_keys": pending_keys,
    }


def load_json(path: Path) -> dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


def update_history(snapshot: dict[str, Any]) -> dict[str, Any]:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    index_payload = load_json(HISTORY_INDEX) or {"snapshots": []}
    snapshots = index_payload.get("snapshots")
    if not isinstance(snapshots, list):
        snapshots = []

    previous_entry = snapshots[0] if snapshots else None
    previous_full: dict[str, Any] | None = None
    if previous_entry and previous_entry.get("file"):
        previous_full = load_json(HISTORY_DIR / str(previous_entry["file"]))
    if previous_full is None:
        previous_full = previous_entry

    stamp = datetime.fromisoformat(snapshot["generated_at"]).strftime("%Y%m%dT%H%M%SZ")
    snapshot_file = f"{stamp}.json"
    atomic_write_json(HISTORY_DIR / snapshot_file, snapshot, compact=False)

    entry = {key: value for key, value in snapshot.items() if key != "pending_keys"}
    entry["file"] = snapshot_file
    snapshots = [entry] + [
        item for item in snapshots if item.get("generated_at") != snapshot["generated_at"]
    ]
    snapshots = snapshots[:52]
    atomic_write_json(HISTORY_INDEX, {"snapshots": snapshots}, compact=False)

    current_keys = set(snapshot.get("pending_keys") or [])
    previous_keys = set((previous_full or {}).get("pending_keys") or [])
    movements = {
        "entered": len(current_keys - previous_keys) if previous_full else 0,
        "resolved": len(previous_keys - current_keys) if previous_full else 0,
        "net": len(current_keys) - len(previous_keys) if previous_full else 0,
        "pending_value_change": round(
            float(snapshot.get("pending_value", 0)) - float((previous_full or {}).get("pending_value", 0)),
            2,
        ) if previous_full else 0,
        "completion_change": round(
            float(snapshot.get("completion_percent", 0)) - float((previous_full or {}).get("completion_percent", 0)),
            4,
        ) if previous_full else 0,
    }

    previous_public = (
        {key: value for key, value in previous_full.items() if key != "pending_keys"}
        if previous_full
        else None
    )
    current_public = {key: value for key, value in snapshot.items() if key != "pending_keys"}
    return {
        "current": current_public,
        "previous": previous_public,
        "recent": snapshots[:12],
        "movements": movements,
        "count": len(snapshots),
    }

def build_boot(existing_payload: dict[str, Any] | None) -> dict[str, Any]:
    existing_boot = existing_payload.get("boot", {}) if existing_payload else {}
    boot = dict(existing_boot) if isinstance(existing_boot, dict) else {}
    boot.update(
        {
            "app_name": "Dashboard PCM 2026",
            "version": "100.0.0",
            "can_upload": False,
            "role": "viewer",
            "main_filters": MAIN_FILTERS,
            "advanced_filters": ["date", "value", "age"],
            "table_columns": COMPACT_TABLE_COLUMNS,
            "full_table_columns": FULL_TABLE_COLUMNS,
            "stage_order": STAGE_ORDER,
            "stage_colors": ETAPA_COLORS,
            "auto_reload_seconds": 0,
        }
    )
    return boot


def main() -> int:
    DATA_DIR.mkdir(exist_ok=True)
    STATIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

    existing_payload = load_json(DATA_JSON)
    candidates = list(DATA_DIR.glob("*.xlsx")) + list(DATA_DIR.glob("*.xlsm")) + list(DATA_DIR.glob("*.xls"))
    preferred = DEFAULT_EXCEL if DEFAULT_EXCEL.exists() else None
    if not preferred and not candidates:
        print("ERRO: coloque a planilha em data/CONTROLE_DE_REQUISICOES_2026.xlsx")
        return 1

    workbook = find_workbook(ROOT, preferred=str(preferred) if preferred else None)
    print(f"Lendo planilha: {workbook.name}")
    loaded = load_workbook_data(workbook)
    df = loaded.df.copy()
    rows = build_rows(df)
    warnings = validate_rows(rows, existing_payload)

    generated_at = datetime.now(timezone.utc).isoformat()
    snapshot = summary_snapshot(rows, generated_at)
    history = update_history(snapshot)
    quality = calculate_quality(rows)
    boot = build_boot(existing_payload)

    receive_dates = [
        row["_DATA_RECEBIMENTO_ISO"] for row in rows if row.get("_DATA_RECEBIMENTO_ISO")
    ]
    stage_counts = Counter(safe_text(row.get("ETAPA")) for row in rows)
    status_counts = Counter(safe_text(row.get("STATUS")) for row in rows if safe_text(row.get("STATUS")))

    boot["metadata"] = {
        "arquivo": workbook.name,
        "aba_principal": loaded.metadata.aba_principal,
        "linhas": len(rows),
        "colunas": len(df.columns),
        "date_min": min(receive_dates) if receive_dates else "",
        "date_max": max(receive_dates) if receive_dates else "",
        "modo": "Cloudflare Pages estático",
        "contagem_etapas": dict(stage_counts),
        "contagem_status_excel": dict(status_counts),
        "quality_score": quality["score"],
    }

    payload = {
        "boot": boot,
        "rows": rows,
        "generated_at": generated_at,
        "quality": quality,
        "history": history,
        "rules": {
            "version": "100.0.0",
            "aging": {"attention": 8, "high": 16, "critical": 30, "severe": 60},
            "dash_asterisk": "- e * contam como feito/preenchido",
        },
    }

    # Valida a serialização completa antes de substituir a última base válida.
    serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    json.loads(serialized)
    atomic_write_text(DATA_JSON, serialized)

    version_payload = {
        "v": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        "generated_at": generated_at,
        "rows": len(rows),
    }
    atomic_write_json(VERSION_JSON, version_payload, compact=False)

    print(f"OK: {len(rows):,} linhas geradas em {DATA_JSON}".replace(",", "."))
    print(f"Versão: {version_payload['v']}")
    print(f"Qualidade: {quality['score']:.2f}%")
    print("Contagem oficial por etapa:")
    for etapa in STAGE_ORDER:
        print(f" - {etapa}: {stage_counts.get(etapa, 0)}")
    for warning in warnings:
        print(f"AVISO: {warning}")
    print("Arquivos escritos de forma atômica. A última base válida foi preservada até o fim.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
