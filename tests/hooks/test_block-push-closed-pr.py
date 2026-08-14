import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "block-push-closed-pr.py"
_spec = importlib.util.spec_from_file_location("block_push_closed_pr", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _bash(command):
    return {"tool_input": {"command": command}}


def _exec_map(results):
    def exec_cmd(cmd, **kwargs):
        for prefix, value in results.items():
            if cmd.startswith(prefix):
                if isinstance(value, Exception):
                    raise value
                return value
        raise RuntimeError(f"unexpected cmd: {cmd}")

    return exec_cmd


def test_blocks_push_when_pr_closed():
    exec_cmd = _exec_map(
        {"git rev-parse": "feature/x\n", "gh pr view": "CLOSED\n"}
    )
    result = hook.run(_bash("git push origin feature/x"), exec_cmd=exec_cmd)
    assert result["decision"] == "block"
    assert "fermée" in result["reason"]


def test_blocks_push_when_pr_merged():
    exec_cmd = _exec_map({"git rev-parse": "feature/x\n", "gh pr view": "MERGED\n"})
    result = hook.run(_bash("git push origin feature/x"), exec_cmd=exec_cmd)
    assert "mergée" in result["reason"]


def test_allows_push_with_open_pr():
    exec_cmd = _exec_map({"git rev-parse": "feature/x\n", "gh pr view": "OPEN\n"})
    assert hook.run(_bash("git push origin feature/x"), exec_cmd=exec_cmd) is None


def test_ignores_non_push_command():
    assert hook.run(_bash("git status"), exec_cmd=_exec_map({})) is None


def test_ignores_main_branch():
    exec_cmd = _exec_map({"git rev-parse": "main\n"})
    assert hook.run(_bash("git push origin main"), exec_cmd=exec_cmd) is None


def test_ignores_gh_failure():
    exec_cmd = _exec_map({"git rev-parse": "feature/x\n", "gh pr view": RuntimeError("not a repo")})
    assert hook.run(_bash("git push origin feature/x"), exec_cmd=exec_cmd) is None


def test_ignores_when_git_rev_parse_fails():
    # `git rev-parse` peut échouer hors dépôt ou en sandbox — on laissera passer
    # pour éviter un faux positif plutôt que bloquer un contexte valide.
    exec_cmd = _exec_map({"git rev-parse": RuntimeError("not a git repo")})
    assert hook.run(_bash("git push origin feature/x"), exec_cmd=exec_cmd) is None


def test_blocks_push_reason_mentions_branch_name():
    # La reason doit nommer la branche pour aider l'utilisateur à comprendre laquelle est concernée.
    exec_cmd = _exec_map({"git rev-parse": "fix/closed-feature\n", "gh pr view": "CLOSED\n"})
    result = hook.run(_bash("git push origin fix/closed-feature"), exec_cmd=exec_cmd)
    assert "fix/closed-feature" in result["reason"]
