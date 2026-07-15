from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
import time
import uuid
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
    backup_snapshot: Path | None = None


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
        raise AtomicPublishError(
            f"JSON inválido em {path.name}: {exc}"
        ) from exc


def cross_validate_versions(
    files: Mapping[str, Path],
    version: str,
) -> None:
    for relative, path in files.items():
        if path.suffix.lower() != ".json":
            continue
        payload = validate_json_file(path)
        actual = str(
            payload.get("v")
            or payload.get("data_version")
            or ""
        )
        if actual != str(version):
            raise AtomicPublishError(
                f"Versão divergente em {relative}: "
                f"{actual or 'vazio'} != {version}."
            )


def build_manifest(
    files: Mapping[str, Path],
    version: str,
) -> dict[str, Any]:
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


def _replace_with_retry(
    source: Path,
    destination: Path,
    *,
    attempts: int = 8,
    delay_seconds: float = 0.20,
) -> None:
    """
    Replace one file without deleting its parent directory.

    OneDrive and antivirus software can hold short-lived handles on files.
    Retrying the single-file replace is safer than recursively deleting the
    complete backup directory.
    """
    destination.parent.mkdir(parents=True, exist_ok=True)
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            os.replace(source, destination)
            return
        except PermissionError as exc:
            last_error = exc
            if attempt >= attempts:
                break
            time.sleep(delay_seconds * attempt)
        except OSError as exc:
            last_error = exc
            if attempt >= attempts:
                break
            time.sleep(delay_seconds * attempt)

    raise AtomicPublishError(
        f"Não foi possível substituir {destination} após "
        f"{attempts} tentativas: {last_error}"
    ) from last_error


def copy_file_atomically(
    source: Path,
    destination: Path,
    *,
    suffix: str,
) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(
        f".{destination.name}.{suffix}.{uuid.uuid4().hex}.tmp"
    )
    try:
        shutil.copy2(source, temporary)
        _replace_with_retry(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def _atomic_write_json(
    path: Path,
    payload: Any,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(
        f".{path.name}.{uuid.uuid4().hex}.tmp"
    )
    try:
        temporary.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        validate_json_file(temporary)
        _replace_with_retry(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def _state_root_from_backup_dir(backup_dir: Path) -> Path:
    """
    `backup_dir` is kept in the public API for backwards compatibility.

    New snapshots live in sibling folders and never require deleting the
    legacy `last-valid` tree.
    """
    return backup_dir.resolve().parent


def _snapshot_name(version: str) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    safe_version = "".join(
        character
        for character in str(version)
        if character.isalnum() or character in {"-", "_", "."}
    ) or "unknown"
    return f"{safe_version}-{stamp}-{uuid.uuid4().hex[:8]}"


def _validate_snapshot(
    snapshot_dir: Path,
    relative_paths: list[str],
    version: str,
) -> dict[str, Any]:
    files = {
        relative: snapshot_dir / relative
        for relative in relative_paths
    }

    missing = [
        relative
        for relative, path in files.items()
        if not path.exists()
    ]
    if missing:
        raise AtomicPublishError(
            "Snapshot incompleto: " + ", ".join(missing)
        )

    cross_validate_versions(files, version)
    manifest = build_manifest(files, version)
    manifest["status"] = "complete"
    manifest["snapshot"] = snapshot_dir.name
    return manifest


def backup_current_files(
    root: Path,
    relative_paths: list[str],
    backup_dir: Path,
) -> Path | None:
    """
    Create an immutable versioned snapshot of the current publication.

    No existing backup directory is removed or emptied. This avoids WinError 5
    when the project lives inside OneDrive, SharePoint or an antivirus-monitored
    folder.
    """
    existing = [
        (relative, root / relative)
        for relative in relative_paths
        if (root / relative).exists()
    ]
    if not existing:
        return None

    missing_current = [
        relative
        for relative in relative_paths
        if not (root / relative).exists()
    ]
    if missing_current:
        raise AtomicPublishError(
            "A publicação atual está incompleta e não pode virar backup: "
            + ", ".join(missing_current)
        )

    version_path = root / "static/data/version.json"
    if not version_path.exists():
        raise AtomicPublishError(
            "A publicação atual não contém static/data/version.json."
        )

    version_payload = validate_json_file(version_path)
    version = str(version_payload.get("v", ""))
    if not version:
        raise AtomicPublishError(
            "A publicação atual não informa uma versão válida."
        )

    state_root = _state_root_from_backup_dir(backup_dir)
    snapshots_dir = state_root / "snapshots"
    snapshots_dir.mkdir(parents=True, exist_ok=True)

    snapshot_dir = snapshots_dir / _snapshot_name(version)
    snapshot_dir.mkdir(parents=True, exist_ok=False)

    try:
        for relative, source in existing:
            destination = snapshot_dir / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)

        manifest = _validate_snapshot(
            snapshot_dir,
            [relative for relative, _ in existing],
            version,
        )
        manifest_path = snapshot_dir / "manifest.json"
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        validate_json_file(manifest_path)

        pointer = {
            "status": "valid",
            "data_version": version,
            "snapshot": snapshot_dir.name,
            "snapshot_path": str(snapshot_dir),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "manifest_sha256": sha256_file(manifest_path),
        }
        _atomic_write_json(
            state_root / "last-valid-pointer.json",
            pointer,
        )
        return snapshot_dir
    except Exception:
        # A partial unique snapshot is harmless because the pointer is updated
        # only after validation. Cleanup is best-effort and never masks the
        # original error.
        shutil.rmtree(snapshot_dir, ignore_errors=True)
        raise


def resolve_last_valid_snapshot(
    backup_dir: Path,
) -> Path:
    """
    Resolve the current immutable snapshot.

    Legacy `last-valid/manifest.json` remains supported so older installations
    can still roll back after receiving this hotfix.
    """
    state_root = _state_root_from_backup_dir(backup_dir)
    pointer_path = state_root / "last-valid-pointer.json"

    if pointer_path.exists():
        pointer = validate_json_file(pointer_path)
        snapshot_path = Path(
            str(pointer.get("snapshot_path", ""))
        ).expanduser()

        if not snapshot_path.is_absolute():
            snapshot_path = (
                state_root
                / "snapshots"
                / str(pointer.get("snapshot", ""))
            )

        manifest_path = snapshot_path / "manifest.json"
        if snapshot_path.exists() and manifest_path.exists():
            expected_hash = str(
                pointer.get("manifest_sha256", "")
            )
            if (
                expected_hash
                and sha256_file(manifest_path) != expected_hash
            ):
                raise AtomicPublishError(
                    "O manifesto do último snapshot válido foi alterado."
                )
            return snapshot_path

        raise AtomicPublishError(
            "O ponteiro do último backup aponta para um snapshot inexistente."
        )

    legacy_manifest = backup_dir / "manifest.json"
    if legacy_manifest.exists():
        return backup_dir

    raise AtomicPublishError(
        "Nenhum snapshot válido foi encontrado para rollback."
    )


def _restore_from_snapshot(
    *,
    root: Path,
    snapshot_dir: Path,
    relative_paths: list[str],
) -> None:
    ordered = [
        relative
        for relative in relative_paths
        if relative != "static/data/version.json"
    ]
    if "static/data/version.json" in relative_paths:
        ordered.append("static/data/version.json")

    for relative in ordered:
        source = snapshot_dir / relative
        if not source.exists():
            raise AtomicPublishError(
                f"O snapshot não contém {relative}."
            )
        destination = root / relative
        copy_file_atomically(
            source,
            destination,
            suffix="restore",
        )


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
        raise AtomicPublishError(
            "Nenhum arquivo foi informado para publicação."
        )
    if version_relative_path not in payloads:
        raise AtomicPublishError(
            "version.json deve fazer parte da publicação."
        )

    root = root.resolve()
    backup_dir = backup_dir.resolve()
    validators = validators or {}
    report_dir.mkdir(parents=True, exist_ok=True)

    ordered_paths = [
        path
        for path in payloads
        if path != version_relative_path
    ] + [version_relative_path]

    state_root = _state_root_from_backup_dir(backup_dir)
    staging_parent = state_root / "staging"
    staging_parent.mkdir(parents=True, exist_ok=True)
    stage_root = Path(
        tempfile.mkdtemp(
            prefix="publish-",
            dir=staging_parent,
        )
    )

    backup_snapshot: Path | None = None

    try:
        staged_files: dict[str, Path] = {}
        for relative, payload in payloads.items():
            destination = stage_root / relative
            destination.parent.mkdir(
                parents=True,
                exist_ok=True,
            )
            destination.write_text(
                json.dumps(
                    payload,
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
                encoding="utf-8",
            )
            validate_json_file(destination)
            validator = validators.get(relative)
            if validator:
                validator(destination)
            staged_files[relative] = destination

        cross_validate_versions(
            staged_files,
            str(data_version),
        )

        backup_snapshot = backup_current_files(
            root,
            list(payloads),
            backup_dir,
        )
        backup_created = backup_snapshot is not None

        replaced: list[str] = []
        try:
            for relative in ordered_paths:
                source = staged_files[relative]
                destination = root / relative
                copy_file_atomically(
                    source,
                    destination,
                    suffix="publishing",
                )
                replaced.append(relative)
        except Exception as exc:
            if backup_snapshot is not None:
                try:
                    _restore_from_snapshot(
                        root=root,
                        snapshot_dir=backup_snapshot,
                        relative_paths=replaced,
                    )
                except Exception as rollback_exc:
                    raise AtomicPublishError(
                        "Falha durante a publicação e também ao restaurar "
                        f"o snapshot {backup_snapshot}: {rollback_exc}"
                    ) from exc
            else:
                for relative in replaced:
                    try:
                        (root / relative).unlink(missing_ok=True)
                    except OSError:
                        pass
            raise AtomicPublishError(
                f"Falha durante a troca atômica: {exc}"
            ) from exc

        final_files = {
            relative: root / relative
            for relative in payloads
        }
        cross_validate_versions(
            final_files,
            str(data_version),
        )
        manifest = build_manifest(
            final_files,
            str(data_version),
        )

        report = {
            "status": "published",
            "data_version": str(data_version),
            "published_at": datetime.now(timezone.utc).isoformat(),
            "backup_created": backup_created,
            "backup_snapshot": (
                str(backup_snapshot)
                if backup_snapshot is not None
                else ""
            ),
            "replacement_order": ordered_paths,
            "manifest": manifest,
        }
        report_path = report_dir / "publication-report.json"
        _atomic_write_json(report_path, report)

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
            backup_snapshot=backup_snapshot,
        )
    finally:
        # Cleanup is deliberately best-effort. A locked temporary folder never
        # invalidates a successfully published or preserved data version.
        shutil.rmtree(stage_root, ignore_errors=True)
