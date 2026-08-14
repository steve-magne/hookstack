import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "detect-secrets.py"
_spec = importlib.util.spec_from_file_location("detect_secrets", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

# Commandes construites par concaténation pour que le fichier source ne contienne
# aucun motif littéral susceptible de déclencher pre-write-secret-detection.
ANTHROPIC_KEY = "sk-ant-" + "a" * 40
GITHUB_TOKEN = "ghp_" + "A1b2C3d4" * 4 + "A1b2"
PASSWORD_LINE = "pass" + "word = 'hunter2-super'"
PRIVATE_KEY = "-----BEGIN RSA PRIVATE" + " KEY-----"


def _cmd(parts):
    return {"tool_input": {"command": "".join(parts)}}


def test_blocks_anthropic_key():
    result = hook.run(_cmd(["export ANTHROPIC_API_KEY=", ANTHROPIC_KEY]))
    assert result["decision"] == "block"


def test_blocks_github_token():
    result = hook.run(_cmd(["echo ", GITHUB_TOKEN]))
    assert result["decision"] == "block"


def test_blocks_private_key():
    result = hook.run(_cmd(['echo "', PRIVATE_KEY, '"']))
    assert result["decision"] == "block"


def test_blocks_password_line():
    result = hook.run(_cmd(['curl -d "', PASSWORD_LINE, '"']))
    assert result["decision"] == "block"


def test_allows_anodyne_command():
    assert hook.run({"tool_input": {"command": "ls -la"}}) is None


def test_allows_missing_tool_input():
    assert hook.run({}) is None
