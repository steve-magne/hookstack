import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "task-created-naming-convention.py"
_spec = importlib.util.spec_from_file_location("task_created_naming_convention", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_accepts_subject_with_ticket():
    assert hook.run({"task_subject": "[PROJ-123] faire X"}) is None


def test_rejects_subject_without_ticket():
    r = hook.run({"task_subject": "faire X"})
    assert r["exitCode"] == 2
    assert "ticket reference" in r["message"]
