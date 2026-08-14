import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "pre-read-env-guard.py"
_spec = importlib.util.spec_from_file_location("pre_read_env_guard", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _read(path):
    return {"tool_name": "Read", "tool_input": {"file_path": path}}


def test_blocks_env():
    result = hook.run(_read("/proj/.env"))
    assert result["decision"] == "block"


def test_blocks_env_local():
    assert hook.run(_read("/proj/.env.local"))["decision"] == "block"


def test_allows_env_example():
    assert hook.run(_read("/proj/.env.example")) is None


def test_allows_env_dist():
    assert hook.run(_read("/proj/.env.dist")) is None


def test_allows_non_env_file():
    assert hook.run(_read("/proj/src/main.py")) is None


def test_silent_on_non_read_tool():
    assert hook.run({"tool_name": "Bash", "tool_input": {}}) is None
