import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "guard-force-push-any.py"
_spec = importlib.util.spec_from_file_location("guard_force_push_any", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _bash(command):
    return {"tool_name": "Bash", "tool_input": {"command": command}}


def test_blocks_bare_force():
    result = hook.run(_bash("git push --force origin feature/x"))
    assert result["decision"] == "block"
    assert "force-with-lease" in result["reason"]


def test_blocks_short_f():
    assert hook.run(_bash("git push -f origin feature/x"))["decision"] == "block"


def test_blocks_combined_short_flag():
    assert hook.run(_bash("git push -fu origin feature/x"))["decision"] == "block"


def test_allows_force_with_lease():
    assert hook.run(_bash("git push --force-with-lease origin feature/x")) is None


def test_allows_normal_push():
    assert hook.run(_bash("git push origin feature/x")) is None


def test_allows_documented_force_in_quotes():
    assert hook.run(_bash('git commit -m "do not push --force"')) is None


def test_silent_on_non_bash_tool():
    assert hook.run({"tool_name": "Read", "tool_input": {}}) is None
