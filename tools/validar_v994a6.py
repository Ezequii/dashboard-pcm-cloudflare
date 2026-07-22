from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
sys.path.insert(0, str(TOOLS))

from services.atomic_publish import cross_validate_versions  # noqa: E402
from services.payload import (  # noqa: E402
    EXECUTIVE_PUBLIC_FIELDS,
    EXECUTIVE_INTERNAL_FIELDS,
    OPERATIONAL_PUBLIC_FIELDS,
    assert_no_forbidden_fields,
    validate_payload,
)
from services.security import parse_security_policy  # noqa: E402

results: list[dict[str, object]] = []


def check(name: str, condition: bool, detail: str) -> None:
    results.append(
        {
            "name": name,
            "passed": bool(condition),
            "detail": str(detail),
        }
    )


def run(
    command: list[str],
    *,
    environment: dict[str, str] | None = None,
) -> subprocess.CompletedProcess:
    return subprocess.run(
        command,
        cwd=ROOT,
        env=environment,
        capture_output=True,
        text=True,
    )


required_files = [
    "index.html",
    "404.html",
    "_headers",
    "ATUALIZAR_DADOS.cmd",
    "ROLLBACK_DADOS.cmd",
    "static/js/app-config.js",
    "static/js/state.js",
    "static/js/security-v994a.js",
    "static/js/api.js",
    "static/js/core.js",
    "static/js/dashboard.js",
    "static/js/table.js",
    "static/js/productivity-v99.js",
    "static/js/xlsx-v99.js",
    "static/styles_v994a_hardening.css",
    "static/styles_v994a2_audit.css",
    "static/styles_v994a2_visual.css",
    "static/styles_v994a3_operational_fix.css",
    "static/styles_v994a4_top_base_flow.css",
    "static/styles_v994a5_lapidacao.css",
    "static/styles_v994a6_clean_rankings.css",
    "static/config/security-config.json",
    "static/config/business-rules.json",
    "tools/gerar_json_planilha.py",
    "tools/rollback_v994a.py",
    "tools/gerar_404.py",
    "tools/services/payload.py",
    "tools/services/atomic_publish.py",
    "tools/services/security.py",
    "tools/services/records.py",
    "tools/services/local_state.py",
    "tools/tests/test_atomic_publish.py",
    "tools/tests/test_local_state.py",
    "qa/v994a/test_runtime_v994a.js",
    "qa/v99_operacional/testar_funcoes_v99.js",
    "qa/v994a4/test_top_base_flow_v994a4.js",
    "qa/v994a5/test_lapidacao_v994a5.js",
    "qa/v994a6/test_clean_top_rankings_v994a6.js",
]
missing = [relative for relative in required_files if not (ROOT / relative).exists()]
check(
    "arquivos_obrigatorios",
    not missing,
    "todos presentes" if not missing else ", ".join(missing),
)

index = (ROOT / "index.html").read_text(encoding="utf-8")
not_found = (ROOT / "404.html").read_text(encoding="utf-8")
headers = (ROOT / "_headers").read_text(encoding="utf-8")
config_js = (ROOT / "static/js/app-config.js").read_text(encoding="utf-8")
state_js = (ROOT / "static/js/state.js").read_text(encoding="utf-8")
api_js = (ROOT / "static/js/api.js").read_text(encoding="utf-8")
core_js = (ROOT / "static/js/core.js").read_text(encoding="utf-8")
dashboard_js = (ROOT / "static/js/dashboard.js").read_text(encoding="utf-8")
security_js = (ROOT / "static/js/security-v994a.js").read_text(encoding="utf-8")
productivity_js = (ROOT / "static/js/productivity-v99.js").read_text(encoding="utf-8")
xlsx_js = (ROOT / "static/js/xlsx-v99.js").read_text(encoding="utf-8")
atomic_publish_py = (
    ROOT / "tools/services/atomic_publish.py"
).read_text(encoding="utf-8")
local_state_py = (
    ROOT / "tools/services/local_state.py"
).read_text(encoding="utf-8")
rollback_py = (
    ROOT / "tools/rollback_v994a.py"
).read_text(encoding="utf-8")
generator_py = (
    ROOT / "tools/gerar_json_planilha.py"
).read_text(encoding="utf-8")
filters_js = (
    ROOT / "static/js/filters.js"
).read_text(encoding="utf-8")
table_js = (
    ROOT / "static/js/table.js"
).read_text(encoding="utf-8")
payload_py = (
    ROOT / "tools/services/payload.py"
).read_text(encoding="utf-8")
lapidacao_css = (
    ROOT / "static/styles_v994a5_lapidacao.css"
).read_text(encoding="utf-8")
clean_rankings_css = (
    ROOT / "static/styles_v994a6_clean_rankings.css"
).read_text(encoding="utf-8")

check(
    "versionamento_9946",
    'version: "99.4A.6"' in config_js
    and 'assetVersion: "9946"' in config_js
    and 'String(config.assetVersion || "") !== "9946"' in core_js
    and "?v=9946" in index
    and not re.search(r"\?v=994(?:[\"&]|$)", index)
    and not re.search(r"\?v=993(?:[\"&]|$)", index),
    "HTML, configuração e runtime usam 9946",
)

scripts = [
    "app-config.js",
    "state.js",
    "utils.js",
    "security-v994a.js",
    "api.js",
    "filters.js",
    "dashboard.js",
    "table.js",
    "xlsx-v99.js",
    "productivity-v99.js",
    "core.js",
    "main.js",
]
positions = [index.find(f"/static/js/{name}?v=9946") for name in scripts]
check(
    "ordem_scripts",
    all(position >= 0 for position in positions)
    and positions == sorted(positions),
    str(dict(zip(scripts, positions))),
)

required_ids = [
    "mainContent",
    "securityContextV994a",
    "securityRoleV994a",
    "securityClassificationV994a",
    "dataErrorTimeV994a",
    "lastValidVersionV994a",
    "lastSuccessTimeV994a",
    "btnOpenMultiSearchV99",
    "selectionBarV99",
    "detailsDrawerV99",
    "completionProgressV991",
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

check(
    "csp_sem_inline",
    "script-src 'self';" in headers
    and "style-src 'self';" in headers
    and "'unsafe-inline'" not in headers,
    "scripts e estilos inline bloqueados",
)

inline_style_patterns = {
    "index.html": bool(re.search(r"\sstyle\s*=", index, re.I)),
    "404.html": bool(re.search(r"\sstyle\s*=", not_found, re.I)),
    "dashboard.js": bool(
        re.search(r"\sstyle\s*=|\.style\.|setAttribute\(\s*['\"]style", dashboard_js, re.I)
    ),
    "productivity-v99.js": bool(
        re.search(r"\sstyle\s*=|\.style\.|setAttribute\(\s*['\"]style", productivity_js, re.I)
    ),
}
check(
    "ui_sem_estilo_inline",
    not any(inline_style_patterns.values()),
    str(inline_style_patterns),
)

feature_checks = {
    "abort_controller": (
        "beginRequestV994a" in state_js
        and "abortAllRequestsV994a" in state_js
        and "signal: request.signal" in api_js
    ),
    "payload_separado": (
        "executive-data.json" in config_js
        and "operational-data.json" in config_js
        and "loadExecutiveDataV994a" in api_js
        and "loadOperationalDataV994a" in api_js
    ),
    "validacao_cruzada": (
        "DataVersionMismatchError" in api_js
        and "validatePublicationStatusV994a" in api_js
    ),
    "fail_closed": (
        "assertOperationalAccess" in security_js
        and "failClosed" in config_js
        and "canViewOperationalData" in security_js
    ),
    "ultima_versao_valida": (
        "lastValidVersion" in state_js
        and "markDataSuccessV994a" in state_js
        and "lastValidVersionV994a" in index
    ),
    "rollback": (
        "rollback_v994a.py"
        in (ROOT / "ROLLBACK_DADOS.cmd").read_text(encoding="utf-8")
    ),
    "produtividade_preservada": all(
        token in productivity_js
        for token in [
            "parseMultiSearchInputV99",
            "renderSelectionHeaderV99",
            "buildOperationalSummaryV99",
            "resolveColumnsV99",
            "saveCurrentViewV99",
            "syncProductivityUrlV99",
            "openDetailsV99",
            "exportExcelFromCurrentViewV99",
        ]
    ),
    "xlsx_real": (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        in xlsx_js
        and "xl/worksheets/sheet2.xml" in xlsx_js
    ),
    "progressos_csp_safe": (
        "<progress" in dashboard_js
        and "completionProgressV991" in index
        and ".style.width" not in dashboard_js
    ),
    "indice_executivo_minimizado": (
        "EXECUTIVE_INTERNAL_FIELDS" in
        (ROOT / "tools/services/payload.py").read_text(encoding="utf-8")
    ),
}
for name, condition in feature_checks.items():
    check(name, condition, "implementado" if condition else "ausente")

security_config = json.loads(
    (ROOT / "static/config/security-config.json").read_text(encoding="utf-8")
)
try:
    policy = parse_security_policy(security_config)
    security_ok = (
        policy.environment == "production"
        and policy.access_required
        and policy.fail_closed
        and not policy.anonymous_access_allowed
    )
    security_detail = (
        f"environment={policy.environment}, failClosed={policy.fail_closed}"
    )
except Exception as exc:
    security_ok = False
    security_detail = str(exc)
check("politica_seguranca", security_ok, security_detail)

check(
    "headers_seguranca",
    all(
        token in headers
        for token in [
            "Strict-Transport-Security",
            "X-Frame-Options: DENY",
            "frame-ancestors 'none'",
            "Cross-Origin-Opener-Policy: same-origin",
            "Cross-Origin-Resource-Policy: same-origin",
            "/static/data/*",
        ]
    ),
    "HSTS, CSP, DENY, COOP, CORP e no-store",
)

check(
    "404_minimo",
    "<script" not in not_found.lower()
    and "executive-primary" not in not_found
    and 'http-equiv="refresh"' in not_found,
    "redirecionamento sem cópia do dashboard",
)

legacy_data = ROOT / "static/data/dashboard-data.json"
check(
    "payload_legado_ausente",
    not legacy_data.exists(),
    "dashboard-data.json não está publicado",
)

data_paths = {
    "static/data/executive-data.json": ROOT / "static/data/executive-data.json",
    "static/data/operational-data.json": ROOT / "static/data/operational-data.json",
    "static/data/publication-status.json": ROOT / "static/data/publication-status.json",
    "static/data/version.json": ROOT / "static/data/version.json",
}
existing_data = {
    relative: path
    for relative, path in data_paths.items()
    if path.exists()
}
if existing_data:
    complete = len(existing_data) == len(data_paths)
    check(
        "conjunto_dados_completo",
        complete,
        f"{len(existing_data)}/{len(data_paths)} arquivos",
    )
    if complete:
        version_payload = json.loads(
            data_paths["static/data/version.json"].read_text(encoding="utf-8")
        )
        version = str(version_payload.get("v", ""))
        try:
            cross_validate_versions(existing_data, version)
            executive_payload = json.loads(
                data_paths["static/data/executive-data.json"].read_text(
                    encoding="utf-8"
                )
            )
            operational_payload = json.loads(
                data_paths["static/data/operational-data.json"].read_text(
                    encoding="utf-8"
                )
            )
            validate_payload(
                executive_payload,
                public_fields=EXECUTIVE_PUBLIC_FIELDS,
                expected_version=version,
                internal_fields=EXECUTIVE_INTERNAL_FIELDS,
            )
            validate_payload(
                operational_payload,
                public_fields=OPERATIONAL_PUBLIC_FIELDS,
                expected_version=version,
            )
            assert_no_forbidden_fields(executive_payload)
            assert_no_forbidden_fields(operational_payload)
            data_ok = True
            data_detail = f"versão {version}"
        except Exception as exc:
            data_ok = False
            data_detail = str(exc)
        check("dados_publicados_validos", data_ok, data_detail)
else:
    check(
        "pacote_sem_fixture",
        True,
        "dados serão gerados pela planilha oficial",
    )

obsolete_patterns = [
    "validar_v97.py",
    "validar_v971.py",
    "validar_v982.py",
    "validar_v985.py",
    "validar_v991.py",
    "validar_v992.py",
    "validar_v993.py",
    "amostra_exportacao_v99.xlsx",
]
obsolete_found = [
    str(path.relative_to(ROOT))
    for path in ROOT.rglob("*")
    if path.is_file() and path.name in obsolete_patterns
]
check(
    "pacote_sem_legado_executavel",
    not obsolete_found,
    "nenhum" if not obsolete_found else ", ".join(obsolete_found),
)

node = shutil.which("node")
check("node_disponivel", bool(node), node or "não encontrado")

with tempfile.TemporaryDirectory(prefix="pcm-v994a1-tests-") as temporary:
    environment = os.environ.copy()
    environment["PCM_TEST_OUTPUT_DIR"] = temporary

    if node:
        syntax_errors = []
        for script in sorted((ROOT / "static/js").glob("*.js")):
            result = run([node, "--check", str(script)])
            if result.returncode != 0:
                syntax_errors.append(
                    f"{script.name}: {result.stderr.strip()}"
                )
        check(
            "sintaxe_javascript",
            not syntax_errors,
            "todos válidos" if not syntax_errors else " | ".join(syntax_errors),
        )

        runtime_result = run(
            [node, "qa/v994a/test_runtime_v994a.js"],
            environment=environment,
        )
        check(
            "testes_runtime",
            runtime_result.returncode == 0,
            runtime_result.stdout.strip() or runtime_result.stderr.strip(),
        )

        productivity_result = run(
            [node, "qa/v99_operacional/testar_funcoes_v99.js"],
            environment=environment,
        )
        check(
            "testes_produtividade",
            productivity_result.returncode == 0,
            productivity_result.stdout.strip()
            or productivity_result.stderr.strip(),
        )

        lapidacao_result = run(
            [node, "qa/v994a5/test_lapidacao_v994a5.js"],
            environment=environment,
        )
        check(
            "testes_lapidacao_v994a5",
            lapidacao_result.returncode == 0,
            lapidacao_result.stdout.strip()
            or lapidacao_result.stderr.strip(),
        )

        clean_rankings_result = run(
            [node, "qa/v994a6/test_clean_top_rankings_v994a6.js"],
            environment=environment,
        )
        check(
            "testes_topo_rankings_v994a6",
            clean_rankings_result.returncode == 0,
            clean_rankings_result.stdout.strip()
            or clean_rankings_result.stderr.strip(),
        )

        visual_result = run(
            [node, "qa/v994a4/test_top_base_flow_v994a4.js"],
            environment=environment,
        )
        check(
            "testes_topo_base_fluxo_v994a4",
            visual_result.returncode == 0,
            visual_result.stdout.strip()
            or visual_result.stderr.strip(),
        )

    python_tests = run(
        [
            sys.executable,
            "-m",
            "unittest",
            "discover",
            "-s",
            "tools/tests",
            "-p",
            "test_*.py",
            "-v",
        ],
        environment=environment,
    )
    check(
        "testes_python",
        python_tests.returncode == 0,
        python_tests.stdout.strip()
        if python_tests.returncode == 0
        else (python_tests.stdout + "\n" + python_tests.stderr).strip(),
    )

    sample_xlsx = Path(temporary) / "amostra_exportacao_v99.xlsx"
    if sample_xlsx.exists():
        try:
            with zipfile.ZipFile(sample_xlsx, "r") as archive:
                required = {
                    "[Content_Types].xml",
                    "xl/workbook.xml",
                    "xl/styles.xml",
                    "xl/worksheets/sheet1.xml",
                    "xl/worksheets/sheet2.xml",
                }
                names = set(archive.namelist())
                xlsx_ok = not (required - names) and archive.testzip() is None
                xlsx_detail = f"ausentes={sorted(required - names)}"
        except Exception as exc:
            xlsx_ok = False
            xlsx_detail = str(exc)
    else:
        xlsx_ok = False
        xlsx_detail = "amostra temporária não criada"
    check("xlsx_ooxml", xlsx_ok, xlsx_detail)


dashboard_js = (ROOT / "static/js/dashboard.js").read_text(encoding="utf-8")
table_js = (ROOT / "static/js/table.js").read_text(encoding="utf-8")
productivity_js = (ROOT / "static/js/productivity-v99.js").read_text(encoding="utf-8")
visual_css = (ROOT / "static/styles_v994a2_visual.css").read_text(encoding="utf-8")

check(
    "fluxo_quatro_etapas",
    all(stage in dashboard_js for stage in [
        "SEM LANÇAMENTO",
        "SEM PEDIDO",
        "SEM NF",
        "CONCLUÍDO",
    ])
    and "buildFlowStagesV994a2" in dashboard_js
    and "FLOW_STAGE_ORDER_V994A2" in dashboard_js
    and "repeat(4,minmax(0,1fr))" in visual_css,
    "quatro etapas canônicas e grade de quatro colunas",
)

check(
    "tabela_sem_colunas_fixas",
    "function pinnedColumnClassV994a2(index){\n  return '';\n}" in table_js
    and "position:static!important" in
      (ROOT / "static/styles_v994a4_top_base_flow.css").read_text(encoding="utf-8"),
    "rolagem horizontal natural, sem colunas presas",
)

check(
    "gaveta_formatada",
    "detailDisplayV994a2" in productivity_js
    and "detail-token-v994a2" in productivity_js
    and "is-money-v994a2" in visual_css,
    "moeda, dias, datas e documentos formatados",
)

check(
    "legibilidade_visual",
    "font-size:11px!important" in visual_css
    and "font-size:11.5px!important" in visual_css
    and "font-size:9.5px!important" in visual_css,
    "rótulos críticos ampliados",
)


api_source_v994a3 = (ROOT / "static/js/api.js").read_text(encoding="utf-8")
index_source_v994a3 = (ROOT / "index.html").read_text(encoding="utf-8")
fix_css_v994a3 = (ROOT / "static/styles_v994a3_operational_fix.css").read_text(encoding="utf-8")

check(
    "tabela_fonte_operacional",
    "resolveStaticColumnsV994a3" in api_source_v994a3
    and "__OPERATIONAL_DATA_V994A?.columns" in api_source_v994a3
    and "__STATIC_DATA?.boot?.table_columns" not in api_source_v994a3,
    "staticRows usa o contrato operacional atual",
)

check(
    "tabela_sem_falha_silenciosa",
    "throw err;" in api_source_v994a3
    and "Erro em staticRows" in api_source_v994a3,
    "erros chegam ao banner permanente",
)

check(
    "hidden_respeitado",
    "#processCardsBase[hidden]" in fix_css_v994a3
    and "display:none!important" in fix_css_v994a3,
    "painel redundante não aparece fora da Base",
)

check(
    "modal_colunas_inteiro",
    "#columnsDialogV99.modal-v99" in fix_css_v994a3
    and "width:min(780px,calc(100vw - 32px))" in fix_css_v994a3
    and "#columnsDialogV99 .modal-card-v99.is-wide" in fix_css_v994a3,
    "dialog e formulário usam a mesma largura",
)

check(
    "legibilidade_v994a3",
    "font-size:12px!important" in fix_css_v994a3
    and "font-size:11px!important" in fix_css_v994a3,
    "textos operacionais ampliados",
)

check(
    "camada_v994a3_carregada",
    "styles_v994a3_operational_fix.css?v=9946" in index_source_v994a3
    and "v994a3-operational-fix" in index_source_v994a3,
    "camada corretiva V99.4A.3 preservada antes da V99.4A.6",
)


top_css_v994a4 = (
    ROOT / "static/styles_v994a4_top_base_flow.css"
).read_text(encoding="utf-8")
table_source_v994a4 = (
    ROOT / "static/js/table.js"
).read_text(encoding="utf-8")
state_source_v994a4 = (
    ROOT / "static/js/state.js"
).read_text(encoding="utf-8")
generator_source_v994a4 = (
    ROOT / "tools/gerar_json_planilha.py"
).read_text(encoding="utf-8")

check(
    "topo_reorganizado_v994a4",
    all(token in index for token in [
        "brand-v994a4",
        "tabs-v994a4",
        "status-cluster-v994a4",
        "action-cluster-v994a4",
    ])
    and "topbar-main-v994a4" in top_css_v994a4,
    "marca, navegação e status/ações usam zonas independentes",
)

check(
    "camada_v994a4_por_ultimo",
    index.rfind("styles_v994a4_top_base_flow.css?v=9946")
      > index.rfind("styles_v994a3_operational_fix.css?v=9946"),
    "CSS V99.4A.6 é a camada final",
)

check(
    "resumo_etapas_duplicado_removido",
    'id="processCardsBase"' not in index,
    "somente o fluxo executivo permanece",
)

check(
    "ordenacao_padrao_fluxo",
    "sortCol: 'ETAPA'" in state_source_v994a4
    and "sortDir: 'asc'" in state_source_v994a4
    and "query.sort_col || 'ETAPA'" in api_js
    and "query.sort_dir || 'asc'" in api_js,
    "lançamento → pedido → NF → concluído",
)

check(
    "preferencias_novas_v994a4",
    "pcm-dashboard-preferences-v994a4-flow-default" in state_source_v994a4
    and "pcm-dashboard-columns-v994a4-flow" in productivity_js,
    "preferências antigas não sobrescrevem o novo padrão",
)

check(
    "colunas_padrao_cronologicas",
    all(token in table_source_v994a4 for token in [
        "'DATA DE RECEBIMENTO'",
        "'DATA LANÇAMENTO'",
        "'Nº PEDIDO DE COMPRA'",
        "'DATA DO PEDIDO'",
        "'Nº NFS/DANFE'",
        "'DATA LANÇAMENTO NFS'",
    ])
    and generator_source_v994a4.index('"DATA DE RECEBIMENTO"')
      < generator_source_v994a4.index('"DATA LANÇAMENTO"')
      < generator_source_v994a4.index('"Nº PEDIDO DE COMPRA"')
      < generator_source_v994a4.index('"DATA DO PEDIDO"')
      < generator_source_v994a4.index('"Nº NFS/DANFE"')
      < generator_source_v994a4.index('"DATA LANÇAMENTO NFS"'),
    "colunas acompanham o ciclo da requisição",
)

check(
    "sem_colunas_fixadas",
    bool(
        re.search(
            r"function pinnedColumnClassV994a2\(index\)\{\s*return '';\s*\}",
            table_source_v994a4,
        )
    )
    and "#dataTable .pin-col-v994a2" in top_css_v994a4
    and "position:static!important" in top_css_v994a4,
    "nenhuma coluna fica presa horizontalmente",
)

check(
    "legibilidade_v994a4",
    "font-size:12.5px!important" in top_css_v994a4
    and "font-size:12px!important" in top_css_v994a4
    and "font-size:11.5px!important" in top_css_v994a4,
    "topo, busca, filtros e tabela ampliados",
)


check(
    "hotfix_onedrive_sem_rmtree_last_valid",
    "for child in backup_dir.iterdir()" not in atomic_publish_py
    and "shutil.rmtree(child)" not in atomic_publish_py
    and "snapshots" in atomic_publish_py
    and "last-valid-pointer.json" in atomic_publish_py,
    "backup imutável por snapshot; pasta last-valid não é apagada",
)

check(
    "estado_local_fora_onedrive",
    "LOCALAPPDATA" in local_state_py
    and "PCM_LOCAL_STATE_DIR" in local_state_py
    and "DashboardPCM" in local_state_py,
    "Windows usa LOCALAPPDATA com override opcional",
)

check(
    "rollback_por_snapshot",
    "resolve_last_valid_snapshot" in rollback_py
    and "copy_file_atomically" in rollback_py
    and "snapshot_dir" in rollback_py,
    "rollback resolve o snapshot apontado e usa replace com retry",
)

check(
    "retry_bloqueio_temporario",
    "_replace_with_retry" in atomic_publish_py
    and "except PermissionError" in atomic_publish_py
    and "attempts: int = 8" in atomic_publish_py,
    "substituição de arquivos tolera bloqueios temporários",
)

check(
    "aviso_openpyxl_controlado",
    "Data Validation extension is not supported" in generator_py
    and "warnings.filterwarnings" in generator_py,
    "aviso inofensivo de leitura não polui o atualizador",
)


check(
    "camada_v994a6_final",
    "styles_v994a6_clean_rankings.css?v=9946" in index
    and index.rfind("styles_v994a6_clean_rankings.css?v=9946")
      > index.rfind("styles_v994a5_lapidacao.css?v=9946")
    and "v994a6-clean-rankings" in index,
    "CSS V99.4A.6 carregado por último",
)

check(
    "semantica_orc_os",
    "ORCs/OSs em andamento" in index
    and "Copiar ORC/OS" in index
    and "documentReferenceV994a5" in productivity_js
    and "RCs em andamento" not in index,
    "interface usa ORC/OS nos pontos operacionais",
)

check(
    "mais_antigo_exato",
    all(token in api_js for token in [
        "maior_atraso_orc",
        "maior_atraso_os",
        "maior_atraso_search_value",
        "reference_text",
    ])
    and all(token in dashboard_js for token in [
        "resetOperationalContextForExactCaseV994a5",
        "state.filters.FORNECEDOR = [supplier]",
        "state.searchScope = searchScope",
        "oldest-reference-chip-v994a5",
    ]),
    "caso mais antigo inclui ORC/OS e abre com contexto exato",
)

check(
    "payload_executivo_orc_os",
    '"Nº ORÇAMENTO FINAL"' in payload_py
    and '"Nº ORDEM SERVIÇO"' in payload_py,
    "índice executivo recebe referências mínimas para o caso mais antigo",
)

check(
    "rankings_operacionais",
    all(token in api_js for token in [
        "critical_count",
        "max_days",
        "average_days",
    ])
    and all(token in dashboard_js for token in [
        "ranking-row-v994a5",
        "ranking-name-v994a5",
        "ranking-value-v994a5",
    ])
    and ".ranking-row-v994a5" in lapidacao_css,
    "fornecedores e solicitantes mostram valor, quantidade, críticas e idade",
)

check(
    "mostrador_filtros_v994a5",
    all(token in filters_js for token in [
        "filter-scope-badges-v994a5",
        "active-filter-controls-v994a5",
        "Visão: contexto geral",
        "Limpar tudo",
    ])
    and ".active-filters-v97" in lapidacao_css
    and ".active-filter-chip-v994a5" in lapidacao_css,
    "barra de contexto diferencia visão, fila e base",
)

check(
    "topo_v994a5",
    ".topbar-main-v994a4" in lapidacao_css
    and "grid-template-columns:minmax(390px,1.08fr)" in lapidacao_css
    and ".data-status-group-v994a4" in lapidacao_css
    and ".filters-summary-button-v97.has-filters" in lapidacao_css,
    "topo reorganizado com status, ações e filtros legíveis",
)


check(
    "topo_clean_v994a6",
    "security-runtime-only-v994a6" in index
    and ".security-runtime-only-v994a6" in clean_rankings_css
    and "display:none!important" in clean_rankings_css
    and "background:rgba(255,255,255,.88)!important" in clean_rankings_css
    and "opacity:.72!important" in clean_rankings_css,
    "acesso visual removido; atualização menor e translúcida",
)

check(
    "ranking_geral_padrao_v994a6",
    'let rankingScopeV994a6 = "all"' in dashboard_js
    and "charts.top_fornecedores || []" in dashboard_js
    and "charts.custo_solicitante || []" in dashboard_js
    and "Fornecedores com maior valor geral" in index
    and "Solicitantes com maior valor geral" in index,
    "Geral é o contexto inicial dos dois rankings",
)

check(
    "ranking_seletor_v994a6",
    'data-ranking-scope="all"' in index
    and 'data-ranking-scope="pending"' in index
    and "charts.top_fornecedores_pendentes || []" in dashboard_js
    and "charts.solicitantes_pendentes || []" in dashboard_js
    and "renderRankingsV994a6" in dashboard_js,
    "seletor alterna Geral e Em andamento",
)

check(
    "top_tres_sem_corte_v994a6",
    "(rows || []).slice(0, 3)" in dashboard_js
    and "min-height:186px!important" in clean_rankings_css
    and "min-height:330px!important" in clean_rankings_css
    and "overflow:visible!important" in clean_rankings_css
    and "visibility:visible!important" in clean_rankings_css,
    "três linhas e rodapé permanecem visíveis",
)

check(
    "ranking_clique_contextual_v994a6",
    "filterDimensionAndOpenBase(column, value, scope=\"all\")" in dashboard_js
    and "rankingScopeV994a6" in dashboard_js
    and "openRankingContextV994a6" in dashboard_js,
    "linha e rodapé respeitam o contexto selecionado",
)

print("VALIDAÇÃO V99.4A.6 — TOPO CLEAN E RANKINGS GERAIS")
print("=" * 82)
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

reports = ROOT / "reports"
reports.mkdir(parents=True, exist_ok=True)
(reports / "validation-report-v994a6.json").write_text(
    json.dumps(results, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

if failed:
    raise SystemExit(1)
