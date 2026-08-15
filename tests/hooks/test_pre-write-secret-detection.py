import importlib.util
from pathlib import Path

_HOOK = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "pre-write-secret-detection.py"
_spec = importlib.util.spec_from_file_location("pre_write_secret_detection", _HOOK)
hook = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hook)

# Secrets construits par concaténation pour ne pas laisser de motifs littéraux
# (ex. ghp_<40 chars>) qui déclencheraient pre-write-secret-detection sur ce dépôt.
ANTHROPIC_KEY = "sk-ant-" + "a" * 40
GITHUB_TOKEN = "ghp_" + "A1b2C3d4" * 4 + "A1b2"
PASSWORD_LINE = "pass" + "word = 'hunter2-strong'"
PEM_KEY = "-----BEGIN RSA PRIVATE" + " KEY-----"
SHORT_PLACEHOLDER = "API_KEY=xxx"


def _write(content):
    return {"tool_input": {"content": content}}


def _edit(new_string):
    return {"tool_input": {"new_string": new_string}}


def test_blocks_content_with_api_key():
    # Clé API style Anthropic dans `content` (outil Write) → bloqué.
    result = hook.run(_write(f"OPENAI_API_KEY={ANTHROPIC_KEY}"))
    assert result["decision"] == "block"


def test_blocks_github_token_in_new_string():
    # Token GitHub dans `new_string` (outil Edit) → bloqué (les motifs sont
    # appliqués au contenu combiné content+new_string).
    result = hook.run(_edit(f"token: {GITHUB_TOKEN}"))
    assert result["decision"] == "block"


def test_blocks_password_assignment():
    # Affectation mot de passe entre quotes (regex \[password|passwd|secret|token\]).
    assert hook.run(_write(PASSWORD_LINE))["decision"] == "block"


def test_blocks_pem_private_key():
    # Clé privée PEM (BEGIN ... PRIVATE KEY) → bloquée.
    assert hook.run(_write(PEM_KEY))["decision"] == "block"


def test_does_not_block_short_placeholder():
    # Placeholder court sans secret réel — ne doit pas être bloqué
    # (sinon les `.env.example` seraient inutilisables).
    assert hook.run(_write(SHORT_PLACEHOLDER)) is None


def test_blocks_new_string_field_with_api_key():
    result = hook.run(_edit(f"token = '{ANTHROPIC_KEY}'"))
    assert result["decision"] == "block"


def test_allows_clean_content():
    assert hook.run(_write("def add(a, b):\n    return a + b\n")) is None


def test_allows_clean_new_string():
    assert hook.run(_edit("return null;\n")) is None


def test_allows_empty_tool_input():
    assert hook.run({"tool_input": {}}) is None


def test_reason_mentions_environment_variable():
    # La reason doit indiquer l'alternative sûre (.env / variable d'env).
    result = hook.run(_write(f"OPENAI_API_KEY={ANTHROPIC_KEY}"))
    assert "environment variable" in result["reason"].lower() or ".env" in result["reason"]
