import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "worktree-remove-cleanup.py"
_spec = importlib.util.spec_from_file_location("worktree_remove_cleanup", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_returns_none_without_worktree_path():
    assert hook.run({}, exec_cmd=lambda c: None, exists=lambda p: True, rm=lambda p, **kw: None) is None


def test_runs_docker_compose_down_when_present():
    calls = []
    r = hook.run(
        {"worktree_path": "/wt"},
        exec_cmd=lambda c: calls.append(c),
        exists=lambda p: "docker-compose.yml" in p,
        rm=lambda p, **kw: None,
    )
    assert any("docker compose" in c for c in calls)
    assert "docker-down" in r["actions"]


def test_removes_node_modules_when_present():
    removed = []
    r = hook.run(
        {"worktree_path": "/wt"},
        exec_cmd=lambda c: None,
        exists=lambda p: p.endswith("node_modules"),
        rm=lambda p, **kw: removed.append((p, kw)),
    )
    assert ("/wt/node_modules", {"recursive": True, "force": True}) in removed
    assert "rm-node-modules" in r["actions"]


def test_does_nothing_when_nothing_to_clean():
    r = hook.run(
        {"worktree_path": "/wt"},
        exec_cmd=lambda c: None,
        exists=lambda p: False,
        rm=lambda p, **kw: None,
    )
    assert r["actions"] == []
