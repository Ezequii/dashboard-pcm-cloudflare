#!/usr/bin/env python3
"""Monta o diretório mínimo e auditável publicado pelo Wrangler."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "dist"

ROOT_FILES = ("index.html", "404.html", "_headers")
STATIC_PATTERNS = (
    "*.css",
    "js/*.js",
    "config/*.json",
    "data/executive-data.json",
    "data/operational-data.json",
    "data/version.json",
    "data/publication-status.json",
)


def build_dist(output: Path = DEFAULT_OUTPUT) -> list[Path]:
    output = output.resolve()
    if output == ROOT or ROOT not in output.parents:
        raise ValueError(
            "O diretório de saída deve ser um subdiretório do projeto."
        )

    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    copied: list[Path] = []
    for relative in ROOT_FILES:
        source = ROOT / relative
        if not source.is_file():
            raise FileNotFoundError(f"Artefato obrigatório ausente: {relative}")
        destination = output / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        copied.append(destination)

    static_root = ROOT / "static"
    for pattern in STATIC_PATTERNS:
        matches = sorted(static_root.glob(pattern))
        if not matches:
            raise FileNotFoundError(f"Nenhum artefato encontrado para: static/{pattern}")
        for source in matches:
            if not source.is_file():
                continue
            relative = source.relative_to(ROOT)
            destination = output / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
            copied.append(destination)

    forbidden_suffixes = {".py", ".xlsx", ".xls", ".xlsm", ".md", ".bat", ".cmd"}
    forbidden = [
        path for path in output.rglob("*")
        if path.is_file() and path.suffix.lower() in forbidden_suffixes
    ]
    if forbidden:
        names = ", ".join(str(path.relative_to(output)) for path in forbidden)
        raise RuntimeError(f"Arquivos proibidos no pacote publicável: {names}")

    return copied


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    copied = build_dist(args.output)
    print(f"dist criado com {len(copied)} arquivos em {args.output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
