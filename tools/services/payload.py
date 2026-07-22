from __future__ import annotations

import json
import math
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

import numpy as np
import pandas as pd


EXECUTIVE_PUBLIC_FIELDS: tuple[str, ...] = (
    "ETAPA",
    "FORNECEDOR",
    "SOLICITANTE",
    "DONO DA AÇÃO",
    "MES_RECEBIMENTO",
    "VALOR TOTAL",
    "VALOR SERVIÇO",
    "VALOR PEÇAS",
    "DIAS PARADO",
    "SLA STATUS",
    "FAIXA ATRASO",
    "PREFIXO",
    "EQUIPAMENTO",
    "Nº ORÇAMENTO FINAL",
    "Nº ORDEM SERVIÇO",
)

OPERATIONAL_PUBLIC_FIELDS: tuple[str, ...] = (
    "ETAPA",
    "DIAS PARADO",
    "SLA STATUS",
    "DONO DA AÇÃO",
    "FAIXA ATRASO",
    "DATA DE RECEBIMENTO",
    "DATA LANÇAMENTO",
    "DATA DO PEDIDO",
    "DATA LANÇAMENTO NFS",
    "Nº ORÇAMENTO FINAL",
    "Nº ORDEM SERVIÇO",
    "Nº NFS/DANFE",
    "STATUS",
    "FORNECEDOR",
    "SOLICITANTE",
    "PREFIXO",
    "EQUIPAMENTO",
    "VALOR TOTAL",
    "VALOR SERVIÇO",
    "VALOR PEÇAS",
    "Nº REQUISIÇÃO",
    "Nº PEDIDO DE COMPRA",
    "MES_RECEBIMENTO",
)

EXECUTIVE_INTERNAL_FIELDS: tuple[str, ...] = (
    "_ETAPA",
    "_VALOR_TOTAL",
    "_VALOR_SERVICO",
    "_VALOR_PECAS",
    "_DIAS_PARADO",
    "_AGING_BASE_ISO",
    "_DATA_RECEBIMENTO_ISO",
    "_DATA_LANCAMENTO_ISO",
    "_DATA_PEDIDO_ISO",
    "_DATA_NF_ISO",
)

INTERNAL_RUNTIME_FIELDS: tuple[str, ...] = (
    "_ROW_ID",
    "_ETAPA",
    "_VALOR_TOTAL",
    "_VALOR_SERVICO",
    "_VALOR_PECAS",
    "_DIAS_PARADO",
    "_AGING_BASE_ISO",
    "_DATA_RECEBIMENTO_ISO",
    "_DATA_LANCAMENTO_ISO",
    "_DATA_PEDIDO_ISO",
    "_DATA_NF_ISO",
    "_RECORD_KEY",
    "_RECORD_HASH",
)

FORBIDDEN_PUBLIC_FIELDS: frozenset[str] = frozenset(
    {
        "OBS ADICIONAIS",
        "_SEARCH",
        "ARQUIVO_CAMINHO",
        "CAMINHO",
        "PATH",
        "USUARIO",
        "USERNAME",
    }
)


class PayloadContractError(RuntimeError):
    """Raised when generated public data violates its publication contract."""


@dataclass(frozen=True)
class PayloadMetrics:
    records: int
    bytes_utf8: int
    fields: tuple[str, ...]


def clean_json_value(value: Any) -> Any:
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except (TypeError, ValueError):
        pass

    if isinstance(value, pd.Timestamp):
        return "" if pd.isna(value) else value.strftime("%d/%m/%Y")
    if isinstance(value, (datetime, date)):
        return value.strftime("%d/%m/%Y")
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        number = float(value)
        return "" if math.isnan(number) else number
    if isinstance(value, float):
        return "" if math.isnan(value) else value
    if isinstance(value, (bool, int, str)):
        return value
    return str(value)


def iso_date(value: Any) -> str:
    try:
        if value is None or pd.isna(value):
            return ""
        return pd.Timestamp(value).strftime("%Y-%m-%d")
    except (TypeError, ValueError):
        return ""


def number_value(value: Any) -> float:
    try:
        if value is None or pd.isna(value):
            return 0.0
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def integer_value(value: Any) -> int:
    try:
        if value is None or pd.isna(value):
            return 0
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def display_date(value: Any, fallback: Any = "") -> str:
    try:
        if value is None or pd.isna(value):
            return str(clean_json_value(fallback))
        return pd.Timestamp(value).strftime("%d/%m/%Y")
    except (TypeError, ValueError):
        return str(clean_json_value(fallback))


def build_internal_fields(source: Mapping[str, Any], index: int) -> dict[str, Any]:
    stage = str(source.get("ETAPA", "") or "").strip()
    stage_upper = stage.upper()

    received_iso = iso_date(source.get("DATA_RECEBIMENTO_DT"))
    launched_iso = iso_date(source.get("DATA_LANCAMENTO_DT"))
    ordered_iso = iso_date(source.get("DATA_PEDIDO_DT"))
    nf_iso = iso_date(source.get("DATA_NF_DT"))

    if stage_upper == "SEM NF":
        aging_iso = ordered_iso or launched_iso or received_iso
    elif stage_upper == "SEM PEDIDO":
        aging_iso = launched_iso or received_iso
    elif stage_upper in {"CONCLUÍDO", "CONCLUIDO"}:
        aging_iso = ""
    else:
        aging_iso = received_iso

    return {
        "_ROW_ID": integer_value(source.get("_ROW_ID", index + 1)),
        "_ETAPA": stage,
        "_VALOR_TOTAL": number_value(source.get("VALOR TOTAL", 0)),
        "_VALOR_SERVICO": number_value(source.get("VALOR SERVIÇO", 0)),
        "_VALOR_PECAS": number_value(source.get("VALOR PEÇAS", 0)),
        "_DIAS_PARADO": integer_value(source.get("DIAS PARADO", 0)),
        "_AGING_BASE_ISO": aging_iso,
        "_DATA_RECEBIMENTO_ISO": received_iso,
        "_DATA_LANCAMENTO_ISO": launched_iso,
        "_DATA_PEDIDO_ISO": ordered_iso,
        "_DATA_NF_ISO": nf_iso,
    }


def build_record(
    source: Mapping[str, Any],
    index: int,
    public_fields: Sequence[str],
) -> dict[str, Any]:
    record: dict[str, Any] = {}

    for field in public_fields:
        record[field] = clean_json_value(source.get(field, ""))

    if "DATA DE RECEBIMENTO" in public_fields:
        record["DATA DE RECEBIMENTO"] = display_date(
            source.get("DATA_RECEBIMENTO_DT"),
            source.get("DATA DE RECEBIMENTO", ""),
        )
    if "DATA LANÇAMENTO" in public_fields:
        record["DATA LANÇAMENTO"] = display_date(
            source.get("DATA_LANCAMENTO_DT"),
            source.get("DATA LANÇAMENTO", ""),
        )
    if "DATA DO PEDIDO" in public_fields:
        record["DATA DO PEDIDO"] = display_date(
            source.get("DATA_PEDIDO_DT"),
            source.get("DATA DO PEDIDO", ""),
        )

    if "MES_RECEBIMENTO" in public_fields:
        record["MES_RECEBIMENTO"] = clean_json_value(
            source.get("MES_RECEBIMENTO", record.get("MES_RECEBIMENTO", ""))
        )
    record.update(build_internal_fields(source, index))
    from .records import canonical_record_key, record_hash
    record["_RECORD_KEY"] = canonical_record_key(record)
    record["_RECORD_HASH"] = record_hash(record)
    return record


def build_records(
    frame: pd.DataFrame,
    public_fields: Sequence[str],
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for index, source in frame.reset_index(drop=True).iterrows():
        records.append(build_record(source, index, public_fields))
    return records


def build_executive_records(frame: pd.DataFrame) -> list[dict[str, Any]]:
    records = build_records(frame, EXECUTIVE_PUBLIC_FIELDS)
    identity_fields = {"_ROW_ID", "_RECORD_KEY", "_RECORD_HASH"}
    return [
        {key: value for key, value in record.items() if key not in identity_fields}
        for record in records
    ]


def build_operational_records(frame: pd.DataFrame) -> list[dict[str, Any]]:
    return build_records(frame, OPERATIONAL_PUBLIC_FIELDS)


def walk_keys(value: Any) -> Iterable[str]:
    if isinstance(value, Mapping):
        for key, child in value.items():
            yield str(key)
            yield from walk_keys(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_keys(child)


def assert_no_forbidden_fields(payload: Any) -> None:
    forbidden = sorted(
        {
            key
            for key in walk_keys(payload)
            if key.upper() in FORBIDDEN_PUBLIC_FIELDS
            or key.upper().endswith("_CAMINHO")
        }
    )
    if forbidden:
        raise PayloadContractError(
            "Campos proibidos encontrados no payload público: "
            + ", ".join(forbidden)
        )


def assert_record_contract(
    records: Sequence[Mapping[str, Any]],
    public_fields: Sequence[str],
    internal_fields: Sequence[str] = INTERNAL_RUNTIME_FIELDS,
) -> None:
    allowed = set(public_fields) | set(internal_fields)
    invalid: set[str] = set()
    for record in records:
        invalid.update(str(key) for key in record if str(key) not in allowed)
    if invalid:
        raise PayloadContractError(
            "Campos fora da whitelist: " + ", ".join(sorted(invalid))
        )


def measure_payload(payload: Any) -> PayloadMetrics:
    encoded = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    records = 0
    fields: set[str] = set()
    if isinstance(payload, Mapping):
        rows = payload.get("rows", [])
        if isinstance(rows, list):
            records = len(rows)
            for row in rows[:100]:
                if isinstance(row, Mapping):
                    fields.update(str(key) for key in row)
    return PayloadMetrics(
        records=records,
        bytes_utf8=len(encoded),
        fields=tuple(sorted(fields)),
    )


def validate_payload(
    payload: Mapping[str, Any],
    *,
    public_fields: Sequence[str],
    expected_version: str,
    require_rows: bool = True,
    internal_fields: Sequence[str] = INTERNAL_RUNTIME_FIELDS,
) -> PayloadMetrics:
    assert_no_forbidden_fields(payload)

    version = str(payload.get("data_version", ""))
    if version != str(expected_version):
        raise PayloadContractError(
            f"Versão divergente: esperado {expected_version}, recebido {version or 'vazio'}."
        )

    rows = payload.get("rows")
    if not isinstance(rows, list):
        raise PayloadContractError("O payload não contém uma lista de registros.")
    if require_rows and not rows:
        raise PayloadContractError("O payload não pode ser publicado sem registros.")

    assert_record_contract(rows, public_fields, internal_fields)
    return measure_payload(payload)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
