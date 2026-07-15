from __future__ import annotations

import sys
import unittest
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from services.payload import (  # noqa: E402
    EXECUTIVE_PUBLIC_FIELDS,
    EXECUTIVE_INTERNAL_FIELDS,
    OPERATIONAL_PUBLIC_FIELDS,
    PayloadContractError,
    assert_no_forbidden_fields,
    build_executive_records,
    build_operational_records,
    validate_payload,
)


class PayloadPrivacyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.frame = pd.DataFrame(
            [
                {
                    "_ROW_ID": 1,
                    "ETAPA": "SEM LANÇAMENTO",
                    "FORNECEDOR": "CAMPO ERE",
                    "SOLICITANTE": "JOSE EDUARDO",
                    "DONO DA AÇÃO": "PCM",
                    "MES_RECEBIMENTO": "JULHO",
                    "VALOR TOTAL": 24500.0,
                    "VALOR SERVIÇO": 15000.0,
                    "VALOR PEÇAS": 9500.0,
                    "DIAS PARADO": 12,
                    "SLA STATUS": "CRÍTICO",
                    "FAIXA ATRASO": "8–15 dias",
                    "PREFIXO": "PX-001",
                    "EQUIPAMENTO": "TRATOR",
                    "Nº REQUISIÇÃO": "12345",
                    "Nº ORÇAMENTO FINAL": "98765",
                    "OBS ADICIONAIS": "=HIPERLINK(\"http://malicioso\")",
                    "_SEARCH": "CAMPO ERE 12345",
                    "DATA_RECEBIMENTO_DT": pd.Timestamp("2026-07-01"),
                    "DATA_LANCAMENTO_DT": pd.NaT,
                    "DATA_PEDIDO_DT": pd.NaT,
                    "DATA_NF_DT": pd.NaT,
                }
            ]
        )
        self.version = "20260714183000"

    def test_forbidden_fields_are_removed(self) -> None:
        executive = build_executive_records(self.frame)
        operational = build_operational_records(self.frame)
        serialized = str({"executive": executive, "operational": operational})
        self.assertNotIn("OBS ADICIONAIS", serialized)
        self.assertNotIn("_SEARCH", serialized)

    def test_unknown_fields_are_not_published(self) -> None:
        operational = build_operational_records(self.frame)
        self.assertNotIn("COLUNA SECRETA", operational[0])
        self.assertNotIn("OBS ADICIONAIS", operational[0])

    def test_runtime_identity_is_created(self) -> None:
        operational = build_operational_records(self.frame)
        row = operational[0]
        self.assertTrue(row["_RECORD_KEY"])
        self.assertEqual(len(row["_RECORD_HASH"]), 64)

    def test_executive_payload_has_no_row_identity(self) -> None:
        executive = build_executive_records(self.frame)
        row = executive[0]
        self.assertNotIn("_ROW_ID", row)
        self.assertNotIn("_RECORD_KEY", row)
        self.assertNotIn("_RECORD_HASH", row)

    def test_contract_accepts_valid_payloads(self) -> None:
        executive = {
            "data_version": self.version,
            "rows": build_executive_records(self.frame),
        }
        operational = {
            "data_version": self.version,
            "rows": build_operational_records(self.frame),
        }
        validate_payload(
            executive,
            public_fields=EXECUTIVE_PUBLIC_FIELDS,
            expected_version=self.version,
            internal_fields=EXECUTIVE_INTERNAL_FIELDS,
        )
        validate_payload(
            operational,
            public_fields=OPERATIONAL_PUBLIC_FIELDS,
            expected_version=self.version,
        )

    def test_contract_rejects_forbidden_nested_field(self) -> None:
        with self.assertRaises(PayloadContractError):
            assert_no_forbidden_fields(
                {"rows": [{"OBS ADICIONAIS": "não publicar"}]}
            )


if __name__ == "__main__":
    unittest.main()
