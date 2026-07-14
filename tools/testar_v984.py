from __future__ import annotations

from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
DASHBOARD = (ROOT / "static/js/dashboard.js").read_text(encoding="utf-8")
CLEAN_CSS = (ROOT / "static/styles_v984_clean.css").read_text(encoding="utf-8")
LEGACY_CSS = (ROOT / "static/styles_v50_corrigido.css").read_text(encoding="utf-8")
CONFIG = (ROOT / "static/js/app-config.js").read_text(encoding="utf-8")
CORE = (ROOT / "static/js/core.js").read_text(encoding="utf-8")

results = []

def check(name: str, condition: bool, detail: str) -> None:
    results.append({
        "name": name,
        "passed": bool(condition),
        "detail": detail,
    })

# 1. Versão única dos assets.
check(
    "01_versionamento_unico",
    'version: "98.4"' in CONFIG
    and 'assetVersion: "984"' in CONFIG
    and 'String(config.assetVersion || "") !== "984"' in CORE
    and "?v=984" in INDEX
    and "?v=983" not in INDEX,
    "Configuração, HTML e proteção de runtime devem usar exclusivamente a versão 984.",
)

# 2. Ordem correta dos scripts.
required_scripts = [
    "app-config.js", "state.js", "utils.js", "api.js",
    "filters.js", "dashboard.js", "table.js", "core.js", "main.js",
]
positions = [INDEX.find(f'/static/js/{name}?v=984') for name in required_scripts]
check(
    "02_ordem_dos_scripts",
    all(position >= 0 for position in positions) and positions == sorted(positions),
    "app-config deve carregar primeiro e main.js deve carregar por último.",
)

# 3. IDs essenciais únicos.
required_ids = [
    "kValorPendente", "kPendencias", "kPctConcluido",
    "firstFocusV984", "completionProgressV984",
    "kValorForaSla", "kFarolStatus", "kMaiorAtraso",
    "processCards", "topPrioridades", "actionNowList",
    "ownersCriticos", "processCardsBase",
]
id_counts = {
    element_id: len(re.findall(rf'id="{re.escape(element_id)}"', INDEX))
    for element_id in required_ids
}
check(
    "03_ids_unicos",
    all(count == 1 for count in id_counts.values()),
    f"Contagens: {id_counts}",
)

# 4. Apenas uma rota de renderização.
check(
    "04_renderizacao_unica",
    "previousRenderDashboardDataV983" not in DASHBOARD
    and "previousRenderDashboardDataV982" not in DASHBOARD
    and "window.renderDashboardData =" not in DASHBOARD
    and DASHBOARD.count("renderExecutiveV984(data);") == 1
    and DASHBOARD.count("renderBaseV984(data);") == 1,
    "A V98.4 não pode renderizar primeiro a V98.2/V98.3 e depois substituir o conteúdo.",
)

# 5. Componentes V98.4 presentes.
required_functions = [
    "renderPrimaryV984",
    "renderProcessFlowV984",
    "renderPrioritiesV984",
    "renderRankingTableV984",
    "renderExecutiveV984",
    "renderBaseV984",
]
check(
    "05_componentes_v984",
    all(function_name in DASHBOARD for function_name in required_functions),
    "Todos os renderizadores consolidados devem existir.",
)

# 6. Folha consolidada carregada depois da folha compartilhada.
legacy_position = INDEX.find("/static/styles_v50_corrigido.css?v=984")
clean_position = INDEX.find("/static/styles_v984_clean.css?v=984")
check(
    "06_css_consolidado",
    legacy_position >= 0
    and clean_position > legacy_position
    and ".executive-primary-v984" in CLEAN_CSS,
    "A folha V98.4 deve ser carregada por último e controlar a interface atual.",
)

# 7. Fluxo responsivo sem largura fixa por etapa.
check(
    "07_fluxo_responsivo",
    ".process-flow-v984::before" in CLEAN_CSS
    and "calc(100% + 150px)" not in CLEAN_CSS
    and "process-node-v984 b" not in CLEAN_CSS,
    "A linha deve pertencer ao contêiner, sem cálculos fixos em cada etapa.",
)

# 8. Body sem dezenas de versões históricas.
body_match = re.search(r'<body class="([^"]+)"', INDEX)
body_classes = body_match.group(1).split() if body_match else []
check(
    "08_body_reduzido",
    1 <= len(body_classes) <= 10
    and "v984-consolidated" in body_classes,
    f"Classes atuais: {body_classes}",
)

# 9. Base de Tratativa compacta.
check(
    "09_base_compacta",
    ".base-stage-strip-v984" in CLEAN_CSS
    and "min-height:50px" in CLEAN_CSS
    and ".base-overview-v984" in CLEAN_CSS
    and 'id="processCardsBase"' in INDEX,
    "A faixa de etapas da Base deve permanecer compacta antes da tabela.",
)

# 10. Sintaxe JavaScript ou integridade criptográfica.
node = shutil.which("node")
syntax_ok = True
syntax_detail = ""
if node:
    failures = []
    for js_file in sorted((ROOT / "static/js").glob("*.js")):
        result = subprocess.run(
            [node, "--check", str(js_file)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            failures.append(f"{js_file.name}: {result.stderr.strip()}")
    syntax_ok = not failures
    syntax_detail = "Node.js executou a validação de sintaxe." if syntax_ok else "; ".join(failures)
else:
    manifest_path = ROOT / "tools/js_manifest_v984.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected = manifest.get("files", {})
    current = {
        path.name: hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted((ROOT / "static/js").glob("*.js"))
    }
    syntax_ok = current == expected
    syntax_detail = "Node.js ausente; integridade dos scripts confirmada por SHA-256."

check(
    "10_javascript_integro",
    syntax_ok,
    syntax_detail,
)

failed = [result for result in results if not result["passed"]]

print("MATRIZ AUTOMATIZADA V98.4")
print("=" * 64)
for index, result in enumerate(results, start=1):
    status = "OK" if result["passed"] else "FALHOU"
    print(f"{index:02d}. {status:6} | {result['name']}")
    print(f"    {result['detail']}")

output_path = ROOT / "qa" / "v98_4" / "resultados_estruturais.json"
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(
    json.dumps(results, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print()
print(f"RESULTADO: {len(results) - len(failed)}/{len(results)} testes aprovados.")

if failed:
    sys.exit(1)
