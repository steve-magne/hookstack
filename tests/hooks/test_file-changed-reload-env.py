import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "file-changed-reload-env.py"
_spec = importlib.util.spec_from_file_location("file_changed_reload_env", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_reloads_valid_vars():
    appended = []
    r = hook.run(
        {"file_path": ".env", "event": "change"},
        read_file=lambda p: "FOO=1\n# comment\nBAR=2",
        append=lambda p, c: appended.append((p, c)),
        env_file="/tmp/env",
    )
    assert r["count"] == 2
    assert ("/tmp/env", "export FOO=1\n") in appended


def test_ignores_unlink():
    assert hook.run({"event": "unlink"}, env_file="/tmp/env") is None


def test_ignores_without_env_file():
    assert hook.run({"file_path": ".env"}, env_file=None) is None
