import importlib.util
import json
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "post-tool-failure-log.py"
_spec = importlib.util.spec_from_file_location("post_tool_failure_log", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

TS = "2026-06-02T00:00:00.000Z"


def _deps():
    state = {"appended": []}

    def append(path, line):
        state["appended"].append((path, line))

    return {"append": append, "mkdir": lambda p, **k: None, "now": lambda: TS, "project_dir": "/proj", "state": state}


def test_logs_tool_failure():
    m = _deps()
    result = hook.run(
        {"tool_name": "Bash", "tool_input": {"command": "x"}, "error": "boom"},
        append=m["append"],
        mkdir=m["mkdir"],
        now=m["now"],
        project_dir=m["project_dir"],
    )
    assert result["entry"]["ts"] == TS
    assert result["entry"]["tool"] == "Bash"
    assert result["entry"]["error"] == "boom"
    path, line = m["state"]["appended"][0]
    assert path == "/proj/.claude/data/tool-failures.jsonl"
    assert json.loads(line)["tool"] == "Bash"


def test_falls_back_to_tool_response():
    m = _deps()
    result = hook.run(
        {"tool_name": "Edit", "tool_response": "denied"},
        append=m["append"],
        mkdir=m["mkdir"],
        now=m["now"],
        project_dir=m["project_dir"],
    )
    assert result["entry"]["error"] == "denied"
