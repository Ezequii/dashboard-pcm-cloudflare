from pathlib import Path
import importlib.util
import json

ROOT = Path(__file__).resolve().parents[2]


def load_builder():
    path = ROOT / "tools" / "build_dist.py"
    spec = importlib.util.spec_from_file_location("build_dist", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


def test_wrangler_publishes_only_dist():
    text = (ROOT / "wrangler.toml").read_text(encoding="utf-8")
    assert 'directory = "./dist"' in text
    assert 'directory = "."' not in text


def test_production_disables_local_admin_bypass():
    config = json.loads(
        (ROOT / "static/config/security-config.json").read_text(encoding="utf-8")
    )
    assert config["environment"] == "production"
    assert config["localDevelopmentAllowed"] is False
    assert config["exportRoles"] == ["leadership", "admin"]


def test_dist_builder_excludes_repository_material(tmp_path):
    builder = load_builder()
    output = ROOT / "dist-test"
    try:
        copied = builder.build_dist(output)
        assert copied
        assert (output / "index.html").is_file()
        assert (output / "static/data/operational-data.json").is_file()
        assert not (output / "tools").exists()
        assert not (output / "data").exists()
        assert not list(output.rglob("*.xlsx"))
        assert not list(output.rglob("*.py"))
        assert not list(output.rglob("*.md"))
    finally:
        if output.exists():
            import shutil
            shutil.rmtree(output)


def test_filter_failure_is_fail_closed():
    text = (ROOT / "static/js/api.js").read_text(encoding="utf-8")
    assert "Não foi possível aplicar os filtros com segurança." in text
    assert "return sortStaticRows(rows.slice(), 'ETAPA', 'asc');" not in text
