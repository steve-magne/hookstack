import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "agents-md-loader.py"
_spec = importlib.util.spec_from_file_location("agents_md_loader", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_loads_agents_md_content():
    result = hook.run(
        {},
        project_dir="/project",
        read_file=lambda p: "# Agents\n\nAgent config here.",
        file_exists=lambda p: True,
    )
    assert result["hookSpecificOutput"]["additionalContext"] == "# Agents\n\nAgent config here."


def test_returns_correct_hook_event_name():
    result = hook.run(
        {},
        project_dir="/project",
        read_file=lambda p: "content",
        file_exists=lambda p: True,
    )
    assert result["hookSpecificOutput"]["hookEventName"] == "SessionStart"


def test_returns_none_when_agents_md_missing():
    assert hook.run({}, project_dir="/project", file_exists=lambda p: False) is None


def test_returns_none_when_agents_md_empty():
    assert (
        hook.run(
            {},
            project_dir="/project",
            read_file=lambda p: "   \n  ",
            file_exists=lambda p: True,
        )
        is None
    )


def test_returns_none_without_project_dir():
    assert hook.run({}, project_dir=None) is None
