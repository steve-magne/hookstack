import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "block-huge-write.py"
_spec = importlib.util.spec_from_file_location("block_huge_write", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _write(path, content):
    return {"tool_name": "Write", "tool_input": {"file_path": path, "content": content}}


def test_blocks_huge_content():
    result = hook.run(_write("/proj/dump.json", "x" * 600_000))
    assert result["decision"] == "block"
    assert "Ko" in result["reason"]


def test_allows_small_content():
    assert hook.run(_write("/proj/src/main.py", "print('hi')")) is None


def test_ignores_edit_tool():
    assert hook.run({"tool_name": "Edit", "tool_input": {"content": "x" * 600_000}}) is None


def test_ignores_missing_content():
    assert hook.run({"tool_name": "Write", "tool_input": {}}) is None
