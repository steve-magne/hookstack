import importlib.util
from pathlib import Path

_HOOK = (
    Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "post-compact-save-summary.py"
)
_spec = importlib.util.spec_from_file_location("post_compact_save_summary", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _deps():
    state = {"appended": [], "dirs": []}

    def append(p, content):
        state["appended"].append((p, content))

    def mkdir(p):
        state["dirs"].append(p)

    return {"append": append, "mkdir": mkdir, "project_dir": "/p", "now": lambda: "T", "state": state}


def test_logs_a_summary():
    m = _deps()
    entry = hook.run(
        {"compact_summary": "résumé", "trigger": "manual"},
        append=m["append"],
        mkdir=m["mkdir"],
        project_dir=m["project_dir"],
        now=m["now"],
    )
    assert "résumé" in entry
    assert "T" in entry
    assert m["state"]["dirs"] == ["/p/.claude"]
    assert m["state"]["appended"][0][0] == "/p/.claude/compaction-log.md"


def test_ignores_empty_summary():
    m = _deps()
    assert (
        hook.run(
            {"compact_summary": "  "},
            append=m["append"],
            mkdir=m["mkdir"],
            project_dir=m["project_dir"],
            now=m["now"],
        )
        is None
    )
    assert m["state"]["appended"] == []
