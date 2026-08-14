import importlib.util
import json
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "inject-deps-versions.py"
_spec = importlib.util.spec_from_file_location("inject_deps_versions", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _deps(files):
    return {
        "cwd": "/proj",
        "file_exists": lambda p: p in files,
        "read_file": lambda p: files[p],
    }


def test_injects_versions_from_package_json():
    out = hook.run(
        **_deps(
            {
                "/proj/package.json": json.dumps(
                    {
                        "dependencies": {"next": "15.0.0"},
                        "devDependencies": {"vitest": "^2.1.0"},
                    }
                )
            }
        )
    )
    assert "next@15.0.0" in out
    assert "vitest@^2.1.0" in out


def test_extracts_pyproject_dependencies():
    out = hook.run(
        **_deps(
            {
                "/proj/pyproject.toml": 'dependencies = [\n  "fastapi>=0.110",\n  "httpx",\n]\n'
            }
        )
    )
    assert "fastapi>=0.110" in out


def test_returns_none_without_manifest():
    assert hook.run(**_deps({})) is None


def test_survives_invalid_package_json():
    assert hook.run(**_deps({"/proj/package.json": "{not json"})) is None


def test_bounds_output_to_60_entries():
    many = {f"pkg{i}": "1.0.0" for i in range(80)}
    out = hook.run(
        **_deps({"/proj/package.json": json.dumps({"dependencies": many})})
    )
    assert "+20 more" in out
