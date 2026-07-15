from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
index = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "static/ui-v2.css").read_text(encoding="utf-8")
js = (ROOT / "static/js/ui-v2.js").read_text(encoding="utf-8")
components = list((ROOT / "static/ui-v2").glob("*.css"))

checks = {
    "ui_v2_loaded": "/static/dashboard_phase1.css?v=phase1-ui-v2" in index and "ui-v2" in index,
    "functional_scripts_preserved": all(name in index for name in [
        "api.js?v=9946", "dashboard.js?v=9946", "table.js?v=9946",
        "productivity-v99.js?v=9946", "main.js?v=9946"
    ]),
    "component_css_architecture": len(components) >= 9,
    "design_tokens": all(token in css for token in [
        "--ui-color-brand-700", "--ui-space-4", "--ui-radius-lg",
        "--ui-shadow-md", "--ui-font-sm", "--ui-container"
    ]),
    "density_modes": all(value in index + js + css for value in [
        "comfortable", "compact", "data-density"
    ]),
    "drawer_accordions": "detail-accordion-v2" in js and "MutationObserver" in js,
    "responsive_breakpoints": all(query in css for query in [
        "@media(max-width:1280px)", "@media(max-width:1024px)",
        "@media(max-width:768px)", "@media(max-width:520px)",
        "@media(min-width:1600px)"
    ]),
    "reduced_motion": "prefers-reduced-motion:reduce" in css,
    "focus_visible": ":focus-visible" in css,
    "no_api_contract_changes": "fetch(" not in js and "/api/" not in js,
}

for name, passed in checks.items():
    print(("OK" if passed else "FAIL"), name)

failed = [name for name, passed in checks.items() if not passed]
print(f"RESULTADO: {len(checks)-len(failed)}/{len(checks)} verificações aprovadas")
raise SystemExit(1 if failed else 0)
