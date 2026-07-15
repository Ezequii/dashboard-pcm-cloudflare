from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
index = (ROOT / "index.html").read_text(encoding="utf-8")
dashboard = (ROOT / "static/js/dashboard.js").read_text(encoding="utf-8")
css = (ROOT / "static/styles_v985_integrated.css").read_text(encoding="utf-8")

tests = []

def check(name, condition, detail):
    tests.append((name, bool(condition), detail))

check(
    "visual_v982_preservado",
    all(token in index for token in [
        "executive-overview-v982",
        "kpis-v982",
        "cockpit-grid-v982",
        "rankings-v982",
    ]),
    "Resumo, KPIs, etapas 2x2, fila e rankings seguem a composição V98.2.",
)

check(
    "renderizacao_unica",
    "originalRenderDashboardDataV982" not in dashboard
    and "window.renderDashboardData =" not in dashboard
    and dashboard.count("window.renderExecutiveV985?.(data);") == 1,
    "A interface executiva é renderizada uma única vez.",
)

check(
    "etapas_2x2",
    "#processCards.process-grid-v982" in css
    and "grid-template-columns:repeat(2,minmax(0,1fr))!important" in css,
    "As quatro etapas permanecem em grade 2x2.",
)

check(
    "base_compacta",
    "base-overview-v985" in index
    and "base-stage-strip-v985" in index
    and "#processCardsBase.base-stage-strip-v985" in css,
    "A Base usa cabeçalho e faixa de etapas compactos.",
)

check(
    "body_reduzido",
    len(re.search(r'<body class="([^"]+)"', index).group(1).split()) <= 10,
    "As classes históricas do body foram reduzidas.",
)

check(
    "cache_985",
    "?v=985" in index and "?v=982" not in index,
    "Todos os assets usam a mesma versão de cache.",
)

failed = [item for item in tests if not item[1]]

for name, passed, detail in tests:
    print(("OK" if passed else "FALHOU"), name, "-", detail)

print(f"RESULTADO: {len(tests)-len(failed)}/{len(tests)} testes aprovados.")

if failed:
    sys.exit(1)
