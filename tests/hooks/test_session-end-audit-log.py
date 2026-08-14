import importlib.util
import json
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "audit-log.py"
_spec = importlib.util.spec_from_file_location("audit_log", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

TS = "2026-06-02T00:00:00.000Z"


def _deps():
    state = {"appended": []}

    def append(path, line):
        state["appended"].append((path, line))

    return {
        "append": append,
        "mkdir": lambda p, **k: None,
        "now": lambda: TS,
        "project_dir": "/proj",
        "home": "/home",
        "state": state,
    }


def test_appends_session_entry():
    m = _deps()
    e = hook.run(
        {"session_id": "s1", "total_cost_usd": 0.5, "num_turns": 3},
        append=m["append"],
        mkdir=m["mkdir"],
        now=m["now"],
        project_dir=m["project_dir"],
        home=m["home"],
    )
    assert e["timestamp"] == TS
    assert e["project"] == "proj"
    assert e["session_id"] == "s1"
    assert e["total_cost_usd"] == 0.5
    assert e["num_turns"] == 3
    path, line = m["state"]["appended"][0]
    assert path == "/home/.claude/audit-log.jsonl"
    assert json.loads(line) == e
