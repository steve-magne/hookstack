import importlib.util
from pathlib import Path

_LIB = (
    Path(__file__).resolve().parents[2]
    / ".claude"
    / "hooks"
    / "lib"
    / "changed_files.py"
)
_spec = importlib.util.spec_from_file_location("changed_files", _LIB)
lib = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(lib)


def _make_exec(
    porcelain="",
    base="",
    head="",
    committed="",
    no_git=False,
    no_base=False,
):
    def exec_cmd(cmd):
        if cmd.startswith("git status"):
            if no_git:
                raise RuntimeError("not a git repository")
            return porcelain
        if cmd.startswith("git merge-base"):
            if no_base:
                raise RuntimeError("fatal: origin/main not found")
            return base
        if cmd.startswith("git rev-parse"):
            return head
        if cmd.startswith("git diff --name-only"):
            return committed
        return ""

    return exec_cmd


def test_empty_list_on_clean_tree_without_local_commits():
    result = lib.changed_files(exec_cmd=_make_exec(base="abc", head="abc"))
    assert result == []


def test_returns_worktree_changes():
    result = lib.changed_files(
        exec_cmd=_make_exec(porcelain=" M src/foo.ts", base="abc", head="abc")
    )
    assert result == ["src/foo.ts"]


def test_bug_fixed_clean_tree_but_unpushed_commits():
    # The exact bug scenario: the agent committed and pushed, the tree is clean,
    # but the branch has commits origin/main does not know yet.
    result = lib.changed_files(
        exec_cmd=_make_exec(
            porcelain="",
            base="abc123",
            head="def456",
            committed="src/foo.py\ntests/campaigns/test_pipeline.py",
        )
    )
    assert result == ["src/foo.py", "tests/campaigns/test_pipeline.py"]


def test_combines_worktree_and_local_commits_deduplicated_sorted():
    result = lib.changed_files(
        exec_cmd=_make_exec(
            porcelain=" M src/a.ts\n M src/b.ts",
            base="abc",
            head="def",
            committed="src/a.ts\nsrc/c.ts",
        )
    )
    assert result == ["src/a.ts", "src/b.ts", "src/c.ts"]


def test_returns_none_outside_git_repo():
    assert lib.changed_files(exec_cmd=_make_exec(no_git=True)) is None


def test_returns_none_when_exec_returns_none():
    assert lib.changed_files(exec_cmd=lambda cmd: None) is None


def test_falls_back_to_worktree_without_origin_main():
    result = lib.changed_files(
        exec_cmd=_make_exec(porcelain=" M src/foo.ts", no_base=True)
    )
    assert result == ["src/foo.ts"]


def test_parses_renames_to_target():
    assert lib._parse_porcelain("R  old.py -> new.py") == ["new.py"]
