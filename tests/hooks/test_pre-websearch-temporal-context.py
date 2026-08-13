import importlib.util
from pathlib import Path

_HOOK = (
    Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "websearch-temporal-context.py"
)
_spec = importlib.util.spec_from_file_location("websearch_temporal_context", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _input(query):
    return {"tool_input": {"query": query}}


def test_adds_year_without_temporal_context():
    result = hook.run(_input("best React state management"), current_year=2026)
    assert result["hookSpecificOutput"]["modifiedToolInput"]["query"] == "best React state management 2026"


def test_does_not_modify_when_year_present():
    assert hook.run(_input("Next.js 15 features 2025"), current_year=2026) is None


def test_does_not_modify_when_latest_present():
    assert hook.run(_input("latest Claude models"), current_year=2026) is None


def test_does_not_modify_when_recent_present():
    assert hook.run(_input("recent AI breakthroughs"), current_year=2026) is None


def test_does_not_modify_when_current_present():
    assert hook.run(_input("current Node.js LTS"), current_year=2026) is None


def test_returns_none_for_empty_query():
    assert hook.run(_input(""), current_year=2026) is None


def test_returns_none_without_tool_input():
    assert hook.run({}, current_year=2026) is None


def test_returns_correct_hook_event_name():
    result = hook.run(_input("TypeScript tips"), current_year=2026)
    assert result["hookSpecificOutput"]["hookEventName"] == "PreToolUse"
