from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from services.atomic_publish import (  # noqa: E402
    AtomicPublishError,
    publish_atomically,
    resolve_last_valid_snapshot,
)


class AtomicPublishTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "project"
        self.root.mkdir(parents=True)
        self.state = Path(self.temp.name) / "local-state"
        self.backup = self.state / "last-valid"
        self.reports = self.state / "reports"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def payloads(
        self,
        version: str,
        value: str = "new",
    ) -> dict:
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

    def publish(
        self,
        version: str,
        value: str = "new",
    ):
        return publish_atomically(
            root=self.root,
            payloads=self.payloads(version, value),
            data_version=version,
            backup_dir=self.backup,
            report_dir=self.reports,
        )

    def test_first_publication_creates_consistent_files(self) -> None:
        result = self.publish("100")
        self.assertFalse(result.backup_created)
        self.assertIsNone(result.backup_snapshot)
        self.assertEqual(
            json.loads(
                (
                    self.root
                    / "static/data/version.json"
                ).read_text()
            )["v"],
            "100",
        )

    def test_second_publication_creates_immutable_snapshot(self) -> None:
        self.publish("100", "old")
        result = self.publish("200", "new")

        self.assertTrue(result.backup_created)
        self.assertIsNotNone(result.backup_snapshot)

        snapshot = resolve_last_valid_snapshot(self.backup)
        backed_up = json.loads(
            (
                snapshot
                / "static/data/executive-data.json"
            ).read_text()
        )
        self.assertEqual(backed_up["data_version"], "100")
        self.assertEqual(backed_up["rows"][0]["value"], "old")

        pointer = json.loads(
            (
                self.state
                / "last-valid-pointer.json"
            ).read_text()
        )
        self.assertEqual(pointer["data_version"], "100")
        self.assertEqual(
            Path(pointer["snapshot_path"]).resolve(),
            snapshot.resolve(),
        )

    def test_invalid_version_never_replaces_current_files(self) -> None:
        self.publish("100", "old")
        invalid = self.payloads("200", "new")
        invalid[
            "static/data/operational-data.json"
        ]["data_version"] = "201"

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
        self.assertFalse(
            (self.state / "last-valid-pointer.json").exists()
        )


    def test_incomplete_current_publication_is_rejected(self) -> None:
        version_path = self.root / "static/data/version.json"
        version_path.parent.mkdir(parents=True, exist_ok=True)
        version_path.write_text(
            json.dumps({"v": "100"}),
            encoding="utf-8",
        )

        with self.assertRaises(AtomicPublishError):
            self.publish("200", "new")

        self.assertEqual(
            json.loads(version_path.read_text())["v"],
            "100",
        )
        self.assertFalse(
            (
                self.root
                / "static/data/executive-data.json"
            ).exists()
        )


    def test_locked_legacy_last_valid_folder_is_not_deleted(self) -> None:
        legacy_file = (
            self.backup
            / "static/data/locked-by-onedrive.txt"
        )
        legacy_file.parent.mkdir(parents=True, exist_ok=True)
        legacy_file.write_text("não apagar", encoding="utf-8")

        original_rmtree = shutil.rmtree

        def guarded_rmtree(path, *args, **kwargs):
            candidate = Path(path).resolve()
            if candidate == self.backup.resolve():
                raise PermissionError(
                    "[WinError 5] Acesso negado pelo OneDrive"
                )
            return original_rmtree(path, *args, **kwargs)

        with patch(
            "services.atomic_publish.shutil.rmtree",
            side_effect=guarded_rmtree,
        ):
            self.publish("100", "old")
            result = self.publish("200", "new")

        self.assertTrue(result.backup_created)
        self.assertTrue(legacy_file.exists())
        snapshot = resolve_last_valid_snapshot(self.backup)
        self.assertNotEqual(
            snapshot.resolve(),
            self.backup.resolve(),
        )
        self.assertEqual(
            json.loads(
                (
                    snapshot
                    / "static/data/version.json"
                ).read_text()
            )["v"],
            "100",
        )

    def test_each_publication_uses_a_new_snapshot(self) -> None:
        self.publish("100", "first")
        second = self.publish("200", "second")
        third = self.publish("300", "third")

        self.assertNotEqual(
            second.backup_snapshot,
            third.backup_snapshot,
        )
        self.assertTrue(second.backup_snapshot.exists())
        self.assertTrue(third.backup_snapshot.exists())

        current_pointer = resolve_last_valid_snapshot(
            self.backup
        )
        self.assertEqual(
            current_pointer.resolve(),
            third.backup_snapshot.resolve(),
        )
        self.assertEqual(
            json.loads(
                (
                    current_pointer
                    / "static/data/version.json"
                ).read_text()
            )["v"],
            "200",
        )


if __name__ == "__main__":
    unittest.main()
