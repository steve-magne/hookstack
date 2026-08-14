import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "subagent-start-tts.py"
_spec = importlib.util.spec_from_file_location("subagent_start_tts", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_announces_start():
    text = hook.run(exec_cmd=lambda c: None, platform="darwin")
    assert text == "Sous-agent démarré"
