import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "pre-write-secret-detection.py"
_spec = importlib.util.spec_from_file_location("pre_write_secret_detection", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

ANTHROPIC_KEY = "sk-ant-" + "a" * 40


def _write(content):
    return {"tool_input": {"content": content}}


def test_blocks_content_with_api_key():
    result = hook.run(_write(f"OPENAI_API_KEY={ANTHROPIC_KEY}"))
    assert result["decision"] == "block"


def test_blocks_new_string_field():
    result = hook.run({"tool_input": {"new_string": f"token = '{ANTHROPIC_KEY}'"}})
    assert result["decision"] == "block"


def test_allows_clean_content():
    assert hook.run(_write("def add(a, b):\n    return a + b\n")) is None


def test_allows_empty_content():
    assert hook.run({"tool_input": {}}) is None
