import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "user-prompt-expansion-skill-context.py"
_spec = importlib.util.spec_from_file_location("user_prompt_expansion_skill_context", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_injects_context_for_code_review():
    r = hook.run({"command_name": "code-review"})
    assert "SOLID" in r["hookSpecificOutput"]["additionalContext"]


def test_injects_context_for_security_review():
    r = hook.run({"command_name": "security-review"})
    assert "OWASP" in r["hookSpecificOutput"]["additionalContext"]


def test_returns_none_for_unknown_skill():
    assert hook.run({"command_name": "other"}) is None


def test_returns_none_without_command_name():
    assert hook.run({}) is None
