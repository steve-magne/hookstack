import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "enforce-uv.py"
_spec = importlib.util.spec_from_file_location("enforce_uv", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _bash(command):
    return {"tool_name": "Bash", "tool_input": {"command": command}}


def test_blocks_pip_install():
    result = hook.run(_bash("pip install requests"))
    assert result["decision"] == "block"
    assert "uv add" in result["reason"]


def test_blocks_pip3_install():
    assert hook.run(_bash("pip3 install requests"))["decision"] == "block"


def test_blocks_poetry_add():
    assert hook.run(_bash("poetry add requests"))["decision"] == "block"


def test_blocks_poetry_install():
    result = hook.run(_bash("poetry install"))
    assert "uv sync" in result["reason"]


def test_allows_pip_in_documentation_mention():
    # "pip-install" (tiret) ne matche pas `pip\s+install` — mention documentaire OK.
    assert hook.run(_bash('echo "see pip-install docs"')) is None


def test_allows_uv_install():
    assert hook.run(_bash("uv add requests")) is None


def test_silent_on_non_bash_tool():
    assert hook.run({"tool_name": "Read", "tool_input": {}}) is None
