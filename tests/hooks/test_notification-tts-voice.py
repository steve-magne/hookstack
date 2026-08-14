import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "notification-tts.py"
_spec = importlib.util.spec_from_file_location("notification_tts", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_speaks_message_via_say_on_darwin():
    calls = []
    text = hook.run(
        {"message": "# Hello"},
        exec_cmd=lambda c: calls.append(c),
        platform="darwin",
    )
    assert text == " Hello"
    assert any('say "' in c for c in calls)


def test_returns_none_without_message():
    assert hook.run({}, exec_cmd=lambda c: None, platform="darwin") is None


def test_uses_espeak_outside_darwin():
    calls = []
    hook.run({"message": "hi"}, exec_cmd=lambda c: calls.append(c), platform="linux")
    assert any("espeak" in c for c in calls)
