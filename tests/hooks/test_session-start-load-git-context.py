import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "load-git-context.py"
_spec = importlib.util.spec_from_file_location("load_git_context", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _exec_map(results, fallback=""):
    def exec_cmd(cmd, **kwargs):
        for prefix, value in results.items():
            if cmd.startswith(prefix):
                return value
        return fallback

    return exec_cmd


def test_injects_branch_commit_status():
    out = hook.run(
        exec_cmd=_exec_map(
            {
                "git branch --show-current": "feature/x",
                "git log -1": "abc1234 add feature",
                "git status --short": "M src/main.py\n?? new.py",
            }
        )
    )
    assert "Contexte Git" in out
    assert "feature/x" in out
    assert "abc1234" in out
    assert "M src/main.py" in out


def test_falls_back_to_abbrev_ref():
    out = hook.run(
        exec_cmd=_exec_map(
            {
                "git branch --show-current": "",
                "git rev-parse --abbrev-ref HEAD": "detached",
            }
        )
    )
    assert "detached" in out


def test_returns_none_outside_repo():
    # Le exec par défaut avale les erreurs et renvoie "" — même contrat ici.
    assert hook.run(exec_cmd=lambda cmd, **kwargs: "") is None


def test_mentions_clean_tree():
    out = hook.run(
        exec_cmd=_exec_map({"git branch --show-current": "main", "git status --short": ""})
    )
    assert "propre" in out
