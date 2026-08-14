import importlib.util
from datetime import datetime, timezone
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "session-start-worktree-if-main.py"
_spec = importlib.util.spec_from_file_location("session_start_worktree_if_main", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

MAIN = "/repos/hookstack"
DATE = "20260602"
SUFFIX = "abc123"
BRANCH = f"claude/session-{DATE}-{SUFFIX}"
WT_PATH = f"{MAIN}/.claude/worktrees/session-{DATE}-{SUFFIX}"


def _make_exec(branch="main", current_root=MAIN, worktree_list=None):
    default_list = worktree_list or f"{MAIN}  abc1234 [main]"

    def exec_cmd(cmd):
        if "branch --show-current" in cmd:
            return branch
        if "rev-parse --show-toplevel" in cmd:
            return current_root
        if "git worktree list" in cmd:
            return default_list
        if "fetch" in cmd:
            return ""
        if "merge" in cmd:
            return ""
        return ""

    return exec_cmd


def _fixed_random(length=6):
    return SUFFIX


def _fixed_now():
    return datetime.fromisoformat(f"{DATE[:4]}-{DATE[4:6]}-{DATE[6:8]}")


def test_nothing_when_not_on_main():
    r = hook.run(exec_cmd=_make_exec(branch="feature/foo"), random=_fixed_random)
    assert r is None


def test_nothing_when_already_in_secondary_worktree():
    exec_cmd = _make_exec(
        current_root=WT_PATH,
        worktree_list=f"{MAIN}  abc [main]\n{WT_PATH}  def [{BRANCH}]",
    )
    assert hook.run(exec_cmd=exec_cmd, random=_fixed_random) is None


def test_creates_fresh_worktree_with_unique_name():
    exec_cmd = _make_exec()
    added = []

    def add_worktree(path, branch_name):
        added.append((path, branch_name))

    result = hook.run(
        exec_cmd=exec_cmd,
        add_worktree=add_worktree,
        exists=lambda p: True,
        now=_fixed_now,
        random=_fixed_random,
    )
    assert added == [(WT_PATH, BRANCH)]
    assert "Worktree isolé créé automatiquement" in result
    assert WT_PATH in result
    assert BRANCH in result


def test_always_creates_new_worktree_even_same_day_exists():
    old_suffix = "fff000"
    old_path = f"{MAIN}/.claude/worktrees/session-{DATE}-{old_suffix}"
    old_branch = f"claude/session-{DATE}-{old_suffix}"
    exec_cmd = _make_exec(
        worktree_list=f"{MAIN}  abc [main]\n{old_path}  def [{old_branch}]"
    )
    added = []

    def add_worktree(path, branch_name):
        added.append((path, branch_name))

    result = hook.run(
        exec_cmd=exec_cmd,
        add_worktree=add_worktree,
        exists=lambda p: True,
        now=_fixed_now,
        random=_fixed_random,
    )
    assert added == [(WT_PATH, BRANCH)]
    assert "Worktree isolé créé automatiquement" in result


def test_never_removes_existing_worktree():
    old_path = f"{MAIN}/.claude/worktrees/session-20260101-aaa111"
    old_branch = "claude/session-20260101-aaa111"
    exec_cmd = _make_exec(
        worktree_list=f"{MAIN}  abc [main]\n{old_path}  def [{old_branch}]"
    )
    calls = []

    def spy(cmd):
        calls.append(cmd)
        return exec_cmd(cmd)

    added = []

    def add_worktree(path, branch_name):
        added.append((path, branch_name))

    hook.run(
        exec_cmd=spy,
        add_worktree=add_worktree,
        exists=lambda p: True,
        now=_fixed_now,
        random=_fixed_random,
    )
    assert not any("worktree remove" in c for c in calls)
    assert not any("branch -D" in c for c in calls)
    assert added == [(WT_PATH, BRANCH)]


def test_syncs_main_with_remote_before_creating_worktree():
    calls = []

    def exec_cmd(cmd):
        calls.append(cmd)
        if "branch --show-current" in cmd:
            return "main"
        if "rev-parse --show-toplevel" in cmd:
            return MAIN
        if "git worktree list" in cmd:
            return f"{MAIN}  abc [main]"
        return ""

    added = []

    def add_worktree(path, branch_name):
        added.append((path, branch_name))

    hook.run(
        exec_cmd=exec_cmd,
        add_worktree=add_worktree,
        exists=lambda p: True,
        now=_fixed_now,
        random=_fixed_random,
    )
    fetch_idx = next(i for i, c in enumerate(calls) if "fetch" in c)
    merge_idx = next(i for i, c in enumerate(calls) if "merge --ff-only" in c)
    assert fetch_idx >= 0
    assert merge_idx > fetch_idx
    assert added


def test_returns_warning_if_add_worktree_fails():
    def add_worktree(path, branch_name):
        raise RuntimeError("branch exists")

    result = hook.run(
        exec_cmd=_make_exec(),
        add_worktree=add_worktree,
        now=_fixed_now,
        random=_fixed_random,
    )
    assert "⚠️" in result


def test_returns_none_if_worktree_dir_does_not_exist_after_creation():
    result = hook.run(
        exec_cmd=_make_exec(),
        add_worktree=lambda p, b: None,
        exists=lambda p: False,
        now=_fixed_now,
        random=_fixed_random,
    )
    assert result is None
