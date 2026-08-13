import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "stop-failure-rate-limit-alert.py"
_spec = importlib.util.spec_from_file_location("stop_failure_rate_limit_alert", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_returns_terminal_sequence():
    result = hook.run({})
    assert "rate limit" in result["terminalSequence"]
    assert result["terminalSequence"].startswith("\x1b]9;")


def test_returns_serializable():
    import json

    assert json.loads(json.dumps(hook.run({})))["terminalSequence"]
