import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "session-end-cleanup.py"
_spec = importlib.util.spec_from_file_location("session_end_cleanup", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _deps(files, mtime_fn):
    return {
        "listdir": lambda p: files,
        "stat": lambda p: type("S", (), {"st_mtime": mtime_fn(p)})(),
        "unlink": lambda p: None,
        "tmp": "/tmp",
        "max_age": 1000,
        "now": lambda: 10_000_000,
    }


def test_deletes_stale_claude_files():
    deps = _deps(["claude-old", "other"], lambda p: 0)
    assert hook.run(**deps)["cleaned"] == 1


def test_keeps_recent_files():
    deps = _deps(["claude-new"], lambda p: 9_999_999)
    assert hook.run(**deps)["cleaned"] == 0


def test_returns_clean_message():
    deps = _deps(["claude-old"], lambda p: 0)
    result = hook.run(**deps)
    assert "fichier" in result["message"]
