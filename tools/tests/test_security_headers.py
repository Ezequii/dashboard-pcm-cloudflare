from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class SecurityHeadersTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.headers = (ROOT / "_headers").read_text(encoding="utf-8")
        cls.not_found = (ROOT / "404.html").read_text(encoding="utf-8")

    def test_hsts_is_configured(self) -> None:
        self.assertIn("Strict-Transport-Security", self.headers)

    def test_csp_blocks_frames_and_inline_scripts(self) -> None:
        self.assertIn("frame-ancestors 'none'", self.headers)
        self.assertIn("script-src 'self';", self.headers)
        self.assertIn("style-src 'self';", self.headers)
        self.assertNotIn("'unsafe-inline'", self.headers)

    def test_data_files_are_no_store(self) -> None:
        self.assertIn("/static/data/*", self.headers)
        self.assertIn("no-cache, no-store, must-revalidate", self.headers)

    def test_404_has_no_inline_script_or_dashboard_copy(self) -> None:
        self.assertNotIn("<script", self.not_found.lower())
        self.assertNotIn("executive-primary", self.not_found)
        self.assertIn('http-equiv="refresh"', self.not_found)


if __name__ == "__main__":
    unittest.main()
