import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "user-prompt-name-agent.py"
_spec = importlib.util.spec_from_file_location("user_prompt_name_agent", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _base(**overrides):
    deps = {
        "exists": lambda p: False,
        "read_file": lambda p: "{}",
        "write_file": lambda p, c: None,
        "mkdir": lambda p, **kw: None,
        "home": "/home",
        "pick_name": lambda: "Nexus",
    }
    deps.update(overrides)
    return deps


def test_assigns_name_to_new_session():
    writes = []
    out = hook.run(
        {"session_id": "s1"},
        **_base(write_file=lambda p, c: writes.append((p, c))),
    )
    assert "Nexus" in out
    assert writes


def test_does_not_reassign_existing_name():
    deps = _base(
        exists=lambda p: True,
        read_file=lambda p: '{"session_id": "s1", "agent_name": "Atlas"}',
    )
    assert hook.run({"session_id": "s1"}, **deps) is None


def test_creates_sessions_dir():
    mkdirs = []
    hook.run(
        {"session_id": "s1"},
        **_base(mkdir=lambda p, **kw: mkdirs.append((p, kw))),
    )
    assert mkdirs
    assert "sessions" in mkdirs[0][0]
