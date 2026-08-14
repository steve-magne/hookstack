import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "tool-usage.py"
_spec = importlib.util.spec_from_file_location("tool_usage", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

TS = "2026-06-02T00:00:00.000Z"


def _base():
    return {
        "append": lambda p, c: None,
        "mkdir": lambda p, **kw: None,
        "now": lambda: TS,
        "project_dir": "/proj",
    }


def test_logs_command_truncated_to_500():
    entry = hook.run({"tool_input": {"command": "y" * 800}}, **_base())
    assert len(entry["cmd"]) == 500


def test_ignores_empty_command():
    assert hook.run({"tool_input": {}}, **_base()) is None
