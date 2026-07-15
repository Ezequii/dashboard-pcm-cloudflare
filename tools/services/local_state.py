from __future__ import annotations

import os
from pathlib import Path


def local_state_root(project_root: Path) -> Path:
    configured = os.environ.get("PCM_LOCAL_STATE_DIR", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    project_root = project_root.resolve()
    return project_root.parent / f"{project_root.name}_local_state"
