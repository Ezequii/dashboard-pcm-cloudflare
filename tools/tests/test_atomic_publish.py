from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from services.atomic_publish import (  # noqa: E402
    AtomicPublishError,
    publish_atomically,
)


class AtomicPublishTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.backup = self.root / "backups/last-valid"
        self.reports = self.root / "reports"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def payloads(self, version: str, value: str = "new") -> dict:
        return {
            "static/data/executive-data.json": {
                "data_version": version,
                "rows": [{"value": value}],
            },
            "static/data/operational-data.json": {
                "data_version": version,
                "rows": [{"value": value}],
            },
            "static/data/publication-status.json": {
                "data_version": version,
                "status": "valid",
            },
            "static/data/version.json": {
                "v": version,
            },
        }

    def test_first_publication_creates_consistent_files(self) -> None:
        result = publish_atomically(
            root=self.root,
            payloads=self.payloads("100"),
            data_version="100",
            backup_dir=self.backup,
            report_dir=self.reports,
        )
        self.assertFalse(result.backup_created)
        self.assertEqual(
            json.loads(
                (self.root / "static/data/version.json").read_text()
            )["v"],
            "100",
        )

    def test_second_publication_creates_last_valid_backup(self) -> None:
        publish_atomically(
            root=self.root,
            payloads=self.payloads("100", "old"),
            data_version="100",
            backup_dir=self.backup,
            report_dir=self.reports,
        )
        result = publish_atomically(
            root=self.root,
            payloads=self.payloads("200", "new"),
            data_version="200",
            backup_dir=self.backup,
            report_dir=self.reports,
        )
        self.assertTrue(result.backup_created)
        backed_up = json.loads(
            (
                self.backup
                / "static/data/executive-data.json"
            ).read_text()
        )
        self.assertEqual(backed_up["data_version"], "100")

    def test_invalid_version_never_replaces_current_files(self) -> None:
        publish_atomically(
            root=self.root,
            payloads=self.payloads("100", "old"),
            data_version="100",
            backup_dir=self.backup,
            report_dir=self.reports,
        )
        invalid = self.payloads("200", "new")
        invalid["static/data/operational-data.json"]["data_version"] = "201"

        with self.assertRaises(AtomicPublishError):
            publish_atomically(
                root=self.root,
                payloads=invalid,
                data_version="200",
                backup_dir=self.backup,
                report_dir=self.reports,
            )

        current = json.loads(
            (
                self.root
                / "static/data/executive-data.json"
            ).read_text()
        )
        self.assertEqual(current["data_version"], "100")


if __name__ == "__main__":
    unittest.main()
