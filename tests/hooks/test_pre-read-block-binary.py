import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "pre-read-block-binary.py"
_spec = importlib.util.spec_from_file_location("pre_read_block_binary", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _read(path):
    return {"tool_name": "Read", "tool_input": {"file_path": path}}


def test_blocks_pyc():
    result = hook.run(_read("/proj/__pycache__/mod.cpython-39.pyc"))
    assert result["decision"] == "block"
    assert ".pyc" in result["reason"]


def test_blocks_onnx_model():
    assert hook.run(_read("/proj/models/model.onnx"))["decision"] == "block"


def test_blocks_zip_archive():
    assert hook.run(_read("/proj/data.zip"))["decision"] == "block"


def test_extension_case_insensitive():
    assert hook.run(_read("/proj/archive.ZIP"))["decision"] == "block"


def test_allows_text_file():
    assert hook.run(_read("/proj/src/main.py")) is None


def test_allows_unknown_extension():
    assert hook.run(_read("/proj/file.weird")) is None


def test_silent_on_non_read_tool():
    assert hook.run({"tool_name": "Bash", "tool_input": {}}) is None
