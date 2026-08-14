import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "auto-allow-exit-plan.py"
_spec = importlib.util.spec_from_file_location("auto_allow_exit_plan", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_allows_exit_plan_mode():
    r = hook.run({"tool_name": "exit_plan_mode"})
    assert r["hookSpecificOutput"]["decision"]["behavior"] == "allow"


def test_reads_tool_field_too():
    r = hook.run({"tool": "exit_plan_mode"})
    assert r["hookSpecificOutput"]["decision"]["behavior"] == "allow"


def test_ignores_other_tools():
    assert hook.run({"tool_name": "Bash"}) is None
