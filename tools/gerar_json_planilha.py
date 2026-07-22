from __future__ import annotations

import json
import warnings
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd


warnings.filterwarnings(
    "ignore",
    message=r"Data Validation extension is not supported and will be removed",
    category=UserWarning,
    module=r"openpyxl\..*",
)

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
sys.path.insert(0, str(TOOLS))

from services.atomic_publish import publish_atomically  # noqa: E402
from services.constants import ETAPA_COLORS, STAGE_ORDER  # noqa: E402
from services.loader import find_workbook, load_workbook_data  # noqa: E402
from services.local_state import local_state_root  # noqa: E402
from services.payload import (  # noqa: E402
    EXECUTIVE_PUBLIC_FIELDS,
    EXECUTIVE_INTERNAL_FIELDS,
    OPERATIONAL_PUBLIC_FIELDS,
    build_executive_records,
    build_operational_records,
    validate_payload,
)
from services.security import parse_security_policy  # noqa: E402

DATA_DIR = ROOT / "data"
STATIC_DATA_DIR = ROOT / "static/data"
DEFAULT_EXCEL = DATA_DIR / "CONTROLE_DE_REQUISICOES_2026.xlsx"
SECURITY_CONFIG_PATH = ROOT / "static/config/security-config.json"
LOCAL_STATE = local_state_root(ROOT)

EXECUTIVE_RELATIVE = "static/data/executive-data.json"
OPERATIONAL_RELATIVE = "static/data/operational-data.json"
VERSION_RELATIVE = "static/data/version.json"
PUBLICATION_RELATIVE = "static/data/publication-status.json"

MAIN_FILTERS = [
    {"key": "SOLICITANTE", "label": "Solicitante", "type": "search-select"},
    {"key": "FORNECEDOR", "label": "Fornecedor", "type": "search-select"},
    {"key": "ETAPA", "label": "Etapas", "type": "search-select"},
    {"key": "MES_RECEBIMENTO", "label": "Mês", "type": "search-select"},
]

OPERATIONAL_TABLE_COLUMNS = [
    "ETAPA",
    "DATA DE RECEBIMENTO",
    "DATA LANÇAMENTO",
    "Nº PEDIDO DE COMPRA",
    "DATA DO PEDIDO",
    "Nº NFS/DANFE",
    "DATA LANÇAMENTO NFS",
    "DIAS PARADO",
    "SLA STATUS",
    "DONO DA AÇÃO",
    "Nº REQUISIÇÃO",
    "Nº ORÇAMENTO FINAL",
    "VALOR TOTAL",
    "FORNECEDOR",
    "SOLICITANTE",
    "PREFIXO",
    "EQUIPAMENTO",
    "Nº ORDEM SERVIÇO",
    "FAIXA ATRASO",
]


def load_security_config() -> dict[str, Any]:
    if not SECURITY_CONFIG_PATH.exists():
        raise RuntimeError(
            "A configuração de segurança não foi encontrada em "
            "static/config/security-config.json."
        )
    config = json.loads(SECURITY_CONFIG_PATH.read_text(encoding="utf-8"))
    parse_security_policy(config)
    return config


def date_range(frame: pd.DataFrame) -> tuple[str, str]:
    if "DATA_RECEBIMENTO_DT" not in frame.columns:
        return "", ""
    values = frame["DATA_RECEBIMENTO_DT"].dropna()
    if values.empty:
        return "", ""
    return (
        values.min().strftime("%Y-%m-%d"),
        values.max().strftime("%Y-%m-%d"),
    )


def stage_counts(frame: pd.DataFrame) -> dict[str, int]:
    if "ETAPA" not in frame.columns:
        return {}
    return {
        str(key): int(value)
        for key, value in frame["ETAPA"].value_counts().to_dict().items()
    }


def build_boot(
    *,
    frame: pd.DataFrame,
    generated_at: str,
    classification: str,
) -> dict[str, Any]:
    date_min, date_max = date_range(frame)
    counts = stage_counts(frame)

    return {
        "app_name": "Dashboard PCM 2026",
        "can_upload": False,
        "role": "viewer",
        "main_filters": MAIN_FILTERS,
        "advanced_filters": [],
        "table_columns": OPERATIONAL_TABLE_COLUMNS,
        "full_table_columns": list(OPERATIONAL_PUBLIC_FIELDS),
        "stage_order": STAGE_ORDER,
        "stage_colors": ETAPA_COLORS,
        "auto_reload_seconds": 0,
        "metadata": {
            "linhas": int(len(frame)),
            "date_min": date_min,
            "date_max": date_max,
            "classification": classification,
            "contagem_etapas": counts,
            "generated_at": generated_at,
        },
    }


def remove_legacy_payload() -> None:
    legacy = STATIC_DATA_DIR / "dashboard-data.json"
    legacy.unlink(missing_ok=True)


def main() -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STATIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not DEFAULT_EXCEL.exists():
        candidates = (
            list(DATA_DIR.glob("*.xlsx"))
            + list(DATA_DIR.glob("*.xlsm"))
            + list(DATA_DIR.glob("*.xls"))
        )
        if not candidates:
            print(
                "ERRO: coloque a planilha em "
                "data/CONTROLE_DE_REQUISICOES_2026.xlsx"
            )
            return 1

    security = load_security_config()
    workbook = find_workbook(
        ROOT,
        preferred=str(DEFAULT_EXCEL) if DEFAULT_EXCEL.exists() else None,
    )

    print(f"Lendo planilha: {workbook.name}")
    loaded = load_workbook_data(workbook)
    frame = loaded.df.copy()

    if frame.empty:
        print("ERRO: a planilha não contém registros válidos.")
        return 1

    counts = stage_counts(frame)
    if sum(counts.values()) != len(frame):
        print("ERRO: a soma das etapas não corresponde ao total de registros.")
        return 1

    generated = datetime.now(timezone.utc)
    generated_at = generated.isoformat()
    data_version = generated.strftime("%Y%m%d%H%M%S")
    classification = str(security.get("dataClassification", "interno"))

    executive_rows = build_executive_records(frame)
    operational_rows = build_operational_records(frame)
    boot = build_boot(
        frame=frame,
        generated_at=generated_at,
        classification=classification,
    )

    executive_payload = {
        "boot": boot,
        "rows": executive_rows,
        "generated_at": generated_at,
        "data_version": data_version,
        "classification": classification,
        "contract": "executive-index-v994a5",
    }
    operational_payload = {
        "columns": OPERATIONAL_TABLE_COLUMNS,
        "rows": operational_rows,
        "generated_at": generated_at,
        "data_version": data_version,
        "classification": classification,
        "contract": "operational-v994a",
    }
    publication_status = {
        "data_version": data_version,
        "published_at": generated_at,
        "records": len(frame),
        "status": "valid",
        "last_valid_version": data_version,
        "classification": classification,
        "contracts": {
            "executive": "executive-index-v994a5",
            "operational": "operational-v994a",
        },
    }
    version_payload = {
        "v": data_version,
        "published_at": generated_at,
    }

    executive_metrics = validate_payload(
        executive_payload,
        public_fields=EXECUTIVE_PUBLIC_FIELDS,
        expected_version=data_version,
        internal_fields=EXECUTIVE_INTERNAL_FIELDS,
    )
    operational_metrics = validate_payload(
        operational_payload,
        public_fields=OPERATIONAL_PUBLIC_FIELDS,
        expected_version=data_version,
    )

    def validate_executive(path: Path) -> None:
        payload = json.loads(path.read_text(encoding="utf-8"))
        validate_payload(
            payload,
            public_fields=EXECUTIVE_PUBLIC_FIELDS,
            expected_version=data_version,
            internal_fields=EXECUTIVE_INTERNAL_FIELDS,
        )

    def validate_operational(path: Path) -> None:
        payload = json.loads(path.read_text(encoding="utf-8"))
        validate_payload(
            payload,
            public_fields=OPERATIONAL_PUBLIC_FIELDS,
            expected_version=data_version,
        )

    payloads = {
        EXECUTIVE_RELATIVE: executive_payload,
        OPERATIONAL_RELATIVE: operational_payload,
        PUBLICATION_RELATIVE: publication_status,
        VERSION_RELATIVE: version_payload,
    }

    result = publish_atomically(
        root=ROOT,
        payloads=payloads,
        data_version=data_version,
        backup_dir=LOCAL_STATE / "last-valid",
        report_dir=LOCAL_STATE / "reports",
        validators={
            EXECUTIVE_RELATIVE: validate_executive,
            OPERATIONAL_RELATIVE: validate_operational,
        },
        version_relative_path=VERSION_RELATIVE,
    )

    remove_legacy_payload()

    print(f"OK: {len(frame):,} registros publicados".replace(",", "."))
    print(f"Versão gerada: {data_version}")
    print(
        "Payload executivo: "
        f"{executive_metrics.bytes_utf8 / 1024:.1f} KB"
    )
    print(
        "Payload operacional: "
        f"{operational_metrics.bytes_utf8 / 1024:.1f} KB"
    )
    print(
        "Backup anterior: "
        + ("confirmado" if result.backup_created else "primeira publicação")
    )
    print("Campos proibidos: nenhum")
    print(f"Estado local protegido: {LOCAL_STATE}")
    print("Contagem oficial por etapa:")
    for stage in ["CONCLUÍDO", "SEM LANÇAMENTO", "SEM PEDIDO", "SEM NF"]:
        print(f" - {stage}: {counts.get(stage, 0)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
