from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

index = (ROOT / "index.html").read_text(encoding="utf-8")
dashboard = (ROOT / "static/js/dashboard.js").read_text(encoding="utf-8")
config = (ROOT / "static/js/app-config.js").read_text(encoding="utf-8")
core = (ROOT / "static/js/core.js").read_text(encoding="utf-8")
css = (ROOT / "static/styles_v991_faithful.css").read_text(encoding="utf-8")

if 'version: "99.1"' not in config or 'assetVersion: "991"' not in config:
    errors.append("app-config.js não identifica a V99.1.")

if 'String(config.assetVersion || "") !== "991"' not in core:
    errors.append("core.js não valida a versão 991.")

if "/static/styles_v991_faithful.css?v=991" not in index:
    errors.append("A folha V99.1 não está carregada.")

required_scripts = [
    "app-config.js", "state.js", "utils.js", "api.js",
    "filters.js", "dashboard.js", "table.js", "core.js", "main.js"
]
positions = [index.find(f'/static/js/{name}?v=991') for name in required_scripts]
if not all(position >= 0 for position in positions):
    errors.append("Existem scripts sem versionamento 991.")
elif positions != sorted(positions):
    errors.append("A ordem dos scripts está incorreta.")

required_ids = [
    "kValorPendente", "kPendencias", "kPctConcluido",
    "completionProgressV991", "firstFocusV991",
    "kValorForaSla", "kFarolStatus", "kMaiorAtraso",
    "processCards", "topPrioridades", "actionNowList",
    "ownersCriticos", "processCardsBase", "baseOverviewHintV991"
]
for element_id in required_ids:
    count = len(re.findall(rf'id="{re.escape(element_id)}"', index))
    if count != 1:
        errors.append(f"ID {element_id} aparece {count} vezes.")

for function_name in [
    "renderExecutiveV991", "renderBaseV991", "renderFlowV991",
    "renderPrioritiesV991", "renderRankingV991"
]:
    if function_name not in dashboard:
        errors.append(f"Função ausente: {function_name}")

for selector in [
    ".executive-primary-v991", ".executive-alerts-v991",
    ".process-flow-v991", ".priority-row-v991",
    ".ranking-row-v991", ".base-stage-strip-v991"
]:
    if selector not in css:
        errors.append(f"Regra CSS ausente: {selector}")

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
    expected = json.loads(
        (ROOT / "tools/js_manifest_v991.json").read_text(encoding="utf-8")
    ).get("files", {})
    current = {
        path.name: hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted((ROOT / "static/js").glob("*.js"))
    }
    if current != expected:
        errors.append("Os scripts foram alterados após a validação.")

if errors:
    print("VALIDAÇÃO V99.1: FALHOU")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("VALIDAÇÃO V99.1: OK")
print("Arquitetura do mockup e renderizadores próprios confirmados.")
