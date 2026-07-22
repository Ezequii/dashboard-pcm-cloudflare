from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from services.local_state import local_state_root  # noqa: E402


class LocalStateTests(unittest.TestCase):
    def test_explicit_override_has_priority(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            configured = Path(temporary) / "custom"
            with patch.dict(
                os.environ,
                {"PCM_LOCAL_STATE_DIR": str(configured)},
                clear=False,
            ):
                result = local_state_root(
                    Path(temporary) / "project"
                )
            self.assertEqual(
                result,
                configured.resolve(),
            )

    def test_windows_default_uses_localappdata(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            project = (
                Path(temporary)
                / "OneDrive - Empresa"
                / "GitHub"
                / "dashboard-pcm-cloudflare"
            )
            local_app_data = Path(temporary) / "LocalAppData"

            environment = {
                "LOCALAPPDATA": str(local_app_data),
            }
            with patch.dict(
                os.environ,
                environment,
                clear=True,
            ):
                result = local_state_root(project)

            self.assertTrue(
                str(result).startswith(
                    str(local_app_data.resolve())
                )
            )
            self.assertNotIn(
                "OneDrive - Empresa",
                str(result),
            )
            self.assertIn(
                "dashboard-pcm-cloudflare",
                str(result),
            )


if __name__ == "__main__":
    unittest.main()
