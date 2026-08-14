import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "instructions-loaded-audit-log.py"
_spec = importlib.util.spec_from_file_location("instructions_loaded_audit_log", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

TS = "2026-06-02T00:00:00.000Z"


def _base():
    return {
        "append": lambda p, c: None,
        "mkdir": lambda p, **kw: None,
        "now": lambda: TS,
        "project_dir": "/proj",
    }


def test_builds_audit_line():
    line = hook.run(
        {"memory_type": "project", "load_reason": "startup", "file_path": "CLAUDE.md"},
        **_base(),
    )
    assert "project" in line
    assert "CLAUDE.md" in line
