import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "worktree-guard.py"
_spec = importlib.util.spec_from_file_location("worktree_guard", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _make_exec(toplevel="/wt", worktree_list="/main  abc [main]\n/wt  def [feat]"):
    def exec_cmd(cmd):
        if "show-toplevel" in cmd:
            return toplevel
        if "worktree list" in cmd:
            return worktree_list
        return ""

    return exec_cmd


def test_blocks_write_outside_current_worktree():
    r = hook.run(
        {"tool_input": {"file_path": "/main/src/x.ts"}},
        exec_cmd=_make_exec(),
    )
    assert r["decision"] == "block"


def test_allows_write_inside_current_worktree():
    r = hook.run(
        {"tool_input": {"file_path": "/wt/src/x.ts"}},
        exec_cmd=_make_exec(),
    )
    assert r is None


def test_does_not_apply_in_main_worktree():
    r = hook.run(
        {"tool_input": {"file_path": "/elsewhere/x.ts"}},
        exec_cmd=_make_exec(toplevel="/main"),
    )
    assert r is None


def test_passes_when_file_path_absent():
    assert hook.run({"tool_input": {}}, exec_cmd=_make_exec()) is None


def test_passes_when_git_fails():
    def exec_cmd(cmd):
        raise RuntimeError("not a git repo")

    assert hook.run({"tool_input": {"file_path": "/x"}}, exec_cmd=exec_cmd) is None


def test_allows_claude_internal_paths():
    r = hook.run(
        {"tool_input": {"file_path": "/home/user/.claude/plans/my-plan.md"}},
        exec_cmd=_make_exec(),
        home="/home/user",
    )
    assert r is None


def test_allows_codex_internal_paths():
    r = hook.run(
        {"tool_input": {"file_path": "/home/user/.codex/state/session.json"}},
        exec_cmd=_make_exec(),
        home="/home/user",
    )
    assert r is None
