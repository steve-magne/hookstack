import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "protect-lockfiles.py"
_spec = importlib.util.spec_from_file_location("protect_lockfiles", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _edit(path):
    return {"tool_input": {"file_path": path}}


def test_blocks_pnpm_lock():
    result = hook.run(_edit("/proj/pnpm-lock.yaml"))
    assert result["decision"] == "block"


def test_blocks_poetry_lock():
    assert hook.run(_edit("/proj/poetry.lock"))["decision"] == "block"


def test_blocks_package_lock():
    assert hook.run(_edit("/proj/package-lock.json"))["decision"] == "block"


def test_allows_source_file():
    assert hook.run(_edit("/proj/src/main.py")) is None


def test_allows_missing_path():
    assert hook.run({"tool_input": {}}) is None
