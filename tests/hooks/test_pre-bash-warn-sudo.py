import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "warn-sudo.py"
_spec = importlib.util.spec_from_file_location("warn_sudo", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _bash(command):
    return {"tool_name": "Bash", "tool_input": {"command": command}}


def test_warns_on_leading_sudo():
    result = hook.run(_bash("sudo apt update"))
    assert "sudo" in result["message"]


def test_warns_on_sudo_after_operator():
    assert hook.run(_bash("apt update && sudo apt upgrade"))["message"]


def test_silent_without_sudo():
    assert hook.run(_bash("apt update")) is None


def test_silent_on_documented_sudo_in_quotes():
    assert hook.run(_bash('git commit -m "use sudo for installs"')) is None


def test_silent_on_non_bash_tool():
    assert hook.run({"tool_name": "Read", "tool_input": {}}) is None
