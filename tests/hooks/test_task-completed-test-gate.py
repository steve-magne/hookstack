import importlib.util
import subprocess
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "task-completed-test-gate.py"
_spec = importlib.util.spec_from_file_location("task_completed_test_gate", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _ok(cmd, **kwargs):
    return None


def _fail():
    def fail(cmd, **kwargs):
        raise subprocess.CalledProcessError(1, cmd, output="2 failed, 3 passed\n")

    return fail


def _exists(*names):
    def exists(f):
        return f in names

    return exists


def test_passes_when_tests_succeed():
    assert hook.run(
        {"task_subject": "x"},
        exec_cmd=_ok,
        exists=_exists("pyproject.toml", "tests"),
        project_dir="/repo",
    ) is None


def test_blocks_when_tests_fail():
    result = hook.run(
        {"task_subject": "Feature X"},
        exec_cmd=_fail(),
        exists=_exists("pyproject.toml", "tests"),
        project_dir="/repo",
    )
    assert result["exitCode"] == 2
    assert "Feature X" in result["message"]
    assert "2 failed" in result["message"]


def test_arms_with_pytest_ini_without_tests_dir():
    calls = []

    def ok(cmd, **kwargs):
        calls.append(cmd)
        return None

    hook.run(
        {"task_subject": "x"},
        exec_cmd=ok,
        exists=_exists("pyproject.toml", "pytest.ini"),
        project_dir="/repo",
    )
    assert calls == ["uv run pytest -q"]


def test_disarmed_without_tests():
    calls = []

    def ok(cmd, **kwargs):
        calls.append(cmd)
        return None

    assert (
        hook.run(
            {"task_subject": "x"},
            exec_cmd=ok,
            exists=_exists("pyproject.toml"),
            project_dir="/repo",
        )
        is None
    )
    assert calls == []


def test_disarmed_on_non_python_project():
    assert (
        hook.run(
            {"task_subject": "x"},
            exec_cmd=_ok,
            exists=_exists("package.json", "tests"),
            project_dir="/repo",
        )
        is None
    )
