from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

index_path = ROOT / "index.html"
config_path = ROOT / "static/js/app-config.js"
core_path = ROOT / "static/js/core.js"
css_path = ROOT / "static/styles_v50_corrigido.css"

index = index_path.read_text(encoding="utf-8")
config = config_path.read_text(encoding="utf-8")
core = core_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

required_scripts = [
    "app-config.js",
    "state.js",
    "utils.js",
    "api.js",
    "filters.js",
    "dashboard.js",
    "table.js",
    "core.js",
    "main.js",
]

positions = []
for name in required_scripts:
    marker = f'/static/js/{name}?v=98'
    position = index.find(marker)
    if position < 0:
        errors.append(f"Script ausente ou sem v=98: {name}")
    positions.append(position)

if all(position >= 0 for position in positions) and positions != sorted(positions):
    errors.append("A ordem dos scripts está incorreta.")

if "/static/styles_v50_corrigido.css?v=98" not in index:
    errors.append("O CSS não está versionado com v=98.")

if 'version: "98"' not in config or 'assetVersion: "98"' not in config:
    errors.append("app-config.js não identifica a V98.")

if 'String(config.assetVersion || "") !== "98"' not in core:
    errors.append("core.js não valida a versão 98.")

required_ids = [
    "quickCompletion",
    "quickPcm",
    "quickOrder",
    "quickNf",
    "firstFocusV98",
    "completionProgressV98",
    "kFarolStatus",
    "processCards",
    "topPrioridades",
    "actionNowList",
    "ownersCriticos",
]

for element_id in required_ids:
    occurrences = len(re.findall(rf'id="{re.escape(element_id)}"', index))
    if occurrences != 1:
        errors.append(f"ID {element_id} aparece {occurrences} vezes; esperado: 1.")

required_css_tokens = [
    ".executive-summary-v98",
    ".kpi-v98",
    ".process-card-v98",
    ".priority-row-v98",
    ".ranking-mode-v98",
]

for token in required_css_tokens:
    if token not in css:
        errors.append(f"Regra CSS V98 ausente: {token}")

if "critical_pending" not in (ROOT / "static/js/api.js").read_text(encoding="utf-8"):
    errors.append("A API não calcula pendências críticas.")

if "renderExecutiveSummaryV98" not in (ROOT / "static/js/dashboard.js").read_text(encoding="utf-8"):
    errors.append("O dashboard não renderiza a leitura rápida V98.")

syntax = subprocess.run(
    ["node", str(ROOT / "tools/check_js_syntax_v98.js")],
    capture_output=True,
    text=True,
)
if syntax.returncode != 0:
    errors.append(f"Validação de sintaxe JavaScript falhou: {syntax.stdout.strip()} {syntax.stderr.strip()}")

smoke = subprocess.run(
    ["node", str(ROOT / "tools/smoke_v98_api.js")],
    capture_output=True,
    text=True,
)
if smoke.returncode != 0:
    errors.append(f"Smoke test da API falhou: {smoke.stdout.strip()} {smoke.stderr.strip()}")

preview_artifact = ROOT / "V98_PREVIEW_TEST.png"
if preview_artifact.exists():
    errors.append(f"Artefato de teste não pode ser publicado: {preview_artifact.relative_to(ROOT)}")

if errors:
    print("VALIDAÇÃO V98: FALHOU")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("VALIDAÇÃO V98: OK")
print(f"Scripts verificados: {len(list((ROOT / 'static/js').glob('*.js')))}")
print("Estrutura executiva, métricas, rankings, versão e smoke test estão consistentes.")
