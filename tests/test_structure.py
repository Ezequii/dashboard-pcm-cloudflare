from __future__ import annotations

import json
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
JS_DIR = ROOT / "static" / "js"


def fail(message: str) -> None:
    raise AssertionError(message)


def test_files() -> None:
    required = [
        ROOT / "index.html",
        ROOT / "static" / "styles_v100.css",
        JS_DIR / "business-rules.js",
        JS_DIR / "state.js",
        JS_DIR / "utils.js",
        JS_DIR / "api.js",
        JS_DIR / "xlsx-export.js",
        JS_DIR / "filters.js",
        JS_DIR / "dashboard.js",
        JS_DIR / "table.js",
        JS_DIR / "core.js",
        JS_DIR / "main.js",
        ROOT / "tools" / "gerar_json_planilha.py",
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.exists()]
    if missing:
        fail(f"Arquivos ausentes: {missing}")


def test_js_syntax() -> None:
    for path in sorted(JS_DIR.glob("*.js")):
        result = subprocess.run(
            ["node", "--check", str(path)],
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode:
            fail(f"Erro de sintaxe em {path.name}: {result.stderr}")




def test_logic() -> None:
    result = subprocess.run(
        ["node", str(ROOT / "tests" / "test_logic.js")],
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode:
        fail(f"Falha nos testes lógicos: {result.stderr or result.stdout}")

def test_html_references() -> None:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    references = []
    for marker in ('src="/', 'href="/'):
        for chunk in html.split(marker)[1:]:
            references.append(chunk.split('"', 1)[0].split("?", 1)[0])
    missing = [ref for ref in references if not (ROOT / ref).exists()]
    if missing:
        fail(f"Referências HTML ausentes: {missing}")


def test_data_when_present() -> None:
    data_path = ROOT / "static" / "data" / "dashboard-data.json"
    if not data_path.exists():
        return
    payload = json.loads(data_path.read_text(encoding="utf-8"))
    if not isinstance(payload.get("rows"), list):
        fail("dashboard-data.json sem lista rows")
    if not payload.get("boot"):
        fail("dashboard-data.json sem boot")


def main() -> int:
    test_files()
    test_js_syntax()
    test_logic()
    test_html_references()
    test_data_when_present()
    print("V100: testes estruturais aprovados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
