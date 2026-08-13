import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "permission-denied-auto-mode-log.py"
_spec = importlib.util.spec_from_file_location("permission_denied_auto_mode_log", _HOOK)
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


def test_builds_line_with_tool_and_reason():
    m = _deps()
    line = hook.run(
        {"tool_name": "Bash", "tool_input": {"command": "rm"}, "reason": "denied"},
        append=m["append"],
        mkdir=m["mkdir"],
        now=m["now"],
        project_dir=m["project_dir"],
    )
    assert "Bash" in line
    assert "denied" in line
    path, _ = m["state"]["appended"][0]
    assert path == "/proj/.claude/permission-denied.log"
