from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
STATIC = ROOT / "static"
CSS = (STATIC / "styles_v994a7_1a.css").read_text(encoding="utf-8")
BUNDLE = (STATIC / "dashboard_phase1.css").read_text(encoding="utf-8")
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
BUILD = (ROOT / "tools" / "build_css_phase1.py").read_text(encoding="utf-8")

checks = {
    "arquivo_hotfix_existe": (STATIC / "styles_v994a7_1a.css").exists(),
    "hotfix_no_build": "styles_v994a7_1a.css" in BUILD,
    "hotfix_no_bundle": "SOURCE: styles_v994a7_1a.css" in BUNDLE,
    "cache_versionado": "phase1-v994a7-1a" in INDEX,
    "somente_um_css_ativo": len(re.findall(r'<link[^>]+rel=["\']stylesheet["\']', INDEX, re.I)) == 1,
    "sem_important": "!important" not in CSS,
    "lider_destacado": ".ranking-row-v88:first-child" in CSS and "inset 4px 0 0" in CSS,
    "marcadores_reforcados": ":nth-child(2)" in CSS and ":nth-child(3)" in CSS,
    "barras_6px": ".ranking-track-v88" in CSS and "height: 6px" in CSS,
    "footer_reduzido": ".footer-credit" in CSS and "opacity: 0.88" in CSS,
    "movimento_reduzido": "prefers-reduced-motion" in CSS,
}

passed = 0
for name, ok in checks.items():
    print(("OK      " if ok else "FALHA   ") + name)
    passed += int(ok)

print(f"RESULTADO: {passed}/{len(checks)} verificações V994A7.1a aprovadas.")
raise SystemExit(0 if passed == len(checks) else 1)
