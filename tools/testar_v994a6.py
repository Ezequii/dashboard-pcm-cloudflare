from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
validator = root / "tools/validar_v994a6.py"
result = subprocess.run([sys.executable, str(validator)], cwd=root)
raise SystemExit(result.returncode)
