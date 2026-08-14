import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "reload-direnv.py"
_spec = importlib.util.spec_from_file_location("reload_direnv", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_reloads_when_envrc_present():
    calls = []
    r = hook.run(
        {"cwd": "/p"},
        exec_cmd=lambda c, cwd: calls.append((c, cwd)),
        exists=lambda p: True,
    )
    assert ("direnv allow .", "/p") in calls
    assert "rechargé" in r["message"]


def test_ignores_when_no_envrc():
    assert hook.run(
        {"cwd": "/p"},
        exec_cmd=lambda c, cwd: None,
        exists=lambda p: False,
    ) is None
