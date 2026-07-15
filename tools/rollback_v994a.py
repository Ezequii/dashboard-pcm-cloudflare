from __future__ import annotations

import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
sys.path.insert(0, str(TOOLS))

from services.atomic_publish import (  # noqa: E402
    AtomicPublishError,
    cross_validate_versions,
    sha256_file,
)
from services.local_state import local_state_root  # noqa: E402

LOCAL_STATE = local_state_root(ROOT)
BACKUP_DIR = LOCAL_STATE / "last-valid"
PRE_ROLLBACK_ROOT = LOCAL_STATE / "pre-rollback"
REPORTS_DIR = LOCAL_STATE / "reports"

RELATIVE_FILES = [
    "static/data/executive-data.json",
    "static/data/operational-data.json",
    "static/data/publication-status.json",
    "static/data/version.json",
]


def load_manifest() -> dict:
    path = BACKUP_DIR / "manifest.json"
    if not path.exists():
        raise AtomicPublishError("O backup não contém manifest.json.")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload.get("files"), list):
        raise AtomicPublishError("O manifesto do backup é inválido.")
    return payload


def validate_backup(manifest: dict) -> str:
    expected = {
        item["path"]: item
        for item in manifest.get("files", [])
        if isinstance(item, dict) and item.get("path")
    }

    missing = [
        relative
        for relative in RELATIVE_FILES
        if not (BACKUP_DIR / relative).exists()
    ]
    if missing:
        raise AtomicPublishError(
            "Backup incompleto: " + ", ".join(missing)
        )

    for relative in RELATIVE_FILES:
        path = BACKUP_DIR / relative
        manifest_item = expected.get(relative)
        if manifest_item and manifest_item.get("sha256"):
            actual = sha256_file(path)
            if actual != manifest_item["sha256"]:
                raise AtomicPublishError(
                    f"Hash divergente no backup: {relative}."
                )

    version_payload = json.loads(
        (BACKUP_DIR / "static/data/version.json").read_text(encoding="utf-8")
    )
    version = str(version_payload.get("v", ""))
    if not version:
        raise AtomicPublishError("O backup não informa a versão.")

    files = {
        relative: BACKUP_DIR / relative
        for relative in RELATIVE_FILES
    }
    cross_validate_versions(files, version)
    return version


def save_current_state() -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    destination = PRE_ROLLBACK_ROOT / stamp
    copied = False

    for relative in RELATIVE_FILES:
        source = ROOT / relative
        if not source.exists():
            continue
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied = True

    if copied:
        return destination
    return Path()


def restore_backup(version: str) -> None:
    ordered = [
        relative
        for relative in RELATIVE_FILES
        if relative != "static/data/version.json"
    ] + ["static/data/version.json"]

    for relative in ordered:
        source = BACKUP_DIR / relative
        destination = ROOT / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(
            destination.suffix + ".rollback"
        )
        shutil.copy2(source, temporary)
        os.replace(temporary, destination)

    final_files = {
        relative: ROOT / relative
        for relative in RELATIVE_FILES
    }
    cross_validate_versions(final_files, version)


def main() -> int:
    try:
        manifest = load_manifest()
        version = validate_backup(manifest)
        pre_rollback = save_current_state()
        restore_backup(version)

        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        report = {
            "status": "rollback-completed",
            "restored_version": version,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "previous_state_backup": str(
                pre_rollback
            ) if pre_rollback else "",
        }
        (REPORTS_DIR / "rollback-report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        print("ROLLBACK V99.4A.2: OK")
        print(f"Versão restaurada: {version}")
        if pre_rollback:
            print(
                "Estado anterior guardado em: "
                f"{pre_rollback}"
            )
        return 0
    except Exception as exc:
        print(f"ROLLBACK V99.4A.2: FALHOU — {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
