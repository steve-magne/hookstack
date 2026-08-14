import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "pytest.py"
_spec = importlib.util.spec_from_file_location("stop_pytest", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


class _Result:
    def __init__(self, status, stdout="", stderr=""):
        self.status = status
        self.stdout = stdout
        self.stderr = stderr


def _make(spawn_status=0, has_xdist=False, py_marker=True):
    calls = []

    def exists(f):
        if py_marker and f in ("pyproject.toml", "setup.py", "pytest.ini", "setup.cfg"):
            return True
        return False

    def spawn(args, **kwargs):
        calls.append(args)
        if args[:2] == ["run", "python"]:
            return _Result(0 if has_xdist else 1)
        return _Result(spawn_status, stdout="1 passed\n", stderr="")

    return {"exists": exists, "spawn": spawn, "calls": calls}


def test_returns_none_on_non_python_project():
    result = hook.run(
        exists=lambda f: False,
        spawn=lambda args, **kwargs: _Result(0),
        changed=["src/foo.ts"],
    )
    assert result is None


def test_skips_when_no_python_file_changed():
    result = hook.run(
        **{k: v for k, v in _make().items() if k != "calls"},
        changed=["README.md"],
    )
    assert result is None


def test_runs_pytest_and_reports_success():
    m = _make(spawn_status=0)
    result = hook.run(
        exists=m["exists"],
        spawn=m["spawn"],
        changed=["app/main.py"],
        cwd="/repo",
    )
    assert result["status"] == 0
    assert "Tests passés" in result["message"]
    assert m["calls"][-1] == ["run", "pytest", "--tb=short", "-q"]


def test_uses_xdist_when_available():
    m = _make(spawn_status=0, has_xdist=True)
    hook.run(exists=m["exists"], spawn=m["spawn"], changed=["app/main.py"], cwd="/repo")
    assert m["calls"][-1] == ["run", "pytest", "-n", "auto", "--tb=short", "-q"]


def test_reports_failure_status():
    m = _make(spawn_status=1)
    result = hook.run(
        exists=m["exists"],
        spawn=m["spawn"],
        changed=["app/main.py"],
        cwd="/repo",
    )
    assert result["status"] == 1
    assert "ÉCHEC" in result["message"]
