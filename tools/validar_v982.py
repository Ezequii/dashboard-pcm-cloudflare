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
manifest_path = ROOT / "tools/js_manifest_v982.json"

for path in [index_path, css_path, config_path, core_path, manifest_path]:
    if not path.exists():
        errors.append(f"Arquivo obrigatório ausente: {path.relative_to(ROOT)}")

if not errors:
    index = index_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8")
    config = config_path.read_text(encoding="utf-8")
    core = core_path.read_text(encoding="utf-8")

    required_scripts = [
        "app-config.js", "state.js", "utils.js", "api.js", "filters.js",
        "dashboard.js", "table.js", "core.js", "main.js"
    ]
    positions = []
    for name in required_scripts:
        marker = f'/static/js/{name}?v=982'
        position = index.find(marker)
        positions.append(position)
        if position < 0:
            errors.append(f"Script ausente ou sem v=982: {name}")

    if all(position >= 0 for position in positions) and positions != sorted(positions):
        errors.append("A ordem dos scripts está incorreta.")

    if "/static/styles_v50_corrigido.css?v=982" not in index:
        errors.append("O CSS não está versionado com v=982.")

    if 'version: "98.2"' not in config or 'assetVersion: "982"' not in config:
        errors.append("app-config.js não identifica a V98.2.")

    if 'String(config.assetVersion || "") !== "982"' not in core:
        errors.append("core.js não valida a versão 982.")

    required_ids = [
        "quickCompletionV982", "quickPendingV982", "quickPcmV982",
        "quickCriticalV982", "firstFocusV982", "completionProgressV982",
        "processCards", "topPrioridades", "actionNowList", "ownersCriticos"
    ]
    for element_id in required_ids:
        occurrences = len(re.findall(rf'id="{re.escape(element_id)}"', index))
        if occurrences != 1:
            errors.append(
                f"ID {element_id} aparece {occurrences} vezes; esperado: 1."
            )

    required_css = [
        ".executive-overview-v982", ".kpi-v982", ".process-card-v982",
        ".priority-row-v982", ".rankings-v982"
    ]
    for token in required_css:
        if token not in css:
            errors.append(f"Regra CSS ausente: {token}")

# Node é opcional. Quando disponível, valida a sintaxe.
node = shutil.which("node")
if node:
    for js_file in sorted((ROOT / "static/js").glob("*.js")):
        result = subprocess.run(
            [node, "--check", str(js_file)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            errors.append(
                f"JavaScript inválido em {js_file.name}: {result.stderr.strip()}"
            )
else:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected = manifest.get("files", {})
    current = {
        path.name: hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted((ROOT / "static/js").glob("*.js"))
    }
    if current != expected:
        errors.append("Os scripts foram alterados após a validação do pacote.")
    else:
        warnings.append(
            "Node.js não encontrado; integridade dos scripts confirmada por SHA-256."
        )

# Valida a base quando ela já tiver sido gerada.
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
    print("VALIDAÇÃO V98.2: FALHOU")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("VALIDAÇÃO V98.2: OK")
print(f"Scripts verificados: {len(list((ROOT / 'static/js').glob('*.js')))}")
if warnings:
    for warning in warnings:
        print(f"AVISO: {warning}")
