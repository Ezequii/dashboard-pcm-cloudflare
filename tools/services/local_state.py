from __future__ import annotations

import os
import re
from pathlib import Path


def _safe_name(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip())
    return normalized.strip("-") or "dashboard-pcm"


def local_state_root(project_root: Path) -> Path:
    """
    Return a non-public, non-repository directory for backups and reports.

    Priority:
    1. PCM_LOCAL_STATE_DIR override;
    2. Windows LOCALAPPDATA, outside OneDrive;
    3. XDG_STATE_HOME;
    4. ~/.local/state.
    """
    configured = os.environ.get("PCM_LOCAL_STATE_DIR", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()

    project_name = _safe_name(project_root.resolve().name)

    local_app_data = os.environ.get("LOCALAPPDATA", "").strip()
    if local_app_data:
        return (
            Path(local_app_data)
            / "AMAGGI"
            / "DashboardPCM"
            / project_name
        ).resolve()

    xdg_state = os.environ.get("XDG_STATE_HOME", "").strip()
    if xdg_state:
        return (
            Path(xdg_state)
            / "dashboard-pcm"
            / project_name
        ).expanduser().resolve()

    return (
        Path.home()
        / ".local"
        / "state"
        / "dashboard-pcm"
        / project_name
    ).resolve()


def legacy_local_state_root(project_root: Path) -> Path:
    """Location used before the OneDrive hotfix."""
    project_root = project_root.resolve()
    return project_root.parent / f"{project_root.name}_local_state"
