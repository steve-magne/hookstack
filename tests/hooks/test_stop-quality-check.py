import importlib.util
import subprocess
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "quality-check.py"
_spec = importlib.util.spec_from_file_location("quality_check", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _make(has_pyproject=True, exec_results=None, changed=None):
    exec_results = exec_results or {}
    calls = []

    def exec_cmd(cmd, **kwargs):
        calls.append(cmd)
        for key, behavior in exec_results.items():
            if key in cmd:
                if isinstance(behavior, Exception):
                    raise behavior
        return None

    return {
        "exists": lambda f: has_pyproject if f == "pyproject.toml" else False,
        "exec_cmd": exec_cmd,
        "changed": changed if changed is not None else ["app/main.py"],
        "calls": calls,
    }


def _ruff_fail():
    return subprocess.CalledProcessError(1, "uv run ruff check .", output="2 lint errors\n")


def test_zero_checks_when_only_docs_change():
    m = _make(changed=["README.md"])
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["checks"] == 0
    assert m["calls"] == []


def test_zero_checks_without_pyproject():
    m = _make(has_pyproject=False)
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["checks"] == 0
    assert m["calls"] == []


def test_runs_ruff_and_pyright_on_touched_py():
    m = _make()
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["checks"] == 2
    assert result["failed"] == 0
    assert any('uv run ruff check "app/main.py"' in c for c in m["calls"])
    assert any('uv run pyright "app/main.py"' in c for c in m["calls"])


def test_config_only_change_runs_whole_repo():
    m = _make(changed=["pyproject.toml"])
    hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert any(c.endswith("uv run ruff check .") for c in m["calls"])
    assert any(c == "uv run pyright" for c in m["calls"])


def test_failed_ruff_fails_gate():
    m = _make(exec_results={"ruff": _ruff_fail()})
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["failed"] >= 1
    assert "✗ Ruff" in result["message"]


def test_runs_outside_git(changed_none=True):
    m = _make(changed=None)
    result = hook.run(**{k: v for k, v in m.items() if k != "calls"})
    assert result["checks"] == 2
