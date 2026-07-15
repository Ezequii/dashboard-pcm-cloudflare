from pathlib import Path
import re, hashlib, sys
ROOT=Path(__file__).resolve().parents[2]
checks=[]
def ok(name, cond):
    checks.append((name,bool(cond)))
css=(ROOT/"static/styles_v994a7_1.css").read_text(encoding="utf-8")
bundle=(ROOT/"static/dashboard_phase1.css").read_text(encoding="utf-8")
html=(ROOT/"index.html").read_text(encoding="utf-8")
build=(ROOT/"tools/build_css_phase1.py").read_text(encoding="utf-8")
ok("arquivo_v994a7_1_existe", (ROOT/"static/styles_v994a7_1.css").exists())
ok("camada_incluida_no_build", "styles_v994a7_1.css" in build)
ok("camada_incluida_no_bundle", "SOURCE: styles_v994a7_1.css" in bundle)
ok("cache_versionado", "phase1-v994a7-1" in html)
ok("somente_um_css_ativo", len(re.findall(r'<link[^>]+rel=["\']stylesheet["\']',html,re.I))==1)
ok("sem_important", "!important" not in css)
ok("escopo_controlado", 150 <= len(css.splitlines()) <= 250)
ok("ranking_top3_refinado", all(x in css for x in ["ranking-row-v88:first-child","ranking-position-v88","ranking-progress-v88"]))
ok("tabela_40px", "height: 40px" in css and "row-hover" in css)
ok("acessibilidade_movimento", "prefers-reduced-motion" in css)
for name,result in checks:
    print(("OK" if result else "FALHA").ljust(7),name)
passed=sum(r for _,r in checks)
print(f"RESULTADO: {passed}/{len(checks)} verificações V994A7.1 aprovadas.")
sys.exit(0 if passed==len(checks) else 1)
