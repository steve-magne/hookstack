import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "inject-conventions.py"
_spec = importlib.util.spec_from_file_location("inject_conventions", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def test_injects_agent_rules_in_priority():
    out = hook.run(
        exists=lambda p: p.endswith("agent-rules.md"),
        read_file=lambda p: "Règle A",
        project_dir="/proj",
    )
    assert "Conventions du projet" in out
    assert "Règle A" in out


def test_falls_back_to_conventions_md():
    out = hook.run(
        exists=lambda p: p.endswith("CONVENTIONS.md"),
        read_file=lambda p: "Règle B",
        project_dir="/proj",
    )
    assert "Règle B" in out


def test_returns_none_without_file():
    assert hook.run(exists=lambda p: False, project_dir="/proj") is None


def test_returns_none_for_empty_file():
    assert hook.run(exists=lambda p: True, read_file=lambda p: "   ", project_dir="/proj") is None
