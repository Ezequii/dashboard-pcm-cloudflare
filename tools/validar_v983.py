from __future__ import annotations

from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
warnings = []

index_path = ROOT / "index.html"
css_path = ROOT / "static/styles_v50_corrigido.css"
config_path = ROOT / "static/js/app-config.js"
core_path = ROOT / "static/js/core.js"
dashboard_path = ROOT / "static/js/dashboard.js"
manifest_path = ROOT / "tools/js_manifest_v983.json"

for path in [
    index_path, css_path, config_path, core_path,
    dashboard_path, manifest_path
]:
    if not path.exists():
        errors.append(f"Arquivo obrigatório ausente: {path.relative_to(ROOT)}")

if not errors:
    index = index_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8")
    config = config_path.read_text(encoding="utf-8")
    core = core_path.read_text(encoding="utf-8")
    dashboard = dashboard_path.read_text(encoding="utf-8")

    required_scripts = [
        "app-config.js", "state.js", "utils.js", "api.js",
        "filters.js", "dashboard.js", "table.js", "core.js", "main.js"
    ]
    positions = []
    for name in required_scripts:
        marker = f'/static/js/{name}?v=983'
        position = index.find(marker)
        positions.append(position)
        if position < 0:
            errors.append(f"Script ausente ou sem v=983: {name}")

    if all(position >= 0 for position in positions):
        if positions != sorted(positions):
            errors.append("A ordem dos scripts está incorreta.")

    if "/static/styles_v50_corrigido.css?v=983" not in index:
        errors.append("O CSS não está versionado com v=983.")

    if 'version: "98.3"' not in config or 'assetVersion: "983"' not in config:
        errors.append("app-config.js não identifica a V98.3.")

    if 'String(config.assetVersion || "") !== "983"' not in core:
        errors.append("core.js não valida a versão 983.")

    required_ids = [
        "kValorPendente", "kPendencias", "kPctConcluido",
        "firstFocusV983", "kValorForaSla", "kFarolStatus",
        "kMaiorAtraso", "processCards", "topPrioridades",
        "actionNowList", "ownersCriticos", "processCardsBase"
    ]
    for element_id in required_ids:
        count = len(re.findall(rf'id="{re.escape(element_id)}"', index))
        if count != 1:
            errors.append(
                f"ID {element_id} aparece {count} vezes; esperado: 1."
            )

    required_css = [
        ".executive-primary-v983", ".process-flow-v983",
        ".priority-line-v983", ".ranking-line-v983",
        ".base-stage-strip-v983"
    ]
    for selector in required_css:
        if selector not in css:
            errors.append(f"Regra CSS ausente: {selector}")

    required_js = [
        "renderPrimaryV983", "renderProcessFlowV983",
        "renderPrioritiesV983", "renderRankingTableV983"
    ]
    for function_name in required_js:
        if function_name not in dashboard:
            errors.append(f"Função V98.3 ausente: {function_name}")

node = shutil.which("node")
if node:
    for js_file in sorted((ROOT / "static/js").glob("*.js")):
        check = subprocess.run(
            [node, "--check", str(js_file)],
            capture_output=True,
            text=True,
        )
        if check.returncode != 0:
            errors.append(
                f"JavaScript inválido em {js_file.name}: "
                f"{check.stderr.strip()}"
            )
else:
    expected = json.loads(
        manifest_path.read_text(encoding="utf-8")
    ).get("files", {})
    current = {
        path.name: hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted((ROOT / "static/js").glob("*.js"))
    }
    if current != expected:
        errors.append("Os scripts foram alterados após a validação.")
    else:
        warnings.append(
            "Node.js não encontrado; integridade JavaScript confirmada por SHA-256."
        )

data_path = ROOT / "static/data/dashboard-data.json"
version_path = ROOT / "static/data/version.json"
if data_path.exists() or version_path.exists():
    if not data_path.exists() or not version_path.exists():
        errors.append("dashboard-data.json e version.json devem existir juntos.")
    else:
        try:
            payload = json.loads(data_path.read_text(encoding="utf-8"))
            version = json.loads(version_path.read_text(encoding="utf-8"))
            rows = payload.get("rows")
            if not isinstance(rows, list) or not rows:
                errors.append("dashboard-data.json não contém registros.")
            if str(payload.get("data_version") or "") != str(version.get("v") or ""):
                errors.append("data_version é diferente do version.json.")
        except Exception as exc:
            errors.append(f"Base JSON inválida: {exc}")

if errors:
    print("VALIDAÇÃO V98.3: FALHOU")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("VALIDAÇÃO V98.3: OK")
print(f"Scripts verificados: {len(list((ROOT / 'static/js').glob('*.js')))}")
for warning in warnings:
    print(f"AVISO: {warning}")
