import importlib.util
from pathlib import Path

_HOOK = (
    Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "session-start-github-context.py"
)
_spec = importlib.util.spec_from_file_location("session_start_github_context", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_stays_silent_when_gh_returns_nothing():
    assert hook.run({}, exec_cmd=lambda cmd, **kwargs: "") is None


def test_injects_open_prs():
    def exec_cmd(cmd, **kwargs):
        return "42\tFix the thing\topen" if "pr list" in cmd else ""

    r = hook.run({}, exec_cmd=exec_cmd)
    ctx = r["hookSpecificOutput"]["additionalContext"]
    assert r["hookSpecificOutput"]["hookEventName"] == "SessionStart"
    assert "Open PRs" in ctx
    assert "Fix the thing" in ctx
    assert "Checks on current branch" not in ctx


def test_injects_current_branch_checks():
    def exec_cmd(cmd, **kwargs):
        return "build\tpass\t1m2s" if "pr checks" in cmd else ""

    ctx = hook.run({}, exec_cmd=exec_cmd)["hookSpecificOutput"]["additionalContext"]
    assert "Checks on current branch" in ctx
    assert "build" in ctx


def test_combines_prs_and_checks():
    def exec_cmd(cmd, **kwargs):
        if "pr list" in cmd:
            return "7\tAdd feature\topen"
        if "pr checks" in cmd:
            return "ci\tfail\t30s"
        return ""

    ctx = hook.run({}, exec_cmd=exec_cmd)["hookSpecificOutput"]["additionalContext"]
    assert "Add feature" in ctx
    assert "ci" in ctx
