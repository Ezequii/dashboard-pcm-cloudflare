from __future__ import annotations

import hashlib
import re
import unicodedata
from typing import Any, Mapping


def normalize_identifier(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"[^A-Z0-9]+", "", text.upper())


def canonical_record_key(row: Mapping[str, Any]) -> str:
    parts = [
        normalize_identifier(row.get("Nº REQUISIÇÃO")),
        normalize_identifier(row.get("Nº ORÇAMENTO FINAL")),
        normalize_identifier(row.get("FORNECEDOR")),
        normalize_identifier(row.get("EQUIPAMENTO")),
    ]
    meaningful = [part for part in parts if part]
    if not meaningful:
        meaningful = [normalize_identifier(row.get("_ROW_ID"))]
    return "|".join(meaningful)


def record_hash(row: Mapping[str, Any]) -> str:
    relevant = [
        canonical_record_key(row),
        normalize_identifier(row.get("ETAPA")),
        normalize_identifier(row.get("Nº PEDIDO DE COMPRA")),
        normalize_identifier(row.get("Nº NFS/DANFE")),
        str(row.get("_VALOR_TOTAL", "")),
        str(row.get("_AGING_BASE_ISO", "")),
    ]
    return hashlib.sha256("|".join(relevant).encode("utf-8")).hexdigest()
