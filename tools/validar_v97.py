from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_VERSION = "97"


def fail(message: str) -> None:
    print(f"ERRO: {message}")
    raise SystemExit(1)


def read(path: Path) -> str:
    if not path.exists():
        fail(f"arquivo ausente: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def validate_assets() -> None:
    index = read(ROOT / "index.html")
    if "v97-reliability-navigation" not in index:
        fail("a classe visual da V97 não está no index.html")

    referenced = re.findall(r'(?:src|href)="([^"]+\?v=(\d+))"', index)
    if not referenced:
        fail("nenhum asset versionado foi encontrado no index.html")

    wrong_versions = [url for url, version in referenced if version != EXPECTED_VERSION]
    if wrong_versions:
        fail(f"assets com versão diferente de {EXPECTED_VERSION}: {wrong_versions}")

    required_ids = {
        "dataFreshness",
        "dataStatusBanner",
        "activeFilters",
        "activeFilterCount",
        "btnExportCsv",
        "btnRetryData",
    }
    missing_ids = [element_id for element_id in required_ids if f'id="{element_id}"' not in index]
    if missing_ids:
        fail(f"elementos V97 ausentes no HTML: {missing_ids}")

    old_404 = read(ROOT / "404.html")
    if "Visual v89" in old_404 or "dashboard-tabs" in old_404:
        fail("404.html ainda contém uma cópia antiga do dashboard")


def validate_javascript() -> None:
    api = read(ROOT / "static" / "js" / "api.js")
    dashboard = read(ROOT / "static" / "js" / "dashboard.js")
    core = read(ROOT / "static" / "js" / "core.js")

    required_snippets = {
        "checkForDataUpdates": api,
        "refreshDynamicAging": api,
        "fornecedor_filter": api,
        "protectCsvCell": api,
        "filterContextAndOpenBase": dashboard,
        "pendingStages": dashboard,
        "updateHeaderMetadata": core,
        "refreshPromise": core,
    }
    missing = [name for name, content in required_snippets.items() if name not in content]
    if missing:
        fail(f"funções ou integrações V97 ausentes: {missing}")


def validate_data_if_present() -> None:
    data_file = ROOT / "static" / "data" / "dashboard-data.json"
    version_file = ROOT / "static" / "data" / "version.json"

    if not data_file.exists() and not version_file.exists():
        print("AVISO: dados não incluídos. Execute ATUALIZAR_DADOS.cmd antes da publicação.")
        return

    if not data_file.exists() or not version_file.exists():
        fail("dashboard-data.json e version.json devem existir juntos")

    payload = json.loads(data_file.read_text(encoding="utf-8"))
    version = json.loads(version_file.read_text(encoding="utf-8"))
    rows = payload.get("rows")
    if not isinstance(rows, list) or not rows:
        fail("o JSON de dados não contém registros")

    if not version.get("v"):
        fail("version.json não contém a propriedade v")

    metadata_rows = int(payload.get("boot", {}).get("metadata", {}).get("linhas", 0))
    if metadata_rows and metadata_rows != len(rows):
        fail(f"metadata informa {metadata_rows} linhas, mas o JSON contém {len(rows)}")

    print(f"Dados validados: {len(rows):,} registros.".replace(",", "."))


def main() -> int:
    validate_assets()
    validate_javascript()
    validate_data_if_present()
    print("OK: estrutura V97 validada com sucesso.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
