from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

index = (ROOT / "index.html").read_text(encoding="utf-8")
config = (ROOT / "static/js/app-config.js").read_text(encoding="utf-8")
headers = (ROOT / "_headers").read_text(encoding="utf-8")

required_scripts = [
    "app-config.js", "state.js", "utils.js", "api.js", "filters.js",
    "dashboard.js", "table.js", "core.js", "main.js"
]

positions = []
for name in required_scripts:
    marker = f'/static/js/{name}?v=971'
    position = index.find(marker)
    if position < 0:
        errors.append(f"Script ausente ou sem v=971: {name}")
    positions.append(position)

if all(position >= 0 for position in positions) and positions != sorted(positions):
    errors.append("A ordem dos scripts está incorreta.")

if positions and positions[0] >= 0:
    first_script = re.search(r'<script\s+src="([^"]+)"', index)
    if not first_script or "app-config.js?v=971" not in first_script.group(1):
        errors.append("app-config.js não é o primeiro script externo.")

if 'styles_v50_corrigido.css?v=971' not in index:
    errors.append("CSS não está versionado com v=971.")

if "window.BUSINESS_RULES" not in config:
    errors.append("BUSINESS_RULES não é publicado no objeto global.")

if "window.PCM_APP_CONFIG" not in config:
    errors.append("PCM_APP_CONFIG não é publicado no objeto global.")

for required_header in ["/index.html", "/static/data/version.json", "/static/data/dashboard-data.json"]:
    if required_header not in headers:
        errors.append(f"Cabeçalho de cache ausente: {required_header}")

for js_file in sorted((ROOT / "static/js").glob("*.js")):
    result = subprocess.run(
        ["node", "--check", str(js_file)],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        errors.append(f"JavaScript inválido em {js_file.name}: {result.stderr.strip()}")

if errors:
    print("VALIDAÇÃO V97.1: FALHOU")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("VALIDAÇÃO V97.1: OK")
print(f"Scripts verificados: {len(list((ROOT / 'static/js').glob('*.js')))}")
print("Cache, ordem dos módulos e configuração global estão consistentes.")
