import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "file-changed-run-tests.py"
_spec = importlib.util.spec_from_file_location("file_changed_run_tests", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

PROJECT_DIR = "/fake/project"


class _Fail(Exception):
    def __init__(self, out):
        super().__init__("exit 1")
        self.stdout = out


def _deps(exec_cmd=None, has_pyproject=True):
    return {
        "exec_cmd": exec_cmd or (lambda cmd, **kwargs: "ok"),
        "exists": lambda p: has_pyproject and p.endswith("/pyproject.toml"),
        "project_dir": PROJECT_DIR,
    }


def test_ignores_unlink_event():
    assert hook.run({"event": "unlink"}, **_deps()) is None


def test_uses_uv_pytest_with_pyproject():
    calls = []
    hook.run({"file_path": "/fake/project/src/a.py"}, **_deps(lambda cmd, **kwargs: calls.append(cmd) or "ok"))
    assert any("uv run pytest" in c for c in calls)


def test_falls_back_to_python3_pytest_without_pyproject():
    calls = []
    hook.run(
        {"file_path": "src/a.py"},
        **_deps(lambda cmd, **kwargs: calls.append(cmd) or "ok", has_pyproject=False),
    )
    assert any("python3 -m pytest" in c for c in calls)


def test_reports_success():
    r = hook.run({"file_path": "a.py"}, **_deps())
    assert "passed" in r["hookSpecificOutput"]["additionalContext"]
    assert r["hookSpecificOutput"]["hookEventName"] == "FileChanged"


def test_reports_failure():
    r = hook.run({"file_path": "a.py"}, **_deps(lambda cmd, **kwargs: (_ for _ in ()).throw(_Fail("test failed"))))
    assert "FAILED" in r["hookSpecificOutput"]["additionalContext"]
