import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "pre-write-main-guard.py"
_spec = importlib.util.spec_from_file_location("pre_write_main_guard", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _make_exec(branch="main", toplevel="/main", worktree_list="/main  abc [main]"):
    def exec_cmd(cmd, **kwargs):
        if "branch --show-current" in cmd:
            return branch
        if "abbrev-ref" in cmd:
            return branch
        if "worktree list" in cmd:
            return worktree_list
        if "show-toplevel" in cmd:
            return toplevel
        return ""

    return exec_cmd


def test_blocks_write_on_main_in_primary_repo():
    r = hook.run({"tool_input": {"file_path": "/main/src/x.ts"}}, exec_cmd=_make_exec())
    assert r["decision"] == "block"
    assert "main" in r["reason"]


def test_passes_on_feature_branch():
    assert hook.run({"tool_input": {"file_path": "/main/src/x.ts"}}, exec_cmd=_make_exec(branch="feat/x")) is None


def test_passes_in_secondary_worktree():
    assert hook.run({"tool_input": {"file_path": "/wt/src/x.ts"}}, exec_cmd=_make_exec(toplevel="/wt")) is None


def test_passes_write_targeting_another_worktree():
    assert hook.run({"tool_input": {"file_path": "/wt/src/x.ts"}}, exec_cmd=_make_exec()) is None


def test_passes_write_in_nested_secondary_worktree():
    exec_cmd = _make_exec(
        worktree_list="/main  abc [main]\n/main/.claude/worktrees/session-abc  def [claude/session-abc]"
    )
    assert (
        hook.run(
            {"tool_input": {"file_path": "/main/.claude/worktrees/session-abc/src/lib/site.ts"}},
            exec_cmd=exec_cmd,
        )
        is None
    )


def test_blocks_write_in_primary_repo_hooks_dir():
    exec_cmd = _make_exec(
        worktree_list="/main  abc [main]\n/main/.claude/worktrees/session-abc  def [claude/session-abc]"
    )
    r = hook.run(
        {"tool_input": {"file_path": "/main/.claude/hooks/my-hook.mjs"}},
        exec_cmd=exec_cmd,
    )
    assert r["decision"] == "block"
