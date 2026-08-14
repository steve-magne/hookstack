import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "subagent-stop-tts.py"
_spec = importlib.util.spec_from_file_location("subagent_stop_tts", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_includes_summary():
    text = hook.run({"summary": "fini"}, exec_cmd=lambda c: None, platform="darwin")
    assert "fini" in text


def test_default_text_without_summary():
    text = hook.run({}, exec_cmd=lambda c: None, platform="darwin")
    assert text == "Sous-agent terminé"
