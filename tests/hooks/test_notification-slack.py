import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "notify-slack.py"
_spec = importlib.util.spec_from_file_location("notify_slack", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_returns_none_without_webhook():
    assert hook.run({"message": "x"}, exec_cmd=lambda c: None, webhook="") is None


def test_returns_none_without_message():
    assert hook.run({}, exec_cmd=lambda c: None, webhook="https://hook") is None


def test_posts_payload_via_curl():
    calls = []
    payload = hook.run(
        {"message": "hi"},
        exec_cmd=lambda c: calls.append(c),
        webhook="https://hook",
        project_dir="/x/proj",
    )
    assert "proj" in payload
    assert any("curl" in c for c in calls)
