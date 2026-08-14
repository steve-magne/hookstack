import importlib.util
import json
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "reinject-after-compact.py"
_spec = importlib.util.spec_from_file_location("reinject_after_compact", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _deps(backup_dir="/bk"):
    return {"backup_dir": backup_dir}


def test_reinjects_current_session_backup():
    content = json.dumps({"summary": "Résumé précédent", "saved_at": "2026-06-02"})
    deps = {
        **_deps(),
        "exists": lambda p: True,
        "read_file": lambda p: content,
        "readdir": lambda p: [],
    }
    out = hook.run({"session_id": "s1"}, **deps)
    assert "Résumé précédent" in out
    assert "2026-06-02" in out


def test_falls_back_to_most_recent_backup():
    deps = {
        **_deps(),
        "exists": lambda p: p == "/bk" or p.endswith("recent.json"),
        "readdir": lambda p: ["recent.json"],
        "read_file": lambda p: json.dumps({"summary": "Le plus récent", "saved_at": "2026-06-01"}),
    }
    out = hook.run({"session_id": ""}, **deps)
    assert "Le plus récent" in out


def test_returns_none_without_backup_dir():
    deps = {"exists": lambda p: False, "backup_dir": "/bk"}
    assert hook.run({"session_id": "s1"}, **deps) is None


def test_returns_none_without_any_backup():
    deps = {
        **_deps(),
        "exists": lambda p: p == "/bk",
        "readdir": lambda p: [],
    }
    assert hook.run({"session_id": ""}, **deps) is None


def test_ignores_corrupted_backup():
    deps = {
        **_deps(),
        "exists": lambda p: True,
        "read_file": lambda p: "pas du json",
        "readdir": lambda p: [],
    }
    assert hook.run({"session_id": "s1"}, **deps) is None
