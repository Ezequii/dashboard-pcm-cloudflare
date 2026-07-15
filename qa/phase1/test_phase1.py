from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
index = (ROOT / "index.html").read_text(encoding="utf-8")
bundle = ROOT / "static" / "dashboard_phase1.css"
build = ROOT / "tools" / "build_css_phase1.py"

checks = {
    "bundle_existe": bundle.exists(),
    "build_existe": build.exists(),
    "uma_folha_ativa": len(re.findall(r'<link[^>]+rel="stylesheet"', index)) == 1,
    "bundle_ativo": '/static/dashboard_phase1.css?v=phase1' in index,
    "fontes_preservadas": all(
        marker in bundle.read_text(encoding="utf-8")
        for marker in (
            "SOURCE: styles_v50_corrigido.css",
            "SOURCE: styles_v994a6_clean_rankings.css",
        )
    ),
    "tokens_presentes": "--pcm-focus-ring" in bundle.read_text(encoding="utf-8"),
}

for name, passed in checks.items():
    print(("OK" if passed else "FALHA"), name)

failed = [name for name, passed in checks.items() if not passed]
if failed:
    raise SystemExit("Falhas: " + ", ".join(failed))

print(f"RESULTADO: {len(checks)}/{len(checks)} verificações da Fase 1 aprovadas.")
