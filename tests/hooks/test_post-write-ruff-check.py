import importlib.util
import subprocess
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "ruff-check.py"
_spec = importlib.util.spec_from_file_location("ruff_check", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _ok(cmd, **kwargs):
    return None


def _fail(stdout):
    def fail(cmd, **kwargs):
        raise subprocess.CalledProcessError(1, cmd, output=stdout)

    return fail


def test_ignores_non_py_files():
    assert hook.run({"tool_input": {"file_path": "a.ts"}}, exec_cmd=_ok) is None


def test_runs_ruff_check_fix():
    calls = []

    def ok(cmd, **kwargs):
        calls.append(cmd)
        return None

    hook.run({"tool_input": {"file_path": "main.py"}}, exec_cmd=ok)
    assert len(calls) == 1
    assert "ruff check --fix" in calls[0]


def test_returns_message_on_failure_with_output():
    result = hook.run(
        {"tool_input": {"file_path": "main.py"}},
        exec_cmd=_fail("2 errors in main.py\n"),
    )
    assert result["message"].startswith("[ruff-check]")


def test_returns_none_on_failure_without_output():
    assert hook.run({"tool_input": {"file_path": "main.py"}}, exec_cmd=_fail("")) is None
