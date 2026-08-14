import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "session-changelog.py"
_spec = importlib.util.spec_from_file_location("session_changelog", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _exec(cmd):
    if "branch" in cmd:
        return "main"
    if "diff" in cmd:
        return " file | 2 +-"
    if "log" in cmd:
        return "- fix (abc)"
    return ""


def _base(**overrides):
    deps = {
        "exec_cmd": _exec,
        "append": lambda p, c: None,
        "exists": lambda p: True,
        "project_dir": "/p",
        "now": lambda: "2026-06-02T00:00:00Z",
    }
    deps.update(overrides)
    return deps


def test_appends_entry_when_changelog_exists():
    appends = []
    r = hook.run(**_base(append=lambda p, c: appends.append((p, c))))
    assert r["written"] is True
    assert appends


def test_ignores_when_changelog_absent():
    r = hook.run(**_base(exists=lambda p: False))
    assert r["written"] is False


def test_returns_none_without_diff_or_commits():
    assert hook.run(**_base(exec_cmd=lambda c: "")) is None
