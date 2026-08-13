import importlib.util
import json
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "config-audit-log.py"
_spec = importlib.util.spec_from_file_location("config_audit_log", _HOOK)
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


def test_logs_config_change():
    m = _deps()
    result = hook.run(
        {"change": {"theme": "dark"}},
        append=m["append"],
        mkdir=m["mkdir"],
        now=m["now"],
        project_dir=m["project_dir"],
        home=m["home"],
    )
    assert result["entry"]["ts"] == TS
    assert result["entry"]["project"] == "proj"
    assert result["entry"]["change"] == {"theme": "dark"}
    assert "config-audit" in result["message"]
    path, line = m["state"]["appended"][0]
    assert path == "/home/.claude/config-changes.jsonl"
    assert json.loads(line)["project"] == "proj"


def test_defaults_project_to_unknown():
    m = _deps()
    result = hook.run(
        {"change": "x"},
        append=m["append"],
        mkdir=m["mkdir"],
        now=m["now"],
        home=m["home"],
    )
    assert result["entry"]["project"] == "unknown"
