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
css = (ROOT / "static/styles_v985_integrated.css").read_text(encoding="utf-8")

if 'version: "98.5"' not in config or 'assetVersion: "985"' not in config:
    errors.append("app-config.js não identifica a V98.5.")

if 'String(config.assetVersion || "") !== "985"' not in core:
    errors.append("core.js não valida a versão 985.")

if "/static/styles_v985_integrated.css?v=985" not in index:
    errors.append("A folha integrada V98.5 não está carregada.")

required_scripts = [
    "app-config.js", "state.js", "utils.js", "api.js",
    "filters.js", "dashboard.js", "table.js", "core.js", "main.js"
]
positions = [index.find(f'/static/js/{name}?v=985') for name in required_scripts]
if not all(position >= 0 for position in positions):
    errors.append("Existem scripts sem versionamento 985.")
elif positions != sorted(positions):
    errors.append("A ordem dos scripts está incorreta.")

body_match = re.search(r'<body class="([^"]+)"', index)
body_classes = body_match.group(1).split() if body_match else []
if len(body_classes) > 10 or "v985-integrated" not in body_classes:
    errors.append(f"Classes do body inadequadas: {body_classes}")

if "originalRenderDashboardDataV982" in dashboard:
    errors.append("A renderização duplicada da V98.2 ainda existe.")

if "window.renderDashboardData =" in dashboard:
    errors.append("dashboard.js ainda sobrescreve renderDashboardData.")

for function_name in [
    "renderExecutiveV985",
    "renderBaseV985",
    "renderOverviewV982",
    "renderProcessV982",
    "renderPrioritiesV982",
]:
    if function_name not in dashboard:
        errors.append(f"Função ausente: {function_name}")

required_ids = [
    "summaryContextV982", "quickCompletionV982", "quickPendingV982",
    "quickPcmV982", "quickCriticalV982", "firstFocusV982",
    "kValorPendente", "kPendencias", "kPctConcluido",
    "kMaiorAtraso", "kValorForaSla", "kFarolStatus",
    "processCards", "topPrioridades", "actionNowList",
    "ownersCriticos", "processCardsBase", "baseOverviewHintV985",
]
for element_id in required_ids:
    count = len(re.findall(rf'id="{re.escape(element_id)}"', index))
    if count != 1:
        errors.append(f"ID {element_id} aparece {count} vezes.")

for token in [
    "#processCards.process-grid-v982",
    "grid-template-columns:repeat(2,minmax(0,1fr))!important",
    "#processCardsBase.base-stage-strip-v985",
    ".base-overview-v985",
]:
    if token not in css:
        errors.append(f"Regra CSS ausente: {token}")

node = shutil.which("node")
if node:
    for js_file in sorted((ROOT / "static/js").glob("*.js")):
        result = subprocess.run(
            [node, "--check", str(js_file)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            errors.append(f"JavaScript inválido em {js_file.name}: {result.stderr.strip()}")
else:
    expected = json.loads(
        (ROOT / "tools/js_manifest_v985.json").read_text(encoding="utf-8")
    ).get("files", {})
    current = {
        path.name: hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted((ROOT / "static/js").glob("*.js"))
    }
    if current != expected:
        errors.append("Os scripts foram alterados após a validação.")

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
    print("VALIDAÇÃO V98.5: FALHOU")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("VALIDAÇÃO V98.5: OK")
print(f"Scripts verificados: {len(list((ROOT / 'static/js').glob('*.js')))}")
print(f"Classes no body: {len(body_classes)}")
print("Visual V98.2 preservado; estabilidade V98.4 integrada.")
