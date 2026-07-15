from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Mapping


class AtomicPublishError(RuntimeError):
    """Raised when a safe publication cannot be completed."""


@dataclass(frozen=True)
class PublishedFile:
    relative_path: str
    sha256: str
    bytes_size: int


@dataclass(frozen=True)
class PublishResult:
    data_version: str
    files: tuple[PublishedFile, ...]
    backup_created: bool
    report_path: Path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_json_file(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise AtomicPublishError(f"JSON inválido em {path.name}: {exc}") from exc


def cross_validate_versions(files: Mapping[str, Path], version: str) -> None:
    for relative, path in files.items():
        if path.suffix.lower() != ".json":
            continue
        payload = validate_json_file(path)
        actual = str(payload.get("v") or payload.get("data_version") or "")
        if actual != str(version):
            raise AtomicPublishError(
                f"Versão divergente em {relative}: {actual or 'vazio'} != {version}."
            )


def build_manifest(files: Mapping[str, Path], version: str) -> dict[str, Any]:
    entries = []
    for relative, path in sorted(files.items()):
        entries.append(
            {
                "path": relative.replace("\\", "/"),
                "sha256": sha256_file(path),
                "bytes": path.stat().st_size,
            }
        )
    return {
        "data_version": str(version),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "files": entries,
    }


def backup_current_files(
    root: Path,
    relative_paths: list[str],
    backup_dir: Path,
) -> bool:
    existing = [
        (relative, root / relative)
        for relative in relative_paths
        if (root / relative).exists()
    ]
    if not existing:
        return False

    backup_dir.mkdir(parents=True, exist_ok=True)
    for child in backup_dir.iterdir():
        if child.is_file():
            child.unlink()
        elif child.is_dir():
            shutil.rmtree(child)

    for relative, source in existing:
        destination = backup_dir / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    manifest_files = {
        relative: backup_dir / relative
        for relative, _ in existing
        if (backup_dir / relative).exists()
    }
    version = ""
    version_path = backup_dir / "static/data/version.json"
    if version_path.exists():
        version_payload = validate_json_file(version_path)
        version = str(version_payload.get("v", ""))

    manifest = build_manifest(manifest_files, version)
    (backup_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return True


def publish_atomically(
    *,
    root: Path,
    payloads: Mapping[str, Any],
    data_version: str,
    backup_dir: Path,
    report_dir: Path,
    validators: Mapping[str, Callable[[Path], None]] | None = None,
    version_relative_path: str = "static/data/version.json",
) -> PublishResult:
    if not payloads:
        raise AtomicPublishError("Nenhum arquivo foi informado para publicação.")
    if version_relative_path not in payloads:
        raise AtomicPublishError("version.json deve fazer parte da publicação.")

    root = root.resolve()
    validators = validators or {}
    report_dir.mkdir(parents=True, exist_ok=True)

    ordered_paths = [
        path for path in payloads if path != version_relative_path
    ] + [version_relative_path]

    staging_parent = root / ".publication-staging"
    staging_parent.mkdir(parents=True, exist_ok=True)
    stage_root = Path(
        tempfile.mkdtemp(prefix="v994a-", dir=staging_parent)
    )

    try:
        staged_files: dict[str, Path] = {}
        for relative, payload in payloads.items():
            destination = stage_root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(
                json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
            validate_json_file(destination)
            validator = validators.get(relative)
            if validator:
                validator(destination)
            staged_files[relative] = destination

        cross_validate_versions(staged_files, str(data_version))

        backup_created = backup_current_files(
            root,
            list(payloads),
            backup_dir,
        )

        replaced: list[str] = []
        try:
            for relative in ordered_paths:
                source = staged_files[relative]
                destination = root / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                temporary = destination.with_suffix(destination.suffix + ".publishing")
                shutil.copy2(source, temporary)
                os.replace(temporary, destination)
                replaced.append(relative)
        except Exception as exc:
            if backup_created:
                for relative in replaced:
                    backup_source = backup_dir / relative
                    if backup_source.exists():
                        target = root / relative
                        target.parent.mkdir(parents=True, exist_ok=True)
                        rollback_temp = target.with_suffix(target.suffix + ".rollback")
                        shutil.copy2(backup_source, rollback_temp)
                        os.replace(rollback_temp, target)
            raise AtomicPublishError(
                f"Falha durante a troca atômica: {exc}"
            ) from exc

        final_files = {
            relative: root / relative
            for relative in payloads
        }
        cross_validate_versions(final_files, str(data_version))
        manifest = build_manifest(final_files, str(data_version))

        report = {
            "status": "published",
            "data_version": str(data_version),
            "published_at": datetime.now(timezone.utc).isoformat(),
            "backup_created": backup_created,
            "replacement_order": ordered_paths,
            "manifest": manifest,
        }
        report_path = report_dir / "publication-report.json"
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        files = tuple(
            PublishedFile(
                relative_path=item["path"],
                sha256=item["sha256"],
                bytes_size=item["bytes"],
            )
            for item in manifest["files"]
        )
        return PublishResult(
            data_version=str(data_version),
            files=files,
            backup_created=backup_created,
            report_path=report_path,
        )
    finally:
        shutil.rmtree(stage_root, ignore_errors=True)
