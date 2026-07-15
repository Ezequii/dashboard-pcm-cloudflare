from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"
SOURCES = ['styles_v50_corrigido.css', 'styles_v991_faithful.css', 'styles_v992_polished.css', 'styles_v99_productivity.css', 'styles_v994a_hardening.css', 'styles_v994a2_audit.css', 'styles_v994a2_visual.css', 'styles_v994a3_operational_fix.css', 'styles_v994a4_top_base_flow.css', 'styles_v994a5_lapidacao.css', 'styles_v994a6_clean_rankings.css']

header = """/* Dashboard PCM — bundle consolidado da Fase 1
 * Gerado por tools/build_css_phase1.py.
 * Não editar diretamente; altere os arquivos-fonte e gere novamente.
 */
"""

tokens = (STATIC / "tokens_phase1.css").read_text(encoding="utf-8")
parts = [header, tokens]

for source in SOURCES:
    content = (STATIC / source).read_text(encoding="utf-8-sig")
    parts.append(f"\n/* ===== SOURCE: {source} ===== */\n{content}\n")

output = STATIC / "dashboard_phase1.css"
output.write_text("".join(parts), encoding="utf-8")
print(f"CSS consolidado gerado: {output}")
