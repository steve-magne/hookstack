import importlib.util
import os
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "setup-check-deps.py"
_spec = importlib.util.spec_from_file_location("setup_check_deps", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


class _Stat:
    def __init__(self, mtime):
        self.st_mtime = mtime


def _deps(present, mtimes=None):
    # Le hook join(project_dir, fichier) : on compare sur le basename et on indexe
    # les mtimes par basename, comme le fait le hook.
    mtimes = mtimes or {}
    return {
        "exists": lambda f: os.path.basename(f) in present,
        "stat": lambda f: _Stat(mtimes.get(os.path.basename(f), 100)),
        "project_dir": "/repo",
    }


def test_warns_when_modules_dir_missing():
    result = hook.run(**_deps({"uv.lock"}))
    assert ".venv absent" in result["message"]
    assert "uv sync" in result["message"]


def test_warns_when_lockfile_newer_than_modules():
    present = {"uv.lock", ".venv"}
    mtimes = {"uv.lock": 200, ".venv": 100}
    result = hook.run(**_deps(present, mtimes))
    assert "plus récent" in result["message"]


def test_silent_when_up_to_date():
    present = {"uv.lock", ".venv"}
    mtimes = {"/repo/uv.lock": 50, "/repo/.venv": 100}
    result = hook.run(**_deps(present, mtimes))
    assert result["message"] == ""


def test_ignores_unknown_manifests():
    result = hook.run(**_deps({"Cargo.toml"}))
    assert result["message"] == ""
