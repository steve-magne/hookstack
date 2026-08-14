import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "permission-auto-allow.py"
_spec = importlib.util.spec_from_file_location("permission_auto_allow", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _allowed(r):
    return bool(r) and r["hookSpecificOutput"]["decision"]["behavior"] == "allow"


def test_allows_read_only_tools():
    for tool in ["Read", "Glob", "Grep"]:
        assert _allowed(hook.run({"tool_name": tool}))


def test_allows_safe_bash():
    assert _allowed(hook.run({"tool_name": "Bash", "tool_input": {"command": "git status"}}))
    assert _allowed(hook.run({"tool_name": "Bash", "tool_input": {"command": "ls -la"}}))


def test_blocks_unlisted_bash():
    assert hook.run({"tool_name": "Bash", "tool_input": {"command": "rm file"}}) is None


def test_blocks_cat_with_redirection():
    assert hook.run({"tool_name": "Bash", "tool_input": {"command": "cat x > y"}}) is None


def test_blocks_write():
    assert hook.run({"tool_name": "Write"}) is None
