import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "protect-paths.py"
_spec = importlib.util.spec_from_file_location("protect_paths", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)


def _edit(path):
    return {"tool_input": {"file_path": path}}


def test_blocks_env():
    assert hook.run(_edit("/proj/.env"))["decision"] == "block"


def test_blocks_env_local():
    assert hook.run(_edit("/proj/.env.local"))["decision"] == "block"


def test_blocks_secrets_dir():
    assert hook.run(_edit("/proj/secrets/keys.json"))["decision"] == "block"


def test_blocks_pem():
    assert hook.run(_edit("/home/u/.ssh/id_ed25519"))["decision"] == "block"


def test_allows_source_file():
    assert hook.run(_edit("/proj/src/main.py")) is None


def test_allows_env_example():
    assert hook.run(_edit("/proj/.env.example")) is None
