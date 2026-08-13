import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "ruff-format.py"
_spec = importlib.util.spec_from_file_location("ruff_format", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


class _FakeExec:
    def __init__(self):
        self.calls = []

    def __call__(self, cmd, **kwargs):
        self.calls.append(cmd)
        return None


def test_ignores_non_py_files():
    exec_cmd = _FakeExec()
    assert hook.run({"tool_input": {"file_path": "a.ts"}}, exec_cmd=exec_cmd) is None
    assert exec_cmd.calls == []


def test_calls_ruff_format_on_py_file():
    exec_cmd = _FakeExec()
    hook.run({"tool_input": {"file_path": "main.py"}}, exec_cmd=exec_cmd)
    assert len(exec_cmd.calls) == 1
    assert "ruff format" in exec_cmd.calls[0]
    assert "main.py" in exec_cmd.calls[0]


def test_returns_none_on_success():
    assert hook.run({"tool_input": {"file_path": "a.py"}}, exec_cmd=_FakeExec()) is None


def test_swallows_missing_ruff():
    def fail(cmd, **kwargs):
        raise RuntimeError("uv not found")

    assert hook.run({"tool_input": {"file_path": "a.py"}}, exec_cmd=fail) is None


def test_supports_path_field():
    exec_cmd = _FakeExec()
    hook.run({"tool_input": {"path": "script.py"}}, exec_cmd=exec_cmd)
    assert "script.py" in exec_cmd.calls[0]
