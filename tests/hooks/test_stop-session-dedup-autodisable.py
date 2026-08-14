import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "session-dedup-autodisable.py"
_spec = importlib.util.spec_from_file_location("session_dedup_autodisable", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_places_disabled_marker_at_threshold():
    writes = []
    deps = {
        "exists": lambda p: p == "/c",  # dossier existe, marqueur absent
        "readdir": lambda p: ["a.counter"],
        "read_file": lambda p: "3",
        "write_file": lambda p, c: writes.append((p, c)),
        "counter_dir": "/c",
    }
    r = hook.run(**deps)
    assert r["disabled"] == ["a"]
    assert ("/c/a.disabled", "") in writes
    assert "désactivés" in r["message"]


def test_does_not_rewrite_existing_marker():
    writes = []
    deps = {
        "exists": lambda p: True,  # dossier ET marqueur existent
        "readdir": lambda p: ["a.counter"],
        "read_file": lambda p: "5",
        "write_file": lambda p, c: writes.append((p, c)),
        "counter_dir": "/c",
    }
    assert hook.run(**deps)["disabled"] == ["a"]
    assert writes == []


def test_returns_none_below_threshold():
    deps = {
        "exists": lambda p: p == "/c",
        "readdir": lambda p: ["a.counter"],
        "read_file": lambda p: "1",
        "write_file": lambda p, c: None,
        "counter_dir": "/c",
    }
    assert hook.run(**deps) is None


def test_returns_none_without_counter_dir():
    assert hook.run(exists=lambda p: False, counter_dir="/c") is None
