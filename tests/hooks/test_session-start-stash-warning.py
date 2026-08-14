import importlib.util
import time
from datetime import datetime, timezone
from pathlib import Path

_HOOK = (
    Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "session-start-stash-warning.py"
)
_spec = importlib.util.spec_from_file_location("session_start_stash_warning", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _iso_days_ago(days):
    ts = time.time() - days * 86400
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S %z")


def _now():
    return int(time.time() * 1000)


def test_warns_for_stale_stash():
    old = _iso_days_ago(10)
    exec_cmd = lambda cmd, **kwargs: f"stash@{{0}}|{old}|WIP"
    out = hook.run(exec_cmd=exec_cmd, now=_now)
    assert "Stashs Git oubliés" in out
    assert "10j" in out


def test_returns_none_without_stash():
    assert hook.run(exec_cmd=lambda cmd, **kwargs: "", now=_now) is None


def test_returns_none_for_recent_stash():
    recent = _iso_days_ago(0)
    out = hook.run(exec_cmd=lambda cmd, **kwargs: f"stash@{{0}}|{recent}|WIP", now=_now)
    assert out is None
