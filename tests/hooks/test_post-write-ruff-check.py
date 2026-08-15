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


def test_runs_format_then_check_fix():
    calls = []

    def ok(cmd, **kwargs):
        calls.append(cmd)
        return None

    hook.run({"tool_input": {"file_path": "main.py"}}, exec_cmd=ok)
    assert len(calls) == 2
    assert "ruff format" in calls[0]
    assert "ruff check --fix" in calls[1]


def test_format_failure_is_swallowed():
    calls = []

    def fail_format_then_ok(cmd, **kwargs):
        calls.append(cmd)
        if "ruff format" in cmd:
            raise subprocess.CalledProcessError(1, cmd, output="")
        return None

    assert hook.run({"tool_input": {"file_path": "main.py"}}, exec_cmd=fail_format_then_ok) is None
    assert len(calls) == 2


def test_returns_message_on_failure_with_output():
    # La 1re exécution (format) réussit, la 2e (check) échoue avec du output.
    state = {"n": 0}

    def fail_check(cmd, **kwargs):
        state["n"] += 1
        if state["n"] == 1:
            return None
        raise subprocess.CalledProcessError(1, cmd, output="2 errors in main.py\n")

    result = hook.run({"tool_input": {"file_path": "main.py"}}, exec_cmd=fail_check)
    assert result["message"].startswith("[ruff-check]")


def test_returns_none_on_failure_without_output():
    state = {"n": 0}

    def fail_check_silent(cmd, **kwargs):
        state["n"] += 1
        if state["n"] == 1:
            return None
        raise subprocess.CalledProcessError(1, cmd, output="")

    assert hook.run({"tool_input": {"file_path": "main.py"}}, exec_cmd=fail_check_silent) is None
