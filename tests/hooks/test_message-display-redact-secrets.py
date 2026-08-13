import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "message-display-redact-secrets.py"
_spec = importlib.util.spec_from_file_location("message_display_redact_secrets", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_redacts_anthropic_key():
    r = hook.run({"delta": "key sk-ant-api03-abcdefghijklmnopqrstuvwxyz"})
    assert "[REDACTED-ANTHROPIC-KEY]" in r["hookSpecificOutput"]["displayContent"]


def test_redacts_bearer_token():
    r = hook.run({"delta": "Authorization: Bearer abcdefghijklmnopqrstuvwxyz123"})
    assert "Bearer [REDACTED]" in r["hookSpecificOutput"]["displayContent"]


def test_redacts_github_tokens():
    r = hook.run({"delta": "pat ghp_" + "a" * 36})
    assert "[REDACTED-GH-TOKEN]" in r["hookSpecificOutput"]["displayContent"]
    r = hook.run({"delta": "pat ghs_" + "a" * 36})
    assert "[REDACTED-GH-TOKEN]" in r["hookSpecificOutput"]["displayContent"]


def test_returns_none_when_nothing_to_redact():
    assert hook.run({"delta": "texte normal"}) is None
