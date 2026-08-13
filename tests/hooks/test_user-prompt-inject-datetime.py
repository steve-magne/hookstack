import importlib.util
from datetime import datetime, timezone
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "inject-datetime.py"
_spec = importlib.util.spec_from_file_location("inject_datetime", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_returns_formatted_date_line():
    out = hook.run(now=datetime(2026, 6, 2, 12, 0, 0, tzinfo=timezone.utc))
    assert "Date et heure courantes :" in out
    assert out.endswith("\n")
    assert "mardi" in out
    assert "juin" in out


def test_works_without_argument():
    assert "Date et heure courantes :" in hook.run()
