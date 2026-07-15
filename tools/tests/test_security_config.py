from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))

from services.security import (  # noqa: E402
    SecurityConfigurationError,
    parse_security_policy,
)


class SecurityConfigTests(unittest.TestCase):
    def test_production_policy_is_fail_closed(self) -> None:
        config = json.loads(
            (ROOT / "static/config/security-config.json").read_text(
                encoding="utf-8"
            )
        )
        policy = parse_security_policy(config)
        self.assertEqual(policy.environment, "production")
        self.assertTrue(policy.access_required)
        self.assertTrue(policy.fail_closed)
        self.assertFalse(policy.anonymous_access_allowed)

    def test_unsafe_production_policy_is_rejected(self) -> None:
        with self.assertRaises(SecurityConfigurationError):
            parse_security_policy(
                {
                    "environment": "production",
                    "accessRequired": False,
                    "anonymousAccessAllowed": True,
                    "failClosed": False,
                    "allowedRoles": ["viewer"],
                }
            )


if __name__ == "__main__":
    unittest.main()
