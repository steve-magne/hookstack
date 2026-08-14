import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "message-display-redact-pii.py"
_spec = importlib.util.spec_from_file_location("message_display_redact_pii", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _content(r):
    return r["hookSpecificOutput"]["displayContent"]


def test_redacts_visa_card():
    r = hook.run({"delta": "Card: 4111 1111 1111 1111 expiry 12/26"})
    assert "[REDACTED-CARD]" in _content(r)
    assert "4111" not in _content(r)


def test_redacts_card_with_dashes():
    r = hook.run({"delta": "Payment: 5500-0000-0000-0004"})
    assert "[REDACTED-CARD]" in _content(r)


def test_redacts_french_iban():
    r = hook.run({"delta": "IBAN: FR76 3000 6000 0112 3456 7890 189"})
    assert "[REDACTED-IBAN]" in _content(r)


def test_redacts_us_ssn():
    r = hook.run({"delta": "SSN: 123-45-6789 — do not share"})
    assert "[REDACTED-SSN]" in _content(r)


def test_does_not_redact_emails():
    assert hook.run({"delta": "Contact: john.doe@example.com for support"}) is None


def test_redacts_multiple_types_in_one_delta():
    r = hook.run({"delta": "Card 4111111111111111 SSN 123-45-6789"})
    content = _content(r)
    assert "[REDACTED-CARD]" in content
    assert "[REDACTED-SSN]" in content


def test_returns_none_without_hard_pii():
    r = hook.run({"delta": "SELECT count(*) FROM orders WHERE status = 'pending'"})
    assert r is None


def test_returns_none_when_delta_empty_or_absent():
    assert hook.run({"delta": ""}) is None
    assert hook.run({}) is None
