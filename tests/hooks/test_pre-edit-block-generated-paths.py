import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "block-generated-paths.py"
_spec = importlib.util.spec_from_file_location("block_generated_paths", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _edit(path):
    return {"tool_input": {"file_path": path}}


def test_blocks_node_modules():
    result = hook.run(_edit("/proj/node_modules/pkg/index.js"))
    assert result["decision"] == "block"
    assert "node_modules" in result["reason"]


def test_blocks_dist_and_pycache():
    assert hook.run(_edit("/proj/dist/bundle.js"))["decision"] == "block"
    assert hook.run(_edit("/proj/src/__pycache__/mod.pyc"))["decision"] == "block"


def test_blocks_venv():
    assert hook.run(_edit("/proj/.venv/lib/py/site.py"))["decision"] == "block"


def test_allows_source_file():
    assert hook.run(_edit("/proj/src/main.py")) is None


def test_allows_missing_path():
    assert hook.run({"tool_input": {}}) is None
