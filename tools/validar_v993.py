from __future__ import annotations

from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
errors = []
results = []

def check(name: str, condition: bool, detail: str) -> None:
    results.append({"name": name, "passed": bool(condition), "detail": detail})
    if not condition:
        errors.append(f"{name}: {detail}")

index_path = ROOT / "index.html"
config_path = ROOT / "static/js/app-config.js"
core_path = ROOT / "static/js/core.js"
api_path = ROOT / "static/js/api.js"
table_path = ROOT / "static/js/table.js"
productivity_path = ROOT / "static/js/productivity-v99.js"
xlsx_path = ROOT / "static/js/xlsx-v99.js"
css_path = ROOT / "static/styles_v99_productivity.css"

required_files = [
    index_path, config_path, core_path, api_path, table_path,
    productivity_path, xlsx_path, css_path,
]
check(
    "arquivos_obrigatorios",
    all(path.exists() for path in required_files),
    ", ".join(str(path.relative_to(ROOT)) for path in required_files if not path.exists()) or "todos presentes",
)

if not errors:
    index = index_path.read_text(encoding="utf-8")
    config = config_path.read_text(encoding="utf-8")
    core = core_path.read_text(encoding="utf-8")
    api = api_path.read_text(encoding="utf-8")
    table = table_path.read_text(encoding="utf-8")
    productivity = productivity_path.read_text(encoding="utf-8")
    xlsx = xlsx_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8")

    check(
        "versionamento_993",
        'version: "99.3"' in config
        and 'assetVersion: "993"' in config
        and 'String(config.assetVersion || "") !== "993"' in core
        and "?v=993" in index
        and "?v=992" not in index,
        "configuração, runtime e HTML devem usar exclusivamente 993",
    )

    scripts = [
        "app-config.js", "state.js", "utils.js", "api.js", "filters.js",
        "dashboard.js", "table.js", "xlsx-v99.js",
        "productivity-v99.js", "core.js", "main.js",
    ]
    positions = [index.find(f"/static/js/{name}?v=993") for name in scripts]
    check(
        "ordem_dos_scripts",
        all(position >= 0 for position in positions)
        and positions == sorted(positions),
        str(dict(zip(scripts, positions))),
    )

    required_ids = [
        "btnOpenMultiSearchV99",
        "multiSearchDialogV99",
        "btnSavedViewsV99",
        "savedViewsDialogV99",
        "btnColumnsV99",
        "columnsDialogV99",
        "btnShareViewV99",
        "selectionBarV99",
        "detailsDrawerV99",
        "btnExportExcelV99",
        "btnExportExcelTableV99",
    ]
    id_counts = {
        element_id: len(re.findall(rf'id="{re.escape(element_id)}"', index))
        for element_id in required_ids
    }
    check(
        "ids_unicos",
        all(count == 1 for count in id_counts.values()),
        str(id_counts),
    )

    feature_checks = {
        "busca_multipla": (
            "multiSearchRows" in api
            and "parseMultiSearchInputV99" in productivity
            and "multi_search_terms" in api
        ),
        "selecao_linhas": (
            "renderSelectionHeaderV99" in productivity
            and "renderRowCheckboxV99" in productivity
            and "afterTableRenderV99" in table
        ),
        "copiar_resumo": (
            "buildOperationalSummaryV99" in productivity
            and "btnCopySummaryV99" in index
        ),
        "colunas_configuraveis": (
            "resolveColumnsV99" in productivity
            and "columnsListV99" in index
        ),
        "filtros_salvos": (
            "SAVED_VIEWS_KEY_V99" in productivity
            and "saveCurrentViewV99" in productivity
        ),
        "url_compartilhavel": (
            "syncProductivityUrlV99" in productivity
            and "restoreProductivityStateV99" in productivity
            and "window.restoreProductivityStateV99" in core
        ),
        "gaveta_detalhes": (
            "staticRowDetail" in api
            and "openDetailsV99" in productivity
            and "detailsDrawerV99" in index
        ),
        "excel_real": (
            "__buildXlsxBytesV99" in xlsx
            and "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in xlsx
            and "Exportar Excel real (.xlsx)" in index
        ),
    }
    for name, condition in feature_checks.items():
        check(name, condition, "implementação encontrada" if condition else "implementação ausente")

    css_selectors = [
        ".productivity-toolbar-v99",
        ".selection-bar-v99",
        ".modal-v99",
        ".details-drawer-v99",
        ".column-option-v99",
    ]
    check(
        "css_operacional",
        all(selector in css for selector in css_selectors),
        ", ".join(selector for selector in css_selectors if selector not in css) or "todos presentes",
    )

    data_path = ROOT / "static/data/dashboard-data.json"
    version_path = ROOT / "static/data/version.json"
    if data_path.exists() or version_path.exists():
        check(
            "dados_em_par",
            data_path.exists() and version_path.exists(),
            "dashboard-data.json e version.json devem existir juntos",
        )
        if data_path.exists() and version_path.exists():
            try:
                payload = json.loads(data_path.read_text(encoding="utf-8"))
                version = json.loads(version_path.read_text(encoding="utf-8"))
                check(
                    "dados_validos",
                    isinstance(payload.get("rows"), list)
                    and bool(payload.get("rows"))
                    and str(payload.get("data_version") or "") == str(version.get("v") or ""),
                    "base JSON e versão devem ser válidas",
                )
            except Exception as exc:
                check("dados_validos", False, str(exc))
    else:
        check(
            "pacote_sem_fixture",
            True,
            "nenhuma base sintética incluída",
        )

node = shutil.which("node")
check("node_disponivel", bool(node), node or "Node.js não encontrado")

if node:
    for js_file in sorted((ROOT / "static/js").glob("*.js")):
        process = subprocess.run(
            [node, "--check", str(js_file)],
            capture_output=True,
            text=True,
        )
        check(
            f"sintaxe_{js_file.name}",
            process.returncode == 0,
            process.stderr.strip() or "OK",
        )

    functional = subprocess.run(
        [node, str(ROOT / "qa/v99_operacional/testar_funcoes_v99.js")],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    check(
        "testes_funcionais_node",
        functional.returncode == 0,
        functional.stdout.strip() or functional.stderr.strip(),
    )

sample_xlsx = ROOT / "qa/v99_operacional/amostra_exportacao_v99.xlsx"
if sample_xlsx.exists():
    try:
        with zipfile.ZipFile(sample_xlsx, "r") as archive:
            names = set(archive.namelist())
            required = {
                "[Content_Types].xml",
                "_rels/.rels",
                "xl/workbook.xml",
                "xl/styles.xml",
                "xl/worksheets/sheet1.xml",
                "xl/worksheets/sheet2.xml",
            }
            check(
                "xlsx_ooxml_valido",
                not (required - names) and archive.testzip() is None,
                f"ausentes={sorted(required - names)}",
            )
    except Exception as exc:
        check("xlsx_ooxml_valido", False, str(exc))
else:
    check("xlsx_ooxml_valido", False, "amostra XLSX não foi gerada")

print("VALIDAÇÃO V99.3 — PRODUTIVIDADE OPERACIONAL")
print("=" * 72)
for result in results:
    print(
        f"{'OK' if result['passed'] else 'FALHOU':7} "
        f"{result['name']} — {result['detail']}"
    )

failed = [result for result in results if not result["passed"]]
print()
print(
    f"RESULTADO: {len(results) - len(failed)}/{len(results)} verificações aprovadas."
)

output = ROOT / "qa/v99_operacional/resultados_validacao_v993.json"
output.write_text(
    json.dumps(results, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

if failed:
    sys.exit(1)
