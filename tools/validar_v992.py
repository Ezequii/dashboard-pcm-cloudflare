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
css = (ROOT / "static/styles_v992_polished.css").read_text(encoding="utf-8")

if 'version: "99.2"' not in config or 'assetVersion: "992"' not in config:
    errors.append("app-config.js não identifica a V99.2.")

if 'String(config.assetVersion || "") !== "992"' not in core:
    errors.append("core.js não valida a versão 992.")

if "/static/styles_v992_polished.css?v=992" not in index:
    errors.append("A folha de polimento V99.2 não está carregada.")

if "v991-faithful" not in index:
    errors.append("A classe estrutural v991-faithful não está no body.")

if "v992-polished" not in index:
    errors.append("A classe de polimento v992-polished não está no body.")

required_scripts = [
    "app-config.js", "state.js", "utils.js", "api.js",
    "filters.js", "dashboard.js", "table.js", "core.js", "main.js"
]
positions = [index.find(f'/static/js/{name}?v=992') for name in required_scripts]
if not all(position >= 0 for position in positions):
    errors.append("Existem scripts sem versionamento 992.")
elif positions != sorted(positions):
    errors.append("A ordem dos scripts está incorreta.")

for selector in [
    ".executive-primary-v991",
    ".hero-metric-v991",
    ".operations-grid-v991",
    ".ranking-grid-v991",
    "@media (max-width:1400px)",
]:
    if selector not in css:
        errors.append(f"Regra de polimento ausente: {selector}")

required_ids = [
    "kValorPendente", "kPendencias", "kPctConcluido",
    "firstFocusV991", "processCards", "topPrioridades",
    "actionNowList", "ownersCriticos", "processCardsBase"
]
for element_id in required_ids:
    count = len(re.findall(rf'id="{re.escape(element_id)}"', index))
    if count != 1:
        errors.append(f"ID {element_id} aparece {count} vezes.")

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
        (ROOT / "tools/js_manifest_v992.json").read_text(encoding="utf-8")
    ).get("files", {})
    current = {
        path.name: hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted((ROOT / "static/js").glob("*.js"))
    }
    if current != expected:
        errors.append("Os scripts foram alterados após a validação.")

if errors:
    print("VALIDAÇÃO V99.2: FALHOU")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("VALIDAÇÃO V99.2: OK")
print("Polimento visual, responsividade e estados de interação confirmados.")
