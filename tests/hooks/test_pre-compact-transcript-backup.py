import importlib.util
import json
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "pre-compact-backup.py"
_spec = importlib.util.spec_from_file_location("pre_compact_backup", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _deps():
    state = {"written": {}, "dirs": []}

    def write_file(p, content):
        state["written"][p] = content

    def mkdir(p, **kwargs):
        state["dirs"].append(p)

    return {"write_file": write_file, "mkdir": mkdir, "now": lambda: "2026-08-13T00:00:00+00:00", "state": state}


def test_backs_up_summary():
    m = _deps()
    result = hook.run(
        {"summary": "Le résumé", "session_id": "sess-1"},
        write_file=m["write_file"],
        mkdir=m["mkdir"],
        now=m["now"],
    )
    assert result["file"].endswith("/sess-1.json")
    assert m["state"]["dirs"] == ["/tmp/claude-compact-backups"]
    payload = json.loads(m["state"]["written"][result["file"]])
    assert payload["session_id"] == "sess-1"
    assert payload["summary"] == "Le résumé"
    assert payload["saved_at"] == "2026-08-13T00:00:00+00:00"


def test_returns_none_without_summary():
    m = _deps()
    assert hook.run({}, write_file=m["write_file"], mkdir=m["mkdir"], now=m["now"]) is None
    assert m["state"]["written"] == {}
