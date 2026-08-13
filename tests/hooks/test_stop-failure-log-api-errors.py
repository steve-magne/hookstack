import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "stop-failure-log-api-errors.py"
_spec = importlib.util.spec_from_file_location("stop_failure_log_api_errors", _HOOK)
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
        "state": state,
    }


def test_builds_api_error_line():
    m = _deps()
    line = hook.run(
        {"error": "rate_limit", "error_details": "429", "session_id": "s1"},
        append=m["append"],
        mkdir=m["mkdir"],
        now=m["now"],
        project_dir=m["project_dir"],
    )
    assert "rate_limit" in line
    assert "session:s1" in line
    path, _ = m["state"]["appended"][0]
    assert path == "/proj/.claude/api-errors.log"
